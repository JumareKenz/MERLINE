import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { ConsentsService } from '../consents/consents.service';
import { MediaService } from '../media/media.service';
import { CreateInterviewDto } from './dto/create-interview.dto';

/** Status transitions a caller may request explicitly via PATCH .../status. */
const ALLOWED_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class InterviewsService extends BaseService {
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
    },
  ) {
    return this.prisma.interview.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.participantId && { participantId: filters.participantId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { id, organizationId, deletedAt: null },
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
    return this.executeTransaction(async (tx) => {
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
          organizationId,
        },
      });
    });
  }

  async updateStatus(
    id: string,
    status: InterviewStatus,
    organizationId: string,
  ) {
    const interview = await this.findById(id, organizationId);

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

  /**
   * The recording gate: consent is checked here, before any bytes reach
   * storage. `MediaService.upload` has no notion of consent — it only knows
   * how to store an object — so this is the one and only path that may
   * create a Media row with `interviewId` set.
   */
  async uploadRecording(
    id: string,
    file: Express.Multer.File,
    metadata: Record<string, unknown> | undefined,
    userId: string,
    organizationId: string,
  ) {
    const interview = await this.findById(id, organizationId);
    const consent = await this.consentsService.findById(
      interview.consentId,
      organizationId,
    );

    this.consentsService.assertScope(consent, 'allowRecording');

    return this.mediaService.upload(
      file,
      { metadata, interviewId: id },
      userId,
      organizationId,
    );
  }

  async listRecordings(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    return this.prisma.media.findMany({
      where: { interviewId: id, organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRecordingDownloadUrl(
    id: string,
    mediaId: string,
    organizationId: string,
  ) {
    await this.findById(id, organizationId);

    const { url, expiresIn, media } = await this.mediaService.getDownloadUrl(
      mediaId,
      organizationId,
    );

    if (media.interviewId !== id) {
      throw new ForbiddenException(
        'Recording does not belong to this interview',
      );
    }

    return { url, expiresIn };
  }
}
