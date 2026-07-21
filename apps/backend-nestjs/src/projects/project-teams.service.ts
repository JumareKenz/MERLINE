import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class ProjectTeamsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.projectTeam.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(projectId: string, userId: string, role: string = 'member') {
    await this.ensureProjectExists(projectId);

    const existing = await this.prisma.projectTeam.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this project team');
    }

    return this.prisma.projectTeam.create({
      data: { projectId, userId, role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateMember(projectId: string, userId: string, role: string) {
    await this.ensureProjectExists(projectId);

    const member = await this.prisma.projectTeam.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return this.prisma.projectTeam.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    await this.ensureProjectExists(projectId);

    const member = await this.prisma.projectTeam.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.projectTeam.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return { deleted: true };
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
