import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { resolveFieldScope } from '../common/scoping/field-scope';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * `viewerId` is the calling user. Controllers always pass it; a
   * field-interviewer-only caller is narrowed to participants they
   * registered or are assigned to interview (see common/scoping). Internal
   * callers that omit it get organization-wide scope.
   */
  async findAll(organizationId: string, projectId?: string, viewerId?: string) {
    return this.prisma.participant.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(await this.fieldScopeWhere(viewerId, organizationId)),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string, viewerId?: string) {
    const participant = await this.prisma.participant.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        ...(await this.fieldScopeWhere(viewerId, organizationId)),
      },
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
    await this.assertProjectInOrganization(dto.projectId, organizationId);
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

  async update(
    id: string,
    dto: UpdateParticipantDto,
    organizationId: string,
    viewerId?: string,
  ) {
    await this.findById(id, organizationId, viewerId);
    await this.assertProjectInOrganization(dto.projectId, organizationId);

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

  async remove(id: string, organizationId: string, viewerId?: string) {
    await this.findById(id, organizationId, viewerId);

    await this.prisma.participant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  /** A project id from the request body must belong to the caller's tenant. */
  private async assertProjectInOrganization(
    projectId: string | undefined | null,
    organizationId: string,
  ) {
    if (!projectId) return;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }

  private async fieldScopeWhere(
    viewerId: string | undefined,
    organizationId: string,
  ) {
    const scopedTo = await resolveFieldScope(
      this.prisma,
      viewerId,
      organizationId,
    );
    if (!scopedTo) return {};
    return {
      OR: [
        { createdById: scopedTo },
        { interviews: { some: { interviewerId: scopedTo, deletedAt: null } } },
      ],
    };
  }
}
