import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { BaseService } from '../common/base/base.service';
import { PrismaService } from '../database/prisma.service';
import { softDeleteUser } from '../users/delete-user';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

/**
 * PHASE 2 — real bug fixed here: this class had no constructor of its own.
 * `BaseService`'s constructor takes `PrismaService`, but a subclass with no
 * explicit constructor emits no `design:paramtypes` metadata for TypeScript's
 * decorator reflection, so Nest's DI container instantiated this with zero
 * constructor arguments. Every method on this service has always thrown
 * "Cannot read properties of undefined (reading 'organization')" (or
 * similar) the instant it touched `this.prisma` — confirmed live against a
 * running server: GET /organizations and GET /organizations/:orgId/members
 * both 500'd with exactly that message before this fix. Every other service
 * in the codebase that extends `BaseService` redeclares this constructor;
 * these four (this file, roles.service.ts, permissions.service.ts,
 * workspaces.service.ts) were the only ones that didn't.
 */
@Injectable()
export class OrganizationsService extends BaseService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

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
        throw new ConflictException(
          'Organization with this slug already exists',
        );
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
        fieldAccessCodeIssuedAt: true,
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
    body: {
      email: string;
      firstName: string;
      lastName: string;
      roleId?: string;
    },
    createdById: string,
  ) {
    await this.findById(orgId);
    if (body.roleId) await this.assertRoleInOrganization(body.roleId, orgId);

    const existing = await this.prisma.user.findUnique({
      where: { email: body.email },
    });
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

    // PHASE 2: real bug fixed here — this returned the full Prisma `User`
    // row, bcrypt `passwordHash` included, to any caller with permission to
    // add a member. Confirmed against a live server. `tempPassword` is
    // already the deliberate one-time secret in this response; the hash
    // never needs to leave this method.
    const safeUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
    };
    return { user: safeUser, tempPassword };
  }

  async updateMemberRole(orgId: string, userId: string, roleId: string) {
    await this.findById(orgId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found in organization');
    }
    await this.assertRoleInOrganization(roleId, orgId);

    await this.prisma.roleUser.deleteMany({ where: { userId } });
    await this.prisma.roleUser.create({ data: { userId, roleId } });

    return { updated: true };
  }

  async removeMember(orgId: string, userId: string, actorId?: string) {
    await this.findById(orgId);
    return softDeleteUser(this.prisma, userId, orgId, actorId);
  }

  /** A role id from a request body must be one of this organization's roles. */
  private async assertRoleInOrganization(roleId: string, orgId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
      select: { id: true },
    });
    if (!role) {
      throw new NotFoundException('Role not found in organization');
    }
  }
}
