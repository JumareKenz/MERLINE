import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { resolveFieldScope } from '../common/scoping/field-scope';
import { jsonObject } from '../common/utils/prisma-json';
import { CreateFieldInterviewDto } from './dto/field-interview.dto';

/** Consent timestamps from a device clock are accepted within these bounds. */
const MAX_CLOCK_AHEAD_MS = 5 * 60_000;
const MAX_CONSENT_AGE_MS = 90 * 24 * 3600_000;

const INTERVIEW_INCLUDE = {
  participant: { select: { id: true, displayName: true } },
  consent: {
    select: {
      id: true,
      method: true,
      allowRecording: true,
      allowTranscription: true,
      allowAiAnalysis: true,
      withdrawnAt: true,
      expiresAt: true,
    },
  },
} as const;

/**
 * PHASE 2 — the field worker's own API.
 *
 * A field interviewer is assigned to projects (ProjectTeam membership), not
 * to pre-arranged participants: they meet people on site, record consent
 * with them, and interview them — often with no connection. This service
 * lets the device create the participant, their consent and the interview
 * in one idempotent call, whenever it next reaches the server.
 *
 * The consent invariant is unchanged: the consent record exists before any
 * recording is accepted, and InterviewsService still checks
 * consent.allowRecording on every upload part.
 */
@Injectable()
export class FieldService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Projects the caller can start interviews in: for a field interviewer,
   * the projects they are on the team of; for anyone else, every active
   * project in the organization.
   */
  async myProjects(userId: string, organizationId: string) {
    const scopedTo = await resolveFieldScope(
      this.prisma,
      userId,
      organizationId,
    );
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: 'archived' },
        ...(scopedTo && { teams: { some: { userId: scopedTo } } }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        settings: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { name: 'asc' },
    });

    const mine = await this.prisma.interview.groupBy({
      by: ['projectId'],
      where: { organizationId, interviewerId: userId, deletedAt: null },
      _count: { _all: true },
    });
    const countByProject = new Map(
      mine.map((m) => [m.projectId, m._count._all]),
    );

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      method: (p.settings as { method?: string } | null)?.method ?? null,
      startDate: p.startDate,
      endDate: p.endDate,
      myInterviewCount: countByProject.get(p.id) ?? 0,
    }));
  }

  async createFieldInterview(
    dto: CreateFieldInterviewDto,
    userId: string,
    organizationId: string,
  ) {
    // Idempotency: the device may re-send after a dropped response.
    const existing = await this.prisma.interview.findUnique({
      where: { id: dto.interviewId },
      include: INTERVIEW_INCLUDE,
    });
    if (existing) {
      if (
        existing.organizationId !== organizationId ||
        existing.interviewerId !== userId
      ) {
        throw new ConflictException('This interview id is already in use');
      }
      return existing;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const scopedTo = await resolveFieldScope(
      this.prisma,
      userId,
      organizationId,
    );
    if (scopedTo) {
      const member = await this.prisma.projectTeam.findUnique({
        where: {
          projectId_userId: { projectId: dto.projectId, userId: scopedTo },
        },
      });
      if (!member) {
        throw new ForbiddenException(
          'You are not assigned to this project. Ask your research lead to add you.',
        );
      }
    }

    const now = Date.now();
    const captured = Date.parse(dto.consent.capturedAt);
    if (
      captured > now + MAX_CLOCK_AHEAD_MS ||
      captured < now - MAX_CONSENT_AGE_MS
    ) {
      throw new ConflictException(
        "The consent time from this device is out of range. Check the phone's date and time.",
      );
    }
    const grantedAt = new Date(Math.min(captured, now));

    try {
      return await this.createInTransaction(
        dto,
        userId,
        organizationId,
        grantedAt,
        now,
      );
    } catch (err) {
      // A concurrent retry of the same request won the race: answer with
      // what it created instead of a unique-constraint 500.
      if ((err as { code?: string })?.code === 'P2002') {
        const created = await this.prisma.interview.findFirst({
          where: { id: dto.interviewId, organizationId, interviewerId: userId },
          include: INTERVIEW_INCLUDE,
        });
        if (created) return created;
        throw new ConflictException('These ids are already in use');
      }
      throw err;
    }
  }

  private createInTransaction(
    dto: CreateFieldInterviewDto,
    userId: string,
    organizationId: string,
    grantedAt: Date,
    now: number,
  ) {
    return this.executeTransaction(async (tx) => {
      await tx.participant.create({
        data: {
          id: dto.participantId,
          displayName: dto.participant.displayName.trim(),
          externalRef: dto.participant.externalRef?.trim() || undefined,
          projectId: dto.projectId,
          organizationId,
          createdById: userId,
          metadata: jsonObject({ enrolledInField: true }),
        },
      });
      await tx.consent.create({
        data: {
          id: dto.consentId,
          participantId: dto.participantId,
          version: dto.consent.version.trim(),
          method: dto.consent.method,
          allowRecording: dto.consent.allowRecording,
          allowTranscription: dto.consent.allowTranscription,
          allowAiAnalysis: dto.consent.allowAiAnalysis,
          allowQuotation: dto.consent.allowQuotation,
          allowPublication: dto.consent.allowPublication,
          grantedAt,
          // The device time is what the participant agreed at; receivedAt
          // records when the server learned of it.
          metadata: jsonObject({
            capturedOnDevice: true,
            deviceCapturedAt: dto.consent.capturedAt,
            receivedAt: new Date(now).toISOString(),
          }),
          organizationId,
          actorId: userId,
        },
      });
      return tx.interview.create({
        data: {
          id: dto.interviewId,
          participantId: dto.participantId,
          consentId: dto.consentId,
          projectId: dto.projectId,
          interviewerId: userId,
          status: 'IN_PROGRESS',
          startedAt: grantedAt,
          location: dto.location?.trim() || undefined,
          organizationId,
        },
        include: INTERVIEW_INCLUDE,
      });
    });
  }
}
