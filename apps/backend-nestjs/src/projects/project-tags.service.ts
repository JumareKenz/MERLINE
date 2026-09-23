import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { requireProjectInOrganization } from './project-access';

@Injectable()
export class ProjectTagsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string, organizationId: string) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    return this.prisma.projectTag.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTag(
    projectId: string,
    name: string,
    organizationId: string,
    color?: string,
  ) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    return this.prisma.projectTag.create({
      data: { projectId, name, color },
    });
  }

  async deleteTag(projectId: string, tagId: string, organizationId: string) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    const tag = await this.prisma.projectTag.findFirst({
      where: { id: tagId, projectId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.projectTag.delete({ where: { id: tagId } });
    return { deleted: true };
  }
}
