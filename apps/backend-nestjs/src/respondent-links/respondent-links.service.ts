import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  CreateRespondentLinkDto,
  UpdateRespondentLinkDto,
} from './dto/respondent-link.dto';
import { DEFAULT_CONSENT_TEXT } from './link-defaults';
import { linkState } from './link-state';

const LINK_INCLUDE = {
  project: { select: { id: true, name: true } },
  questionSet: {
    select: {
      id: true,
      title: true,
      version: true,
      status: true,
      languages: true,
      _count: { select: { questions: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** The secret part of a link's URL: 144 random bits, url-safe. */
export function newLinkToken(): string {
  return randomBytes(18).toString('base64url');
}

/**
 * Self-interview links, as research staff manage them. Every query is
 * scoped to the caller's organization; a link from another organization
 * is simply "not found".
 */
@Injectable()
export class RespondentLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, filters: { projectId?: string }) {
    const links = await this.prisma.respondentLink.findMany({
      where: {
        organizationId,
        deletedAt: null,
        project: { deletedAt: null },
        ...(filters.projectId && { projectId: filters.projectId }),
      },
      include: LINK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    const counts = await this.responseCounts(links.map((l) => l.id));
    return links.map((l) => this.present(l, counts.get(l.id)));
  }

  async findById(id: string, organizationId: string) {
    const link = await this.prisma.respondentLink.findFirst({
      where: { id, organizationId, deletedAt: null, project: { deletedAt: null } },
      include: LINK_INCLUDE,
    });
    if (!link) throw new NotFoundException('Link not found');
    const counts = await this.responseCounts([link.id]);
    return this.present(link, counts.get(link.id));
  }

  /** Who has responded through the link, newest first. */
  async responses(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    const interviews = await this.prisma.interview.findMany({
      where: { respondentLinkId: id, organizationId, deletedAt: null },
      include: {
        participant: { select: { id: true, displayName: true, metadata: true } },
        respondentSession: { select: { finishedAt: true } },
        _count: {
          select: { recordings: { where: { deletedAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return interviews.map((i) => {
      const meta = (i.participant.metadata ?? {}) as {
        role?: string;
        organisation?: string;
      };
      return {
        interviewId: i.id,
        status: i.status,
        startedAt: i.startedAt,
        endedAt: i.endedAt,
        finishedAt: i.respondentSession?.finishedAt ?? null,
        recordings: i._count.recordings,
        participant: {
          id: i.participant.id,
          displayName: i.participant.displayName,
          role: meta.role ?? null,
          organisation: meta.organisation ?? null,
        },
      };
    });
  }

  async create(
    dto: CreateRespondentLinkDto,
    userId: string,
    organizationId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const guide = await this.assertGuide(
      dto.questionSetId,
      dto.projectId,
      organizationId,
    );
    this.assertFutureExpiry(dto.expiresAt);

    const link = await this.prisma.respondentLink.create({
      data: {
        token: newLinkToken(),
        title: dto.title.trim(),
        intro: dto.intro?.trim() || null,
        consentText: dto.consentText?.trim() || DEFAULT_CONSENT_TEXT,
        interviewType: dto.interviewType ?? guide.interviewType ?? 'KII',
        language: dto.language ?? 'en',
        respondentName: dto.respondentName?.trim() || null,
        maxResponses: dto.maxResponses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        projectId: dto.projectId,
        questionSetId: guide.id,
        organizationId,
        createdById: userId,
      },
      include: LINK_INCLUDE,
    });
    return this.present(link, undefined);
  }

  async update(
    id: string,
    dto: UpdateRespondentLinkDto,
    organizationId: string,
  ) {
    const link = await this.findById(id, organizationId);
    if (dto.questionSetId && dto.questionSetId !== link.questionSet.id) {
      await this.assertGuide(dto.questionSetId, link.project.id, organizationId);
    }
    if (dto.expiresAt) this.assertFutureExpiry(dto.expiresAt);

    await this.prisma.respondentLink.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.intro !== undefined && { intro: dto.intro?.trim() || null }),
        ...(dto.consentText !== undefined && {
          consentText: dto.consentText.trim(),
        }),
        ...(dto.questionSetId && { questionSetId: dto.questionSetId }),
        ...(dto.language && { language: dto.language }),
        ...(dto.respondentName !== undefined && {
          respondentName: dto.respondentName?.trim() || null,
        }),
        ...(dto.maxResponses !== undefined && {
          maxResponses: dto.maxResponses,
        }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
    });
    return this.findById(id, organizationId);
  }

  /** Stops new respondents. Anyone mid-way can still finish uploading. */
  async close(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.respondentLink.update({
      where: { id },
      data: { closedAt: new Date() },
    });
    return this.findById(id, organizationId);
  }

  async reopen(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.respondentLink.update({
      where: { id },
      data: { closedAt: null },
    });
    return this.findById(id, organizationId);
  }

  /**
   * Swaps the URL's secret: the old link stops working at once (use when a
   * link was shared too widely). Responses already given are kept.
   */
  async regenerateToken(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.respondentLink.update({
      where: { id },
      data: { token: newLinkToken() },
    });
    return this.findById(id, organizationId);
  }

  /** Moves the link to the Trash; its responses stay as interviews. */
  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.respondentLink.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  /* ---------------------------------------------------------- */

  /**
   * A link pins one guide version. It must have been approved (so it can
   * never change under a respondent: editing an approved guide makes a new
   * version) and belong to this project or be organization-wide.
   */
  private async assertGuide(
    questionSetId: string,
    projectId: string,
    organizationId: string,
  ) {
    const guide = await this.prisma.questionSet.findFirst({
      where: { id: questionSetId, organizationId, deletedAt: null },
      include: { _count: { select: { questions: true } } },
    });
    if (!guide) throw new NotFoundException('Guide not found');
    if (!guide.approvedAt)
      throw new BadRequestException(
        'Approve the guide before sharing it: an approved guide cannot change under a respondent',
      );
    if (guide.projectId && guide.projectId !== projectId)
      throw new BadRequestException('This guide belongs to another project');
    if (guide._count.questions === 0)
      throw new BadRequestException('This guide has no questions');
    return guide;
  }

  private assertFutureExpiry(expiresAt?: string | null) {
    if (expiresAt && Date.parse(expiresAt) <= Date.now())
      throw new BadRequestException('The expiry date must be in the future');
  }

  private async responseCounts(linkIds: string[]) {
    const map = new Map<string, { started: number; completed: number }>();
    if (linkIds.length === 0) return map;
    const rows = await this.prisma.respondentSession.groupBy({
      by: ['linkId'],
      where: { linkId: { in: linkIds }, interview: { deletedAt: null } },
      _count: { _all: true },
    });
    const done = await this.prisma.respondentSession.groupBy({
      by: ['linkId'],
      where: {
        linkId: { in: linkIds },
        finishedAt: { not: null },
        interview: { deletedAt: null },
      },
      _count: { _all: true },
    });
    for (const r of rows)
      map.set(r.linkId, { started: r._count._all, completed: 0 });
    for (const r of done) {
      const entry = map.get(r.linkId) ?? { started: 0, completed: 0 };
      entry.completed = r._count._all;
      map.set(r.linkId, entry);
    }
    return map;
  }

  private present<
    T extends {
      closedAt: Date | null;
      expiresAt: Date | null;
      maxResponses: number | null;
    },
  >(link: T, counts: { started: number; completed: number } | undefined) {
    const c = counts ?? { started: 0, completed: 0 };
    return {
      ...link,
      state: linkState(link, c.completed),
      responses: c,
    };
  }
}
