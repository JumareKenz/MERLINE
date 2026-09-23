import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { softDeleteUser } from './delete-user';

/** Excludes 0/O/1/I/L — characters that are easy to mis-type or mis-read aloud. */
const FIELD_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateFieldCode(): string {
  const raw = Array.from(
    { length: 10 },
    () => FIELD_CODE_ALPHABET[randomInt(FIELD_CODE_ALPHABET.length)],
  ).join('');
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

@Injectable()
export class UsersService extends BaseService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: string;
    organizationId: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    // PHASE 1: always tenant-scoped. Was an optional client-supplied filter.
    const where: any = {
      deletedAt: null,
      organizationId: query.organizationId,
    };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          locale: true,
          isActive: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          fieldAccessCodeIssuedAt: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findById(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        fieldAccessCodeIssuedAt: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: { id: true, name: true, slug: true, description: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, organizationId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        locale: dto.locale ?? 'en',
        isActive: dto.isActive ?? true,
        organizationId,
        roles: dto.roleIds?.length
          ? {
              create: dto.roleIds.map((roleId) => ({ roleId })),
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        isActive: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const data: any = {};

    if (dto.email !== undefined) data.email = dto.email;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.locale !== undefined) data.locale = dto.locale;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        locale: true,
        isActive: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        fieldAccessCodeIssuedAt: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  /** See softDeleteUser: signs them out, stops their field code, keeps one admin. */
  async delete(id: string, organizationId: string, actorId?: string) {
    return softDeleteUser(this.prisma, id, organizationId, actorId);
  }

  async updateRoles(
    id: string,
    dto: UpdateUserRolesDto,
    organizationId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    // Roles are per-tenant (see PermissionGuard). Assigning a role from
    // another organization would not actually grant anything there — the
    // guard filters by the caller's own organizationId — but it would leave
    // a confusing, meaningless roleUser row, so refuse it outright rather
    // than silently accept an id that isn't this tenant's.
    if (dto.roleIds.length > 0) {
      const validRoles = await this.prisma.role.count({
        where: { id: { in: dto.roleIds }, organizationId },
      });
      if (validRoles !== dto.roleIds.length) {
        throw new NotFoundException(
          'One or more roles do not belong to this organization',
        );
      }
    }

    await this.prisma.roleUser.deleteMany({ where: { userId: id } });

    if (dto.roleIds.length > 0) {
      await this.prisma.roleUser.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    return this.findById(id, organizationId);
  }

  /**
   * Issues a fresh field-worker access code, invalidating any previous one
   * for this user. Returns the code in plaintext — this is the only time it
   * is ever readable; it is not hashed (see the schema comment for why) but
   * it is also never returned by any other endpoint, so this response is
   * the admin's one chance to copy it for the field worker.
   */
  async generateFieldAccessCode(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    // Collision odds on a 10-char, 32-symbol alphabet are astronomically
    // low, but @unique means a collision fails loudly rather than silently
    // overwriting someone else's code — retry a handful of times rather
    // than surface that as a 500.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateFieldCode();
      try {
        await this.prisma.user.update({
          where: { id },
          data: { fieldAccessCode: code, fieldAccessCodeIssuedAt: new Date() },
        });
        return { code, issuedAt: new Date() };
      } catch (err) {
        const isUniqueViolation =
          typeof err === 'object' &&
          err !== null &&
          (err as { code?: string }).code === 'P2002';
        if (!isUniqueViolation || attempt === 4) throw err;
      }
    }
    throw new ConflictException(
      'Could not generate a unique access code, try again',
    );
  }

  async revokeFieldAccessCode(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    await this.prisma.user.update({
      where: { id },
      data: { fieldAccessCode: null, fieldAccessCodeIssuedAt: null },
    });

    return { revoked: true };
  }
}
