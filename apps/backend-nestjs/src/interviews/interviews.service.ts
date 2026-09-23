import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import {
  FIELD_ROLE_SLUG,
  resolveFieldScope,
} from '../common/scoping/field-scope';
import { ConsentsService } from '../consents/consents.service';
import { MediaService } from '../media/media.service';
import { queueTranscriptionForRecording } from '../transcripts/transcription-queue';
import { CreateInterviewDto } from './dto/create-interview.dto';

/** Status transitions a caller may request explicitly via PATCH .../status. */
const ALLOWED_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Summary relations returned with every interview read. */
const INTERVIEW_SUMMARY_INCLUDE = {
  participant: { select: { id: true, displayName: true } },
  interviewer: { select: { id: true, firstName: true, lastName: true } },
  // Scope flags only: lets the field app show (and cache for offline use)
  // whether recording is permitted. The server re-checks on every upload.
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
  _count: {
    select: {
      recordings: { where: { deletedAt: null } },
      transcripts: true,
    },
  },
} as const;

/**
 * `viewerId` on read/write methods is the calling user. Controllers always
 * pass it; a caller whose only role is field-interviewer is narrowed to
 * interviews assigned to them (see common/scoping/field-scope.ts). Internal
 * callers that omit it get tenant scope only.
 */
