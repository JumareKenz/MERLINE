import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';

@Injectable()
export class StudyTeamsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findByStudy(studyId: string) {
    await this.ensureStudyExists(studyId);

    return this.prisma.studyTeam.findMany({
      where: { studyId },
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

  async addMember(studyId: string, userId: string, role: string = 'member') {
    await this.ensureStudyExists(studyId);

    const existing = await this.prisma.studyTeam.findUnique({
      where: { studyId_userId: { studyId, userId } },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this study team');
    }

    return this.prisma.studyTeam.create({
      data: { studyId, userId, role },
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

  async removeMember(studyId: string, userId: string) {
    await this.ensureStudyExists(studyId);

    const member = await this.prisma.studyTeam.findUnique({
      where: { studyId_userId: { studyId, userId } },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.studyTeam.delete({
      where: { studyId_userId: { studyId, userId } },
    });

    return { deleted: true };
  }

  private async ensureStudyExists(studyId: string) {
    const study = await this.prisma.study.findFirst({
      where: { id: studyId, deletedAt: null },
    });

    if (!study) {
      throw new NotFoundException('Study not found');
    }
  }
}
