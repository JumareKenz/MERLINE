import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { BaseService } from '../common/base/base.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService extends BaseService {
  async findAll(orgId: string) {
    await this.ensureOrganizationExists(orgId);
    return this.prisma.role.findMany({
      where: { organizationId: orgId },
      include: { permissions: { include: { permission: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, orgId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: orgId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(orgId: string, dto: CreateRoleDto) {
    await this.ensureOrganizationExists(orgId);
    const existing = await this.prisma.role.findUnique({
      where: { slug_organizationId: { slug: dto.slug, organizationId: orgId } },
    });
    if (existing) {
      throw new ConflictException('Role with this slug already exists in the organization');
    }
    return this.prisma.role.create({
      data: { ...dto, organizationId: orgId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(orgId: string, id: string, dto: UpdateRoleDto) {
    await this.ensureRoleExists(orgId, id);
    if (dto.slug) {
      const existing = await this.prisma.role.findUnique({
        where: { slug_organizationId: { slug: dto.slug, organizationId: orgId } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Role with this slug already exists in the organization');
      }
    }
    return this.prisma.role.update({
      where: { id },
      data: dto,
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(orgId: string, id: string) {
    await this.ensureRoleExists(orgId, id);
    return this.prisma.role.delete({ where: { id } });
  }

  async updatePermissions(orgId: string, id: string, permissionIds: string[]) {
    await this.ensureRoleExists(orgId, id);
    await this.prisma.permissionRole.deleteMany({ where: { roleId: id } });
    if (permissionIds.length > 0) {
      await this.prisma.permissionRole.createMany({
        data: permissionIds.map((permissionId) => ({
          permissionId,
          roleId: id,
        })),
      });
    }
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
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

  private async ensureRoleExists(orgId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
  }
}