@Injectable()
export class InterviewsService extends BaseService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    prisma: PrismaService,
    private readonly consentsService: ConsentsService,
    private readonly mediaService: MediaService,
  ) {
    super(prisma);
  }

  async findAll(
    organizationId: string,
    filters: {
      participantId?: string;
      projectId?: string;
      status?: InterviewStatus;
      interviewerId?: string;
    },
    viewerId?: string,
  ) {
    const scopedTo = await resolveFieldScope(
      this.prisma,
      viewerId,
      organizationId,
    );
    return this.prisma.interview.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.participantId && { participantId: filters.participantId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.interviewerId && { interviewerId: filters.interviewerId }),
        // Applied last so a field worker cannot widen it with a filter.
        ...(scopedTo && { interviewerId: scopedTo }),
      },
      include: INTERVIEW_SUMMARY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string, viewerId?: string) {
    const scopedTo = await resolveFieldScope(
      this.prisma,
      viewerId,
      organizationId,
    );
    const interview = await this.prisma.interview.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        ...(scopedTo && { interviewerId: scopedTo }),
      },
      include: INTERVIEW_SUMMARY_INCLUDE,
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  /**
   * Creation is transactional: the participant/consent ownership checks and
   * the insert must be atomic, since this is the point where the "no
   * interview without consent" invariant is enforced.
   */
  async create(
    dto: CreateInterviewDto,
    userId: string,
    organizationId: string,
  ) {
    // A field interviewer conducts their own interviews; assigning work to
    // someone else is a research-lead action.
    const scopedTo = await resolveFieldScope(
      this.prisma,
      userId,
      organizationId,
    );
    if (scopedTo && dto.interviewerId && dto.interviewerId !== scopedTo) {
      throw new ForbiddenException(
        'Field interviewers can only create interviews assigned to themselves',
      );
    }

    return this.executeTransaction(async (tx) => {
      // Ids in the request body are untrusted: each must resolve inside the
      // caller's tenant, or an interview could reference another
      // organization's user or project.
      if (dto.interviewerId) {
        const interviewer = await tx.user.findFirst({
          where: {
            id: dto.interviewerId,
            organizationId,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true },
        });
        if (!interviewer) {
          throw new NotFoundException('Interviewer not found');
        }
      }
      if (dto.projectId) {
        const project = await tx.project.findFirst({
          where: { id: dto.projectId, organizationId, deletedAt: null },
          select: { id: true },
        });
        if (!project) {
          throw new NotFoundException('Project not found');
        }
      }

      const participant = await tx.participant.findFirst({
        where: { id: dto.participantId, organizationId, deletedAt: null },
      });
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const consent = await tx.consent.findFirst({
        where: { id: dto.consentId, organizationId },
      });
      if (!consent) {
        throw new NotFoundException('Consent record not found');
      }
      if (consent.participantId !== dto.participantId) {
        // Prevents attaching another participant's consent to this interview.
        throw new BadRequestException(
          'Consent record does not belong to the specified participant',
        );
      }

      return tx.interview.create({
        data: {
          participantId: dto.participantId,
          consentId: dto.consentId,
          projectId: dto.projectId,
          interviewerId: dto.interviewerId ?? userId,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          location: dto.location,
          notes: dto.notes,
          language: dto.language,
          organizationId,
        },
      });
    });
  }

  async updateStatus(
    id: string,
    status: InterviewStatus,
    organizationId: string,
    viewerId?: string,
  ) {
    const interview = await this.findById(id, organizationId, viewerId);

    const allowed = ALLOWED_TRANSITIONS[interview.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition interview from ${interview.status} to ${status}`,
      );
    }

    return this.prisma.interview.update({
      where: { id },
      data: {
        status,
        ...(status === 'IN_PROGRESS' &&
          !interview.startedAt && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { endedAt: new Date() }),
      },
    });
  }

  async listAssignableInterviewers(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roles: {
          where: { role: { organizationId } },
          select: { role: { select: { slug: true } } },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      isFieldInterviewer: u.roles.some((r) => r.role.slug === FIELD_ROLE_SLUG),
    }));
  }

  /** Single-request upload (file picker). Gated by `assertRecordingPermitted`. */
  async uploadRecording(
    id: string,
    file: Express.Multer.File,
    metadata: Record<string, unknown> | undefined,
    userId: string,
    organizationId: string,
  ) {
    await this.assertRecordingPermitted(id, userId, organizationId);

    const media = await this.mediaService.upload(
      file,
      { metadata, interviewId: id },
      userId,
      organizationId,
    );
    await this.queueTranscription(media.id, id, userId, organizationId);
    return media;
  }

  async listRecordings(id: string, organizationId: string, viewerId?: string) {
    await this.findById(id, organizationId, viewerId);

    return this.prisma.media.findMany({
      where: { interviewId: id, organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRecordingDownloadUrl(
    id: string,
    mediaId: string,
    organizationId: string,
    viewerId?: string,
  ) {
    await this.findById(id, organizationId, viewerId);

    const { url, expiresIn, media } = await this.mediaService.getDownloadUrl(
      mediaId,
      organizationId,
      { includeRecordings: true },
    );

    if (media.interviewId !== id) {
      throw new ForbiddenException(
        'Recording does not belong to this interview',
      );
    }

    return { url, expiresIn };
  }

  /**
   * PHASE 2 — resumable recording upload (field app outbox).
   *
   * The consent gate runs on every step, before any bytes are stored: the
   * status probe (so a device learns immediately that it must not send),
   * each part, and completion. A consent withdrawn mid-upload therefore
   * stops the upload at the next part instead of after 90 minutes of audio
   * have already landed in storage.
   */
  async getRecordingUploadStatus(
    id: string,
    uploadId: string,
    userId: string,
    organizationId: string,
  ) {
    const completed = await this.mediaService.findCompletedRecording(
      uploadId,
      id,
      organizationId,
    );
    if (completed) {
      // Already done — even if consent has since been withdrawn, the device
      // only needs to learn it can stop retrying.
      await this.findById(id, organizationId, userId);
      return { uploadId, receivedParts: [], completed };
    }

    await this.assertRecordingPermitted(id, userId, organizationId);
    const parts = await this.mediaService.listRecordingParts(uploadId, userId);
    return {
      uploadId,
      receivedParts: parts.map((p) => p.index),
      completed: null,
    };
  }

  async putRecordingPart(
    id: string,
    uploadId: string,
    index: number,
    body: Buffer,
    userId: string,
    organizationId: string,
  ) {
    await this.assertRecordingPermitted(id, userId, organizationId);
    return this.mediaService.putRecordingPart(
      uploadId,
      index,
      body,
      userId,
      organizationId,
    );
  }

  async completeRecordingUpload(
    id: string,
    uploadId: string,
    options: {
      totalParts: number;
      mimeType: string;
      originalName: string;
      checksum?: string;
      durationMs?: number;
      recordedAt?: string;
    },
    userId: string,
    organizationId: string,
  ) {
    const completed = await this.mediaService.findCompletedRecording(
      uploadId,
      id,
      organizationId,
    );
    if (completed) {
      await this.findById(id, organizationId, userId);
      return completed;
    }

    await this.assertRecordingPermitted(id, userId, organizationId);
    const media = await this.mediaService.completeRecordingUpload(
      uploadId,
      userId,
      organizationId,
      {
        interviewId: id,
        totalParts: options.totalParts,
        mimeType: options.mimeType,
        originalName: options.originalName,
        checksum: options.checksum,
        metadata: {
          source: 'field-recorder',
          ...(options.durationMs !== undefined && {
            durationMs: options.durationMs,
          }),
          ...(options.recordedAt && { recordedAt: options.recordedAt }),
        },
      },
    );
    await this.queueTranscription(media.id, id, userId, organizationId);
    return media;
  }

  /**
   * Starts automatic transcription for a newly stored recording when the
   * participant's consent allows it. A failure here must not fail the
   * upload — the audio is safely stored, and an administrator can start
   * transcription from the interview page.
   */
  private async queueTranscription(
    mediaId: string,
    interviewId: string,
    userId: string,
    organizationId: string,
  ) {
    try {
      await queueTranscriptionForRecording(this.prisma, {
        mediaId,
        interviewId,
        organizationId,
        requestedById: userId,
      });
    } catch (err) {
      this.logger.error(
        `Could not queue transcription for recording ${mediaId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * The recording gate: consent is checked here, before any bytes reach
   * storage. `MediaService` has no notion of consent — it only stores
   * objects — so every path that attaches audio to an interview goes
   * through this check first.
   */
  private async assertRecordingPermitted(
    id: string,
    viewerId: string,
    organizationId: string,
  ) {
    const interview = await this.findById(id, organizationId, viewerId);
    const consent = await this.consentsService.findById(
      interview.consentId,
      organizationId,
    );
    this.consentsService.assertScope(consent, 'allowRecording');
    return interview;
  }
}
