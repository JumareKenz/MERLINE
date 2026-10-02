import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Logger, Optional } from '@nestjs/common';
import { TranscriptionProviderService } from '../transcripts/transcription-provider.service';
import {
  GUIDE_TRANSLATION_SYSTEM,
  parseTranslation,
  questionsNeedingHausa,
} from './guide-translation';
import { PrismaService } from '../database/prisma.service';
import { ImportGuideDto, SaveGuideDto } from './dto/guide.dto';
import { OPEN_ONLY_MESSAGE, parseGuideFile } from './guide-import';

const QUESTIONS = { orderBy: { order: 'asc' } } as const;

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Interview guides (question sets), versioned by family. A DRAFT is edited
 * in place; saving an APPROVED or ARCHIVED version creates the next
 * version as a DRAFT, so interviews that used the earlier version keep it
 * exactly. Approving a version archives whatever was approved for the same
 * slot (the family's earlier version, or another guide for the same
 * project and interview type), so field teams only ever have one.
 */
@Injectable()
export class GuidesService {
  private readonly logger = new Logger(GuidesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly provider?: TranscriptionProviderService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async list(
    organizationId: string,
    filters: { projectId?: string; interviewType?: string },
  ) {
    return this.prisma.questionSet.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.interviewType && { interviewType: filters.interviewType }),
        ...(filters.projectId && {
          OR: [{ projectId: filters.projectId }, { projectId: null }],
        }),
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { questions: true, interviews: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async findById(id: string, organizationId: string) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        questions: QUESTIONS,
        project: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { interviews: true } },
      },
    });
    if (!set) throw new NotFoundException('Guide not found');
    const versions = await this.prisma.questionSet.findMany({
      where: { familyId: set.familyId, organizationId, deletedAt: null },
      select: {
        id: true,
        version: true,
        status: true,
        createdAt: true,
        approvedAt: true,
      },
      orderBy: { version: 'desc' },
    });
    return { ...set, versions };
  }

  async create(dto: SaveGuideDto, userId: string, organizationId: string) {
    const created = await this.createDraft(dto, userId, organizationId);
    return this.afterWrite(created.id, organizationId, created);
  }

  private async createDraft(
    dto: SaveGuideDto,
    userId: string,
    organizationId: string,
  ) {
    this.validate(dto);
    await this.assertProject(dto.projectId, organizationId);
    return this.prisma.$transaction(async (tx) => {
      const set = await tx.questionSet.create({
        data: {
          familyId: '',
          version: 1,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          interviewType: dto.interviewType,
          languages: dto.languages,
          projectId: dto.projectId ?? null,
          linkOnly: !!dto.linkOnly,
          organizationId,
          createdById: userId,
        },
      });
      await tx.questionSet.update({
        where: { id: set.id },
        data: { familyId: set.id },
      });
      await this.writeQuestions(tx, set.id, dto.questions);
      return this.findByIdTx(tx, set.id);
    });
  }

  /**
   * Saves changes. A DRAFT is updated in place; any other status starts
   * the next version (unless a newer draft already exists).
   */
  async save(
    id: string,
    dto: SaveGuideDto,
    userId: string,
    organizationId: string,
  ) {
    const saved = await this.saveDraft(id, dto, userId, organizationId);
    return this.afterWrite(saved.id, organizationId, saved);
  }

  private async saveDraft(
    id: string,
    dto: SaveGuideDto,
    userId: string,
    organizationId: string,
  ) {
    this.validate(dto);
    await this.assertProject(dto.projectId, organizationId);
    const current = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Guide not found');

    return this.prisma.$transaction(async (tx) => {
      const data = {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        interviewType: dto.interviewType,
        languages: dto.languages,
        projectId: dto.projectId ?? null,
      };
      if (current.status === 'DRAFT') {
        await tx.questionSet.update({ where: { id }, data });
        await tx.guideQuestion.deleteMany({ where: { questionSetId: id } });
        await this.writeQuestions(tx, id, dto.questions);
        return this.findByIdTx(tx, id);
      }

      const draft = await tx.questionSet.findFirst({
        where: { familyId: current.familyId, status: 'DRAFT', deletedAt: null },
      });
      if (draft) {
        throw new ConflictException(
          `Version ${draft.version} is already a draft; edit that instead`,
        );
      }
      const latest = await tx.questionSet.findFirst({
        where: { familyId: current.familyId },
        orderBy: { version: 'desc' },
      });
      const next = await tx.questionSet.create({
        data: {
          ...data,
          familyId: current.familyId,
          version: (latest?.version ?? current.version) + 1,
          linkOnly: current.linkOnly,
          organizationId,
          createdById: userId,
        },
      });
      await this.writeQuestions(tx, next.id, dto.questions);
      return this.findByIdTx(tx, next.id);
    });
  }

  async approve(id: string, userId: string, organizationId: string) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { _count: { select: { questions: true } } },
    });
    if (!set) throw new NotFoundException('Guide not found');
    if (set.status !== 'DRAFT')
      throw new BadRequestException(
        `Only a draft can be approved (this is ${set.status})`,
      );
    if (set._count.questions === 0)
      throw new BadRequestException(
        'Add at least one question before approving',
      );
    if (set.translationStatus === 'MACHINE_DRAFT')
      throw new BadRequestException(
        'The Hausa translation was written by a machine and has not been reviewed. Read it, correct it if needed, and mark it as reviewed before approving.',
      );

    await this.prisma.$transaction([
      // One approved guide per slot (project or organization-wide, and
      // interview type), so there is never doubt which one field teams use:
      // the family's earlier version and any other guide for the same slot.
      // Link-only guides never reach field teams, so they neither take the
      // slot nor are displaced from it; only their own earlier version is.
      this.prisma.questionSet.updateMany({
        where: {
          organizationId,
          status: 'APPROVED',
          id: { not: id },
          OR: [
            { familyId: set.familyId },
            ...(set.linkOnly
              ? []
              : [
                  {
                    interviewType: set.interviewType,
                    projectId: set.projectId,
                    linkOnly: false,
                  },
                ]),
          ],
        },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.questionSet.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date(),
        },
      }),
    ]);
    return this.findById(id, organizationId);
  }

  /**
   * Drafts the missing Hausa for a DRAFT guide with a model. The result is
   * flagged MACHINE_DRAFT: approval stays blocked until an administrator
   * marks it reviewed. Existing Hausa text is never replaced unless asked.
   */
  async translateToHausa(
    id: string,
    organizationId: string,
    opts: { overwrite?: boolean } = {},
  ) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!set) throw new NotFoundException('Guide not found');
    if (set.status !== 'DRAFT')
      throw new BadRequestException(
        'Only a draft can be translated. Edit the guide to start a new draft version.',
      );
    if (!this.provider)
      throw new BadRequestException('Translation is not available');

    const asked = questionsNeedingHausa(
      set.questions.map((q) => ({
        id: q.id,
        text: q.text as Record<string, string>,
        probes: q.probes as Record<string, string>,
      })),
      opts.overwrite,
    );
    if (asked.length === 0) return this.findById(id, organizationId);

    let reply: string;
    try {
      reply = await this.provider.chat({
        system: GUIDE_TRANSLATION_SYSTEM,
        user: JSON.stringify({ items: asked }),
        model: this.config?.get<string>('reports.model', 'openai/gpt-oss-120b'),
        maxTokens: 8000,
        json: true,
      });
    } catch (err) {
      throw new BadRequestException(
        `The translation service did not answer (${err instanceof Error ? err.message : 'error'}). Try again in a moment, or write the Hausa by hand.`,
      );
    }
    let translated: ReturnType<typeof parseTranslation>;
    try {
      translated = parseTranslation(reply, asked);
    } catch {
      throw new BadRequestException(
        'The translation came back in an unusable form. Try again.',
      );
    }
    if (translated.size === 0)
      throw new BadRequestException('No translation was returned. Try again.');

    await this.prisma.$transaction([
      ...set.questions.flatMap((q) => {
        const t = translated.get(q.id);
        if (!t) return [];
        return [
          this.prisma.guideQuestion.update({
            where: { id: q.id },
            data: {
              text: { ...(q.text as object), ha: t.text },
              probes: {
                ...(q.probes as object),
                ...(t.probes ? { ha: t.probes } : {}),
              },
            },
          }),
        ];
      }),
      this.prisma.questionSet.update({
        where: { id },
        data: {
          languages: set.languages.includes('ha')
            ? set.languages
            : [...set.languages, 'ha'],
          translationStatus: 'MACHINE_DRAFT',
          translationReviewedAt: null,
          translationReviewedById: null,
        },
      }),
    ]);
    return this.findById(id, organizationId);
  }

  /** An administrator confirms they read the Hausa; this unblocks approval. */
  async markTranslationReviewed(
    id: string,
    userId: string,
    organizationId: string,
  ) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!set) throw new NotFoundException('Guide not found');
    if (set.status !== 'DRAFT')
      throw new BadRequestException('Only a draft can be reviewed');
    if (set.translationStatus !== 'MACHINE_DRAFT')
      throw new BadRequestException(
        'There is no machine translation to review',
      );
    await this.prisma.questionSet.update({
      where: { id },
      data: {
        translationStatus: 'REVIEWED',
        translationReviewedAt: new Date(),
        translationReviewedById: userId,
      },
    });
    return this.findById(id, organizationId);
  }

  /**
   * After every create/save: a draft that lists Hausa but has English-only
   * questions gets a machine draft of the Hausa. A failure never blocks
   * saving; the editor offers a retry.
   */
  private async afterWrite<T extends { status: string; languages: string[] }>(
    id: string,
    organizationId: string,
    written: T,
  ): Promise<T> {
    if (written.status !== 'DRAFT' || !written.languages.includes('ha'))
      return written;
    try {
      await this.translateToHausa(id, organizationId);
      return (await this.findById(id, organizationId)) as unknown as T;
    } catch (err) {
      this.logger.warn(
        `Auto-translation of guide ${id} skipped: ${err instanceof Error ? err.message : err}`,
      );
      return written;
    }
  }

  async archive(id: string, organizationId: string) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!set) throw new NotFoundException('Guide not found');
    await this.prisma.questionSet.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return this.findById(id, organizationId);
  }

  /** Moves every version of the guide to the Trash; interviews keep theirs. */
  async remove(id: string, organizationId: string) {
    const set = await this.prisma.questionSet.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!set) throw new NotFoundException('Guide not found');
    await this.prisma.questionSet.updateMany({
      where: { familyId: set.familyId, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /** Creates a DRAFT from an uploaded CSV/XLSX, or reports every problem found. */
  async import(
    file: Express.Multer.File,
    dto: ImportGuideDto,
    userId: string,
    organizationId: string,
  ) {
    const parsed = await parseGuideFile(file.buffer, file.originalname);
    if (parsed.errors.length > 0) {
      throw new BadRequestException({
        message: `The file has ${parsed.errors.length} problem${parsed.errors.length === 1 ? '' : 's'}; nothing was imported`,
        errors: parsed.errors,
      });
    }
    return this.create(
      {
        title: dto.title,
        description: dto.description,
        interviewType: dto.interviewType,
        projectId: dto.projectId,
        linkOnly: dto.linkOnly,
        languages: parsed.languages,
        questions: parsed.questions,
      },
      userId,
      organizationId,
    );
  }

  /**
   * The approved guide a new interview in this project should use: one
   * made for the project first, else an organization-wide one for the
   * project's interview type; the most recently approved wins.
   */
  static async approvedFor(
    db: Db,
    organizationId: string,
    projectId: string | null | undefined,
    interviewType: string | null | undefined,
  ) {
    if (!interviewType) return null;
    return db.questionSet.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        status: 'APPROVED',
        linkOnly: false,
        interviewType,
        OR: [...(projectId ? [{ projectId }] : []), { projectId: null }],
      },
      orderBy: [
        { projectId: { sort: 'asc', nulls: 'last' } },
        { approvedAt: 'desc' },
      ],
      include: { questions: QUESTIONS },
    });
  }

  /* ---------------------------------------------------------- */

  private validate(dto: SaveGuideDto) {
    const langs = new Set(dto.languages);
    if (!langs.has('en'))
      throw new BadRequestException(
        'English (en) must be one of the languages',
      );
    dto.questions.forEach((q, i) => {
      const n = i + 1;
      if (!q.text?.en?.trim())
        throw new BadRequestException(`Question ${n} needs English text`);
      // The DTO refuses these too; this is the rule for any caller that
      // reaches the service directly.
      if (
        (q.type && q.type !== 'OPEN') ||
        (q.options?.length ?? 0) > 0 ||
        q.scaleMin != null ||
        q.scaleMax != null
      ) {
        throw new BadRequestException(`Question ${n}: ${OPEN_ONLY_MESSAGE}`);
      }
    });
  }

  private async assertProject(
    projectId: string | null | undefined,
    organizationId: string,
  ) {
    if (!projectId) return;
    const found = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Project not found');
  }

  private async writeQuestions(
    tx: Db,
    questionSetId: string,
    questions: SaveGuideDto['questions'],
  ) {
    if (questions.length === 0) return;
    const clean = (o?: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(o ?? {})
          .filter(([, v]) => typeof v === 'string' && v.trim())
          .map(([k, v]) => [k, v.trim()]),
      );
    await tx.guideQuestion.createMany({
      data: questions.map((q, i) => ({
        questionSetId,
        order: i + 1,
        section: q.section?.trim() || null,
        text: clean(q.text),
        type: 'OPEN',
        options: [],
        scaleMin: null,
        scaleMax: null,
        probes: clean(q.probes),
        required: !!q.required,
      })),
    });
  }

  private findByIdTx(tx: Db, id: string) {
    return tx.questionSet.findUniqueOrThrow({
      where: { id },
      include: { questions: QUESTIONS },
    });
  }
}
