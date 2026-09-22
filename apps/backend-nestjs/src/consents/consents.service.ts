import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Consent } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { resolveFieldScope } from '../common/scoping/field-scope';
import { CreateConsentDto } from './dto/create-consent.dto';

type ConsentScope =
  | 'allowRecording'
  | 'allowTranscription'
  | 'allowAiAnalysis'
  | 'allowQuotation'
  | 'allowPublication';

const SCOPE_LABEL: Record<ConsentScope, string> = {
  allowRecording: 'recording',
  allowTranscription: 'transcription',
  allowAiAnalysis: 'AI analysis',
  allowQuotation: 'quotation',
  allowPublication: 'publication',
};

@Injectable()
export class ConsentsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * `viewerId` narrows a field-interviewer-only caller to consent records of
   * participants they can see (see common/scoping). Internal callers — the
   * recording and transcription gates — omit it and check by tenant only.
   */
  async findById(
    id: string,
    organizationId: string,
    viewerId?: string,
  ): Promise<Consent> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        id,
        organizationId,
        ...(await this.participantScopeWhere(viewerId, organizationId)),
      },
    });

    if (!consent) {
      throw new NotFoundException('Consent record not found');
    }

    return consent;
  }

  async findForParticipant(
    participantId: string,
    organizationId: string,
    viewerId?: string,
  ) {
    return this.prisma.consent.findMany({
      where: {
        participantId,
        organizationId,
        ...(await this.participantScopeWhere(viewerId, organizationId)),
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  private async participantScopeWhere(
    viewerId: string | undefined,
    organizationId: string,
  ) {
    const scopedTo = await resolveFieldScope(
      this.prisma,
      viewerId,
      organizationId,
    );
    if (!scopedTo) return {} as { participant?: Record<string, unknown> };
    return {
      participant: {
        OR: [
          { createdById: scopedTo },
          {
            interviews: { some: { interviewerId: scopedTo, deletedAt: null } },
          },
        ],
      },
    };
  }

  /**
   * Consent creation is transactional: the participant existence check and
   * the insert must not race a concurrent delete/tenant change of the
   * participant between the two.
   */
  async create(dto: CreateConsentDto, actorId: string, organizationId: string) {
    const scope = await this.participantScopeWhere(actorId, organizationId);
    return this.executeTransaction(async (tx) => {
      const participant = await tx.participant.findFirst({
        where: {
          id: dto.participantId,
          organizationId,
          deletedAt: null,
          ...(scope.participant ?? {}),
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      return tx.consent.create({
        data: {
          participantId: dto.participantId,
          version: dto.version,
          method: dto.method,
          allowRecording: dto.allowRecording ?? false,
          allowTranscription: dto.allowTranscription ?? false,
          allowAiAnalysis: dto.allowAiAnalysis ?? false,
          allowQuotation: dto.allowQuotation ?? false,
          allowPublication: dto.allowPublication ?? false,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          metadata: (dto.metadata ?? {}) as any,
          organizationId,
          actorId,
        },
      });
    });
  }

  async withdraw(id: string, actorId: string, organizationId: string) {
    const consent = await this.findById(id, organizationId);

    if (consent.withdrawnAt) {
      // Already withdrawn: idempotent, not an error.
      return consent;
    }

    return this.prisma.consent.update({
      where: { id },
      data: { withdrawnAt: new Date(), withdrawnById: actorId },
    });
  }

  /**
   * Shared enforcement point for every downstream action gated on consent:
   * recording, transcription, AI analysis, quotation and publication.
   * Throws with a message identifying exactly which check failed, since
   * "consent denied" alone is not actionable for a caller.
   */
  assertScope(consent: Consent, scope: ConsentScope): void {
    if (consent.withdrawnAt) {
      throw new ForbiddenException(
        `Consent was withdrawn on ${consent.withdrawnAt.toISOString()}; ${SCOPE_LABEL[scope]} is no longer permitted`,
      );
    }

    if (consent.expiresAt && consent.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException(
        `Consent expired on ${consent.expiresAt.toISOString()}; ${SCOPE_LABEL[scope]} is no longer permitted`,
      );
    }

    if (!consent[scope]) {
      throw new ForbiddenException(
        `Consent does not permit ${SCOPE_LABEL[scope]} for this participant`,
      );
    }
  }
}
