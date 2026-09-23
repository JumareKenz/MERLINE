import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { requireProjectInOrganization } from './project-access';

const MEMBER_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ProjectTeamsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByProject(projectId: string, organizationId: string) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    return this.prisma.projectTeam.findMany({
      where: { projectId },
      include: { user: { select: MEMBER_USER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    projectId: string,
    userId: string,
    organizationId: string,
    role = 'member',
  ) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    // The user must belong to the same organization as the project.
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.projectTeam.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (existing) {
      throw new ConflictException(
        'User is already a member of this project team',
      );
    }
    return this.prisma.projectTeam.create({
      data: { projectId, userId, role },
      include: { user: { select: MEMBER_USER_SELECT } },
    });
  }

  async updateMember(
    projectId: string,
    userId: string,
    role: string,
    organizationId: string,
  ) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    await this.requireMember(projectId, userId);
    return this.prisma.projectTeam.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: { user: { select: MEMBER_USER_SELECT } },
    });
  }

  async removeMember(
    projectId: string,
    userId: string,
    organizationId: string,
  ) {
    await requireProjectInOrganization(this.prisma, projectId, organizationId);
    await this.requireMember(projectId, userId);
    await this.prisma.projectTeam.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    return { deleted: true };
  }

  private async requireMember(projectId: string, userId: string) {
    const member = await this.prisma.projectTeam.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member;
  }
}
