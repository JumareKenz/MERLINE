import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { BaseService } from '../common/base/base.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationsService extends BaseService {
  async create(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Organization with this slug already exists');
    }
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        ...(dto.logoUrl && { logoUrl: dto.logoUrl }),
        ...(dto.settings && { settings: dto.settings as any }),
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);
    if (dto.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Organization with this slug already exists');
      }
    }
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.settings !== undefined && { settings: dto.settings as any }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getMembers(orgId: string) {
    await this.findById(orgId);
    return this.prisma.user.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          include: { role: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    orgId: string,
    body: { email: string; firstName: string; lastName: string; roleId?: string },
    createdById: string,
  ) {
    await this.findById(orgId);

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash,
        organizationId: orgId,
      },
    });

    if (body.roleId) {
      await this.prisma.roleUser.create({
        data: { userId: user.id, roleId: body.roleId },
      });
    }

    return { user, tempPassword };
  }

  async updateMemberRole(orgId: string, userId: string, roleId: string) {
    await this.findById(orgId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in organization');
    }

    await this.prisma.roleUser.deleteMany({ where: { userId } });
    await this.prisma.roleUser.create({ data: { userId, roleId } });

    return { updated: true };
  }

  async removeMember(orgId: string, userId: string) {
    await this.findById(orgId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in organization');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { deleted: true };
  }
}
