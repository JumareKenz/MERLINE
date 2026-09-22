import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findAll(organizationId: string, projectId?: string) {
    return this.prisma.participant.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!participant) {
      // Same response whether it does not exist or belongs to another tenant.
      throw new NotFoundException('Participant not found');
    }

    return participant;
  }

  async create(
    dto: CreateParticipantDto,
    userId: string,
    organizationId: string,
  ) {
    return this.prisma.participant.create({
      data: {
        displayName: dto.displayName,
        externalRef: dto.externalRef,
        projectId: dto.projectId,
        metadata: (dto.metadata ?? {}) as any,
        organizationId,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateParticipantDto, organizationId: string) {
    await this.findById(id, organizationId);

    return this.prisma.participant.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.externalRef !== undefined && { externalRef: dto.externalRef }),
        ...(dto.projectId !== undefined && { projectId: dto.projectId }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as any }),
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findById(id, organizationId);

    await this.prisma.participant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }
}
