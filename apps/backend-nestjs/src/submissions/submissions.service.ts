import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionStatus } from '@prisma/client';
import { toJsonValue } from '../common/utils/prisma-json';

@Injectable()
export class SubmissionsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    studyId?: string;
    assignmentId?: string;
    enumeratorId?: string;
    status?: SubmissionStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (query.studyId) where.studyId = query.studyId;
    if (query.assignmentId) where.assignmentId = query.assignmentId;
    if (query.enumeratorId) where.enumeratorId = query.enumeratorId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enumerator: { select: { id: true, firstName: true, lastName: true } },
          media: { select: { id: true, filename: true, type: true } },
        },
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id, deletedAt: null },
      include: {
        enumerator: { select: { id: true, firstName: true, lastName: true } },
        assignment: true,
        media: true,
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async create(dto: CreateSubmissionDto, userId: string, organizationId: string) {
    return this.prisma.submission.create({
      data: {
        answers: toJsonValue(dto.answers ?? {}),
        location: toJsonValue(dto.location),
        deviceId: dto.deviceId,
        notes: dto.notes,
        assignmentId: dto.assignmentId,
        studyId: dto.studyId,
        questionnaireId: dto.questionnaireId,
        enumeratorId: dto.enumeratorId ?? userId,
        organizationId,
        createdById: userId,
      },
      include: {
        enumerator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, dto: UpdateSubmissionDto) {
    await this.findById(id);
    return this.prisma.submission.update({
      where: { id },
      data: {
        answers: toJsonValue(dto.answers),
        location: toJsonValue(dto.location),
        notes: dto.notes,
        qualityScore: dto.qualityScore,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.submission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async complete(id: string) {
    const submission = await this.findById(id);
    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new ConflictException('Only draft submissions can be completed');
    }
    return this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async approve(id: string, reviewerId: string) {
    const submission = await this.findById(id);
    if (submission.status !== SubmissionStatus.COMPLETED && submission.status !== SubmissionStatus.FLAGGED) {
      throw new ConflictException('Only completed or flagged submissions can be approved');
    }
    return this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async reject(id: string, reviewerId: string) {
    const submission = await this.findById(id);
    if (submission.status !== SubmissionStatus.COMPLETED && submission.status !== SubmissionStatus.FLAGGED) {
      throw new ConflictException('Only completed or flagged submissions can be rejected');
    }
    return this.prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  async flag(id: string) {
    const submission = await this.findById(id);
    if (submission.status === SubmissionStatus.APPROVED || submission.status === SubmissionStatus.REJECTED) {
      throw new ConflictException('Cannot flag an already reviewed submission');
    }
    return this.prisma.submission.update({
      where: { id },
      data: { status: SubmissionStatus.FLAGGED },
    });
  }

  async getQualityAssessment(id: string) {
    const submission = await this.findById(id);
    const answers = submission.answers as Record<string, any>;
    const totalQuestions = Object.keys(answers).length;
    const answeredQuestions = Object.values(answers).filter((v) => v !== null && v !== undefined && v !== '').length;
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    const hasLocation = submission.location !== null && submission.location !== undefined;
    const timeToComplete = submission.completedAt && submission.startedAt
      ? (submission.completedAt.getTime() - submission.startedAt.getTime()) / 1000
      : null;
    return {
      submissionId: id,
      status: submission.status,
      qualityScore: submission.qualityScore,
      completionRate: Math.round(completionRate * 100) / 100,
      totalQuestions,
      answeredQuestions,
      hasLocation,
      timeToCompleteSeconds: timeToComplete,
      reviewed: submission.reviewedAt !== null,
    };
  }

  async exportSubmissions(query: { studyId?: string; status?: SubmissionStatus }) {
    const where: any = { deletedAt: null };
    if (query.studyId) where.studyId = query.studyId;
    if (query.status) where.status = query.status;
    const submissions = await this.prisma.submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        enumerator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return submissions.map((s) => ({
      id: s.id,
      status: s.status,
      answers: s.answers,
      location: s.location,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      deviceId: s.deviceId,
      notes: s.notes,
      qualityScore: s.qualityScore,
      enumerator: s.enumerator,
      studyId: s.studyId,
      questionnaireId: s.questionnaireId,
      createdAt: s.createdAt,
    }));
  }

  async findByEnumerator(enumeratorId: string) {
    return this.prisma.submission.findMany({
      where: { enumeratorId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        study: { select: { id: true, title: true, code: true } },
      },
    });
  }

  async getEnumeratorStats(enumeratorId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { enumeratorId, deletedAt: null },
    });
    const total = submissions.length;
    const completed = submissions.filter((s) => s.status === SubmissionStatus.COMPLETED).length;
    const approved = submissions.filter((s) => s.status === SubmissionStatus.APPROVED).length;
    const rejected = submissions.filter((s) => s.status === SubmissionStatus.REJECTED).length;
    const flagged = submissions.filter((s) => s.status === SubmissionStatus.FLAGGED).length;
    const draft = submissions.filter((s) => s.status === SubmissionStatus.DRAFT).length;
    const avgQuality = submissions.reduce((sum, s) => sum + (s.qualityScore ?? 0), 0) / (total || 1);
    return {
      enumeratorId,
      total,
      byStatus: { draft, completed, approved, rejected, flagged },
      averageQualityScore: Math.round(avgQuality * 100) / 100,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }
}
