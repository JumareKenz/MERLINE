import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { FIELD_ROLE_SLUG } from '../common/scoping/field-scope';
import { provisionOrganizationRoles } from '../auth/organization-provisioning';
import { UsersService } from '../users/users.service';
import { CreateFieldWorkerDto } from './dto/field-team.dto';

/**
 * Field workers without an email of their own get an address on this
 * reserved, never-routable domain. It only satisfies the unique email
 * column; they sign in with their access code, never a password.
 */
export const FIELD_EMAIL_DOMAIN = 'field.merline.invalid';

/**
 * PHASE 2 — the field team: who collects interviews, on which projects,
 * and whether they can sign in. One person, one access code; the projects
 * they're assigned to (one, several or all) decide where they can start
 * interviews. Assignment is ProjectTeam membership with role "field".
 */
@Injectable()
export class FieldTeamService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {
    super(prisma);
  }

  async list(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
        roles: { some: { role: { slug: FIELD_ROLE_SLUG, organizationId } } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        fieldAccessCodeIssuedAt: true,
        projectTeams: {
          where: { project: { deletedAt: null } },
          select: {
            project: { select: { id: true, name: true, status: true } },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const stats = await this.prisma.interview.groupBy({
      by: ['interviewerId', 'status'],
      where: {
        organizationId,
        deletedAt: null,
        interviewerId: { in: users.map((u) => u.id) },
      },
      _count: { _all: true },
    });

    return users.map((u) => {
      const mine = stats.filter((s) => s.interviewerId === u.id);
      const count = (status?: string) =>
        mine
          .filter((s) => !status || s.status === status)
          .reduce((sum, s) => sum + s._count._all, 0);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email.endsWith(`@${FIELD_EMAIL_DOMAIN}`) ? null : u.email,
        phone: u.phone,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        accessCodeIssuedAt: u.fieldAccessCodeIssuedAt,
        projects: u.projectTeams.map((t) => t.project),
        interviews: {
          total: count(),
          inProgress: count('IN_PROGRESS'),
          completed: count('COMPLETED'),
        },
      };
    });
  }

  /**
   * Creates the field worker, assigns their projects and issues their
   * access code in one step. The code is returned once, here.
   */
  async create(dto: CreateFieldWorkerDto, organizationId: string) {
    await this.assertProjectsInOrganization(dto.projectIds, organizationId);
    const roles = await provisionOrganizationRoles(this.prisma, organizationId);
    const fieldRoleId = roles.get(FIELD_ROLE_SLUG) as string;

    const email =
      dto.email?.trim().toLowerCase() ||
      `field-${randomBytes(6).toString('hex')}@${FIELD_EMAIL_DOMAIN}`;
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken)
      throw new ConflictException(
        'That email is already used by another account',
      );

    // Unusable password: field workers only ever sign in with a code.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    const user = await this.executeTransaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim() || undefined,
          passwordHash,
          organizationId,
        },
      });
      await tx.roleUser.create({
        data: { userId: created.id, roleId: fieldRoleId },
      });
      if (dto.projectIds.length > 0) {
        await tx.projectTeam.createMany({
          data: [...new Set(dto.projectIds)].map((projectId) => ({
            projectId,
            userId: created.id,
            role: 'field',
          })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    const { code } = await this.usersService.generateFieldAccessCode(
      user.id,
      organizationId,
    );
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      code,
    };
  }

  /** Replaces the set of projects a field worker is assigned to. */
  async setProjects(
    userId: string,
    projectIds: string[],
    organizationId: string,
  ) {
    await this.requireFieldWorker(userId, organizationId);
    const unique = [...new Set(projectIds)];
    await this.assertProjectsInOrganization(unique, organizationId);

    await this.executeTransaction(async (tx) => {
      await tx.projectTeam.deleteMany({
        where: {
          userId,
          project: { organizationId },
          projectId: { notIn: unique },
        },
      });
      if (unique.length > 0) {
        await tx.projectTeam.createMany({
          data: unique.map((projectId) => ({
            projectId,
            userId,
            role: 'field',
          })),
          skipDuplicates: true,
        });
      }
    });
    return (await this.list(organizationId)).find((w) => w.id === userId);
  }

  private async requireFieldWorker(userId: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        roles: { some: { role: { slug: FIELD_ROLE_SLUG, organizationId } } },
      },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Field worker not found');
  }

  private async assertProjectsInOrganization(
    projectIds: string[],
    organizationId: string,
  ) {
    if (projectIds.length === 0) return;
    const unique = [...new Set(projectIds)];
    const found = await this.prisma.project.count({
      where: { id: { in: unique }, organizationId, deletedAt: null },
    });
    if (found !== unique.length) {
      throw new NotFoundException('One or more projects were not found');
    }
  }
}
