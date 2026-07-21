import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class ProjectTagsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.projectTag.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTag(projectId: string, name: string, color?: string) {
    await this.ensureProjectExists(projectId);

    return this.prisma.projectTag.create({
      data: { projectId, name, color },
    });
  }

  async deleteTag(projectId: string, tagId: string) {
    await this.ensureProjectExists(projectId);

    const tag = await this.prisma.projectTag.findFirst({
      where: { id: tagId, projectId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.projectTag.delete({
      where: { id: tagId },
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
