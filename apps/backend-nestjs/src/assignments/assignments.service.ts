import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { BatchAssignmentDto } from './dto/batch-assignment.dto';
import { AssignmentStatus } from '@prisma/client';

@Injectable()
export class AssignmentsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    studyId?: string;
    enumeratorId?: string;
    status?: AssignmentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.studyId) where.studyId = query.studyId;
    if (query.enumeratorId) where.enumeratorId = query.enumeratorId;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where,
        skip,
        take: limit,
        include: {
          enumerator: true,
          study: true,
          _count: {
            select: { submissions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        enumerator: true,
        study: true,
        submissions: {
          include: { media: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async create(dto: CreateAssignmentDto, userId: string, organizationId: string) {
    const study = await this.prisma.study.findUnique({ where: { id: dto.studyId } });
    if (!study) {
      throw new NotFoundException('Study not found');
    }

    const enumerator = await this.prisma.user.findUnique({ where: { id: dto.enumeratorId } });
    if (!enumerator) {
      throw new NotFoundException('Enumerator not found');
    }

    return this.prisma.assignment.create({
      data: {
        studyId: dto.studyId,
        enumeratorId: dto.enumeratorId,
        notes: dto.notes,
        status: dto.status || AssignmentStatus.ASSIGNED,
        organizationId,
        createdById: userId,
      },
      include: {
        enumerator: true,
        study: true,
      },
    });
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    await this.findById(id);
    return this.prisma.assignment.update({
      where: { id },
      data: {
        studyId: dto.studyId,
        enumeratorId: dto.enumeratorId,
        notes: dto.notes,
        status: dto.status,
        startedAt: dto.status === AssignmentStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt: dto.status === AssignmentStatus.COMPLETED ? new Date() : undefined,
      },
      include: {
        enumerator: true,
        study: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.assignment.delete({ where: { id } });
  }

  async batchCreate(dto: BatchAssignmentDto, userId: string, organizationId: string) {
    const created: Array<{ id: string; status: string; enumeratorId: string; studyId: string; organizationId: string; createdById: string; notes?: string | null; assignedAt: Date; startedAt?: Date | null; completedAt?: Date | null; createdAt: Date; updatedAt: Date }> = [];

    for (const item of dto.assignments) {
      const study = await this.prisma.study.findUnique({ where: { id: item.studyId } });
      if (!study) {
        throw new NotFoundException(`Study not found: ${item.studyId}`);
      }

      const enumerator = await this.prisma.user.findUnique({ where: { id: item.enumeratorId } });
      if (!enumerator) {
        throw new NotFoundException(`Enumerator not found: ${item.enumeratorId}`);
      }

      const assignment = await this.prisma.assignment.create({
        data: {
          studyId: item.studyId,
          enumeratorId: item.enumeratorId,
          notes: item.notes,
          organizationId,
          createdById: userId,
        },
        include: {
          enumerator: true,
          study: true,
        },
      });

      created.push(assignment);
    }

    return created;
  }

  async approve(id: string, userId: string) {
    const assignment = await this.findById(id);

    if (assignment.status !== AssignmentStatus.COMPLETED) {
      throw new BadRequestException('Only completed assignments can be approved');
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.APPROVED,
      },
      include: {
        enumerator: true,
        study: true,
      },
    });
  }

  async reject(id: string, userId: string, notes?: string) {
    const assignment = await this.findById(id);

    if (assignment.status === AssignmentStatus.REJECTED) {
      throw new ConflictException('Assignment is already rejected');
    }

    return this.prisma.assignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.REJECTED,
        notes: notes || undefined,
      },
      include: {
        enumerator: true,
        study: true,
      },
    });
  }

  async getProgress(id: string) {
    const assignment = await this.findById(id);

    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId: id },
      select: { id: true, status: true },
    });

    return {
      totalSubmissions: submissions.length,
      completedSubmissions: submissions.filter((s) => s.status === 'COMPLETED' || s.status === 'APPROVED').length,
      pendingSubmissions: submissions.filter((s) => s.status === 'DRAFT').length,
      syncedSubmissions: submissions.filter((s) => s.status === 'SYNCED').length,
      rejectedSubmissions: submissions.filter((s) => s.status === 'REJECTED').length,
      status: assignment.status,
      enumeratorId: assignment.enumeratorId,
      studyId: assignment.studyId,
    };
  }

  async getEnumeratorAssignments(enumeratorId: string, query: { status?: AssignmentStatus; studyId?: string }) {
    const where: any = { enumeratorId };

    if (query.status) where.status = query.status;
    if (query.studyId) where.studyId = query.studyId;

    return this.prisma.assignment.findMany({
      where,
      include: {
        study: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnumeratorLoad(enumeratorId: string) {
    const assignments = await this.prisma.assignment.findMany({
      where: { enumeratorId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    const total = assignments.length;
    const inProgress = assignments.filter((a) => a.status === AssignmentStatus.IN_PROGRESS).length;
    const completed = assignments.filter((a) => a.status === AssignmentStatus.COMPLETED || a.status === AssignmentStatus.APPROVED).length;
    const pending = assignments.filter((a) => a.status === AssignmentStatus.ASSIGNED).length;
    const totalSubmissions = assignments.reduce((sum, a) => sum + a._count.submissions, 0);

    return {
      enumeratorId,
      totalAssignments: total,
      inProgress,
      completed,
      pending,
      totalSubmissions,
      loadPercentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
    };
  }
}
