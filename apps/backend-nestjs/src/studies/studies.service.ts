import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateStudyDto } from './dto/create-study.dto';
import { UpdateStudyDto } from './dto/update-study.dto';
import { StudyStatus } from '@prisma/client';
import { toJsonValue } from '../common/utils/prisma-json';

const STUDY_TRANSITIONS: Record<StudyStatus, StudyStatus[]> = {
  [StudyStatus.DRAFT]: [StudyStatus.PLANNED],
  [StudyStatus.PLANNED]: [StudyStatus.IN_DESIGN],
  [StudyStatus.IN_DESIGN]: [StudyStatus.DESIGN_REVIEW],
  [StudyStatus.DESIGN_REVIEW]: [StudyStatus.APPROVED, StudyStatus.IN_DESIGN],
  [StudyStatus.APPROVED]: [StudyStatus.DATA_COLLECTION],
  [StudyStatus.DATA_COLLECTION]: [StudyStatus.DATA_CLEANING],
  [StudyStatus.DATA_CLEANING]: [StudyStatus.ANALYSIS],
  [StudyStatus.ANALYSIS]: [StudyStatus.REPORTING],
  [StudyStatus.REPORTING]: [StudyStatus.COMPLETED],
  [StudyStatus.COMPLETED]: [StudyStatus.ARCHIVED],
  [StudyStatus.ARCHIVED]: [StudyStatus.COMPLETED],
};

@Injectable()
export class StudiesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    projectId?: string;
    status?: StudyStatus;
    type?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.projectId) {
      where.projectId = query.projectId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.study.findMany({
        where,
        skip,
        take: limit,
        include: {
          teams: {
            include: { user: true },
          },
          _count: {
            select: {
              questionnaires: true,
              assignments: true,
              indicators: true,
              submissions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.study.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const study = await this.prisma.study.findFirst({
      where: { id, deletedAt: null },
      include: {
        teams: {
          include: { user: true },
        },
        project: true,
        _count: {
          select: {
            questionnaires: true,
            assignments: true,
            indicators: true,
            submissions: true,
          },
        },
      },
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }

    return study;
  }

  async create(dto: CreateStudyDto, userId: string, organizationId: string) {
    return this.prisma.study.create({
      data: {
        title: dto.title,
        code: dto.code,
        description: dto.description,
        type: dto.type,
        studyDesign: toJsonValue(dto.studyDesign),
        location: toJsonValue(dto.location),
        targetDetails: toJsonValue(dto.targetDetails),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        projectId: dto.projectId,
        organizationId,
        createdById: userId,
      },
      include: {
        teams: {
          include: { user: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateStudyDto) {
    await this.findById(id);
    return this.prisma.study.update({
      where: { id },
      data: {
        title: dto.title,
        code: dto.code,
        description: dto.description,
        type: dto.type,
        studyDesign: toJsonValue(dto.studyDesign),
        location: toJsonValue(dto.location),
        targetDetails: toJsonValue(dto.targetDetails),
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isLocked: dto.isLocked,
        lockedAt: dto.isLocked === true ? new Date() : dto.isLocked === false ? null : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.study.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async transition(id: string, status: StudyStatus, userId: string) {
    const study = await this.findById(id);

    if (study.isLocked) {
      throw new ForbiddenException('Study is locked. Unlock it first to change status.');
    }

    this.validateTransition(study.status, status);

    return this.prisma.study.update({
      where: { id },
      data: { status },
    });
  }

  async executeTransition(id: string, status: StudyStatus, notes: string | undefined, userId: string) {
    const study = await this.findById(id);

    if (study.isLocked) {
      throw new ForbiddenException('Study is locked. Unlock it first to change status.');
    }

    this.validateTransition(study.status, status);
    this.validateBusinessRules(study, status);

    return this.prisma.study.update({
      where: { id },
      data: { status },
    });
  }

  async getAllowedTransitions(id: string) {
    const study = await this.prisma.study.findFirst({
      where: { id, deletedAt: null },
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }

    const current = study.status;
    const machineTransitions = STUDY_TRANSITIONS[current] || [];
    const transitions = new Set<StudyStatus>();

    for (const t of machineTransitions) {
      transitions.add(t);
    }

    if (current !== StudyStatus.DRAFT) {
      transitions.add(StudyStatus.DRAFT);
    }

    return Array.from(transitions).map((status) => ({
      from: current,
      to: status,
    }));
  }

  async clone(id: string, userId: string, organizationId: string) {
    const study = await this.findById(id);

    return this.prisma.study.create({
      data: {
        title: `${study.title} (Copy)`,
        code: study.code ? `${study.code}-copy` : undefined,
        description: study.description,
        type: study.type,
        studyDesign: toJsonValue(study.studyDesign),
        location: toJsonValue(study.location),
        targetDetails: toJsonValue(study.targetDetails),
        status: StudyStatus.DRAFT,
        projectId: study.projectId,
        organizationId,
        createdById: userId,
      },
      include: {
        teams: {
          include: { user: true },
        },
      },
    });
  }

  async getLifecycle(id: string) {
    await this.findById(id);

    return Object.entries(STUDY_TRANSITIONS).map(([state, transitions]) => ({
      state,
      transitions,
      canReset: state !== StudyStatus.DRAFT,
    }));
  }

  async lock(id: string, userId: string) {
    const study = await this.findById(id);

    if (study.isLocked) {
      throw new ConflictException('Study is already locked');
    }

    return this.prisma.study.update({
      where: { id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedById: userId,
      },
    });
  }

  async unlock(id: string) {
    const study = await this.findById(id);

    if (!study.isLocked) {
      throw new ConflictException('Study is not locked');
    }

    return this.prisma.study.update({
      where: { id },
      data: {
        isLocked: false,
        lockedAt: null,
        lockedById: null,
      },
    });
  }

  private validateTransition(current: StudyStatus, target: StudyStatus) {
    if (current === target) {
      throw new BadRequestException(`Study is already in status ${current}`);
    }

    const machineTransitions = STUDY_TRANSITIONS[current] || [];
    const canReset = current !== StudyStatus.DRAFT && target === StudyStatus.DRAFT;

    if (!machineTransitions.includes(target) && !canReset) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${target}. Allowed: ${[...machineTransitions, ...(current !== StudyStatus.DRAFT ? [StudyStatus.DRAFT] : [])].join(', ')}`,
      );
    }
  }

  private validateBusinessRules(study: { teams?: unknown[]; startDate?: Date | null }, target: StudyStatus) {
    if (target === StudyStatus.APPROVED && (!study.teams || study.teams.length === 0)) {
      throw new BadRequestException('Study must have at least one team member before approval');
    }

    if (target === StudyStatus.DATA_COLLECTION && !study.startDate) {
      throw new BadRequestException('Study must have a start date before data collection');
    }
  }
}
