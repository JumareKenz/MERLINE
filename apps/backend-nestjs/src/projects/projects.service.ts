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
    // PHASE 1: required, and supplied by the controller from the caller's
    // token. Was optional and read straight from the query string, so any
    // authenticated user could list another organization's projects.
    organizationId: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      organizationId: query.organizationId,
    };

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
        // PHASE 1: dropped `_count: { studies: true }`. Studies are a
        // deregistered legacy relation; interview counts replace it in Phase 2.
        include: {
          _count: {
            select: {
              participants: { where: { deletedAt: null } },
              interviews: { where: { deletedAt: null } },
              findings: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, organizationId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(dto: CreateProjectDto, userId: string, organizationId: string) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        settings: dto.settings as any,
        workspaceId: dto.workspaceId,
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto, organizationId: string) {
    // PHASE 1: findById is tenant-scoped, so this doubles as the ownership
    // check. Every mutating method must go through it.
    await this.findById(id, organizationId);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.settings !== undefined && { settings: dto.settings as any }),
        ...(dto.workspaceId !== undefined && { workspaceId: dto.workspaceId }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async archive(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async restore(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.project.update({
      where: { id },
      data: { status: 'active', deletedAt: null },
    });
  }

  async clone(id: string, userId: string, organizationId: string) {
    const project = await this.findById(id, organizationId);
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

  async getTimeline(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    return this.prisma.projectActivity.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * PHASE 1 — legacy query removal.
   *
   * Previously counted studies, submissions and questionnaires, and grouped
   * studies by status. Those modules are deregistered, so an active endpoint
   * was reading tables that no longer have an owner.
   *
   * Reduced to what the qualitative product can answer today. Interview,
   * recording and transcript counts are added in Phase 2 when those tables
   * exist — see LEGACY.md.
   */
  async getStats(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    const [teamCount, activityCount, tagCount] = await Promise.all([
      this.prisma.projectTeam.count({ where: { projectId: id } }),
      this.prisma.projectActivity.count({ where: { projectId: id } }),
      this.prisma.projectTag.count({ where: { projectId: id } }),
    ]);

    return {
      totalTeamMembers: teamCount,
      totalActivities: activityCount,
      totalTags: tagCount,
    };
  }
}
