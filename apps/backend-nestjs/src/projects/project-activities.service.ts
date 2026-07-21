import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class ProjectActivitiesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.projectActivity.findMany({
      where: { projectId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
