import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from '../common/base/base.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService extends BaseService {
  async findAll(orgId: string) {
    await this.ensureOrganizationExists(orgId);
    return this.prisma.workspace.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(orgId: string, id: string) {
    await this.ensureOrganizationExists(orgId);
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async create(orgId: string, dto: CreateWorkspaceDto) {
    await this.ensureOrganizationExists(orgId);
    return this.prisma.workspace.create({
      data: { ...dto, organizationId: orgId },
    });
  }

  async update(orgId: string, id: string, dto: UpdateWorkspaceDto) {
    await this.findById(orgId, id);
    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async remove(orgId: string, id: string) {
    await this.findById(orgId, id);
    return this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureOrganizationExists(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
  }
}
