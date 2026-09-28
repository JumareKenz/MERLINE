import {
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
import { CreateAccessCodeDto } from './dto/field-team.dto';

/**
 * Field workers without an email of their own get an address on this
 * reserved, never-routable domain. It only satisfies the unique email
 * column; they sign in with their access code, never a password.
 */
export const FIELD_EMAIL_DOMAIN = 'field.merline.invalid';

/**
 * PHASE 2 — access codes for the field app. Each code is a field account
 * (a User with the field-interviewer role) named for a team, a place or a
 * person; the projects it is assigned to (one, several or all) decide
 * where interviews can be started. Any number of enumerators can sign in
 * with the same code; each interview records who conducted it
 * (Interview.enumeratorName). Assignment is ProjectTeam membership with
 * role "field".
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

    const byEnumerator = await this.prisma.interview.groupBy({
      by: ['interviewerId', 'enumeratorName'],
      where: {
        organizationId,
        deletedAt: null,
        interviewerId: { in: users.map((u) => u.id) },
        enumeratorName: { not: null },
      },
      _count: { _all: true },
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
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email.endsWith(`@${FIELD_EMAIL_DOMAIN}`) ? null : u.email,
        phone: u.phone,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        accessCodeIssuedAt: u.fieldAccessCodeIssuedAt,
        projects: u.projectTeams.map((t) => t.project),
        // Who has used this code, by the names typed on each interview.
        enumerators: byEnumerator
          .filter((e) => e.interviewerId === u.id && e.enumeratorName)
          .map((e) => ({ name: e.enumeratorName as string, interviews: e._count._all }))
          .sort((a, b) => b.interviews - a.interviews),
        interviews: {
          total: count(),
          inProgress: count('IN_PROGRESS'),
          completed: count('COMPLETED'),
        },
      };
    });
  }

  /**
   * Creates an access code for the projects chosen, in one step: the field
   * account behind it, its project assignments and the code itself.
   */
  async create(dto: CreateAccessCodeDto, organizationId: string) {
    await this.assertProjectsInOrganization(dto.projectIds, organizationId);
    const roles = await provisionOrganizationRoles(this.prisma, organizationId);
    const fieldRoleId = roles.get(FIELD_ROLE_SLUG) as string;

    const email = `field-${randomBytes(6).toString('hex')}@${FIELD_EMAIL_DOMAIN}`;

    // Unusable password: field workers only ever sign in with a code.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    const user = await this.executeTransaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          // The code's name; an access code is not one person.
          firstName: dto.name.trim(),
          lastName: '',
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
      name: user.firstName,
      firstName: user.firstName,
      lastName: user.lastName,
      code,
    };
  }

  /** The code itself, for an administrator to pass on to a new enumerator. */
  async code(userId: string, organizationId: string) {
    await this.requireFieldWorker(userId, organizationId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { fieldAccessCode: true, fieldAccessCodeIssuedAt: true },
    });
    return {
      code: user.fieldAccessCode,
      issuedAt: user.fieldAccessCodeIssuedAt,
    };
  }

  async rename(userId: string, name: string, organizationId: string) {
    await this.requireFieldWorker(userId, organizationId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: name.trim(), lastName: '' },
    });
    return (await this.list(organizationId)).find((w) => w.id === userId);
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
