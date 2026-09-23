import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { requireProjectInOrganization } from './project-access';

@Injectable()
export class ProjectActivitiesService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string, organizationId: string) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    return this.prisma.projectActivity.findMany({
      where: { projectId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
