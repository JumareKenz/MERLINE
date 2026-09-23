import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ImportGuideDto, SaveGuideDto } from './dto/guide.dto';
import { parseGuideFile } from './guide-import';

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
  constructor(private readonly prisma: PrismaService) {}

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

    await this.prisma.$transaction([
      // One approved guide per slot (project or organization-wide, and
      // interview type), so there is never doubt which one field teams use:
      // the family's earlier version and any other guide for the same slot.
      this.prisma.questionSet.updateMany({
        where: {
          organizationId,
          status: 'APPROVED',
          id: { not: id },
          OR: [
            { familyId: set.familyId },
            { interviewType: set.interviewType, projectId: set.projectId },
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
      if (
        (q.type === 'SINGLE' || q.type === 'MULTIPLE') &&
        (q.options?.filter((o) => o?.en?.trim()).length ?? 0) < 2
      ) {
        throw new BadRequestException(
          `Question ${n} needs at least two options`,
        );
      }
      if (q.type === 'SCALE') {
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        if (min >= max)
          throw new BadRequestException(
            `Question ${n}: the scale minimum must be below the maximum`,
          );
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
        type: q.type,
        options:
          q.type === 'SINGLE' || q.type === 'MULTIPLE'
            ? (q.options ?? []).map(clean).filter((o) => o.en)
            : [],
        scaleMin: q.type === 'SCALE' ? (q.scaleMin ?? 1) : null,
        scaleMax: q.type === 'SCALE' ? (q.scaleMax ?? 5) : null,
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
