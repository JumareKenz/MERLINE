import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    organizationId?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { studies: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        settings: dto.settings as any,
        workspaceId: dto.workspaceId,
        organizationId: dto.organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findById(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.settings !== undefined && { settings: dto.settings as any }),
        ...(dto.workspaceId !== undefined && { workspaceId: dto.workspaceId }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async archive(id: string) {
    await this.findById(id);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async restore(id: string) {
    await this.findById(id);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'active', deletedAt: null },
    });
  }

  async clone(id: string, userId: string, organizationId: string) {
    const project = await this.findById(id);
    return this.prisma.project.create({
      data: {
        name: `${project.name} (Copy)`,
        description: project.description,
        status: 'active',
        startDate: project.startDate,
        endDate: project.endDate,
        settings: project.settings as any,
        organizationId,
        createdById: userId,
      },
    });
  }

  async getTimeline(id: string) {
    await this.findById(id);
    return this.prisma.projectActivity.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getStats(id: string) {
    await this.findById(id);
    const [studies, studiesCount] = await Promise.all([
      this.prisma.study.findMany({
        where: { projectId: id, deletedAt: null },
        select: { id: true, status: true },
      }),
      this.prisma.study.count({ where: { projectId: id, deletedAt: null } }),
    ]);

    const studyIds = studies.map((s) => s.id);
    const [submissionsCount, questionnairesCount, teamCount] = await Promise.all([
      studyIds.length > 0
        ? this.prisma.submission.count({ where: { studyId: { in: studyIds } } })
        : 0,
      this.prisma.questionnaire.count({ where: { studyId: { in: studyIds } } }),
      this.prisma.projectTeam.count({ where: { projectId: id } }),
    ]);

    const studiesByStatus = studies.reduce(
      (acc: Record<string, number>, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalStudies: studiesCount,
      totalSubmissions: submissionsCount,
      totalQuestionnaires: questionnairesCount,
      totalTeamMembers: teamCount,
      studiesByStatus,
    };
  }
}
