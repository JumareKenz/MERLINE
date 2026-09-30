import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { BaseService } from '../common/base/base.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { FIELD_ROLE_SLUG } from '../common/scoping/field-scope';
import { provisionOrganizationRoles } from '../auth/organization-provisioning';
import {
  ACCESS_CODE_ALPHABET,
  accessCodeState,
  formatAccessCode,
  generateAccessCode,
  hashAccessCode,
} from './access-code';
import {
  CreateEnumeratorDto,
  ListEnumeratorsQuery,
  UpdateEnumeratorDto,
} from './dto/enumerator.dto';

/** Enumerators without an email get an address on this never-routable domain. */
export const FIELD_EMAIL_DOMAIN = 'field.merline.invalid';

/** Transcripts the enumerator still has to act on. */
const AWAITING_ENUMERATOR = [
  'AVAILABLE_FOR_REVIEW',
  'ENUMERATOR_EDITING',
  'RETURNED_FOR_CORRECTION',
] as const;
const APPROVED = ['APPROVED', 'LOCKED'] as const;

export function splitName(fullName: string): [string, string] {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  return [parts[0], parts.slice(1).join(' ')];
}

/** Keeps a leading + and digits so the same number written two ways collides. */
export function normalizePhone(phone: string): string {
  const plus = phone.trim().startsWith('+') ? '+' : '';
  return plus + phone.replace(/\D/g, '');
}

function generateUniqueId(): string {
  const body = Array.from(
    { length: 6 },
    () => ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)],
  ).join('');
  return `ENU-${body}`;
}

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  fieldAccessCode: true,
  enumeratorProfile: true,
  fieldAccessCodes: { orderBy: { issuedAt: 'desc' as const }, take: 1 },
  projectTeams: {
    where: { project: { deletedAt: null }, role: 'field' },
    select: { project: { select: { id: true, name: true, status: true } } },
  },
} satisfies Prisma.UserSelect;

type EnumeratorRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class EnumeratorsService extends BaseService {
  constructor(
    prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {
    super(prisma);
  }

  // ─── Reading ──────────────────────────────────────────────────────────

  async list(organizationId: string, query: ListEnumeratorsQuery = {}) {
    const and: Prisma.UserWhereInput[] = [];
    if (query.status) and.push({ isActive: query.status === 'active' });
    if (query.projectId) {
      and.push({
        projectTeams: { some: { projectId: query.projectId, role: 'field' } },
      });
    }
    if (query.state) {
      and.push({
        enumeratorProfile: { state: { equals: query.state, mode: 'insensitive' } },
      });
    }
    if (query.search) {
      const q = query.search;
      and.push({
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { enumeratorProfile: { uniqueId: { contains: q, mode: 'insensitive' } } },
          { enumeratorProfile: { state: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const rows = await this.prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
        roles: { some: { role: { slug: FIELD_ROLE_SLUG, organizationId } } },
        AND: and,
      },
      select: USER_SELECT,
      take: 1000,
    });

    const ids = rows.map((r) => r.id);
    const [interviewStats, lastInterview, transcriptStats, recordingCounts] =
      await Promise.all([
        this.prisma.interview.groupBy({
          by: ['interviewerId'],
          where: { organizationId, deletedAt: null, interviewerId: { in: ids } },
          _count: { _all: true },
        }),
        this.prisma.interview.groupBy({
          by: ['interviewerId'],
          where: { organizationId, deletedAt: null, interviewerId: { in: ids } },
          _max: { updatedAt: true },
        }),
        this.prisma.transcript.findMany({
          where: {
            organizationId,
            interview: { deletedAt: null, interviewerId: { in: ids } },
          },
          select: { reviewStatus: true, interview: { select: { interviewerId: true } } },
        }),
        this.prisma.media.findMany({
          where: {
            organizationId,
            deletedAt: null,
            interview: { deletedAt: null, interviewerId: { in: ids } },
          },
          select: { interview: { select: { interviewerId: true } } },
        }),
      ]);

    const items = rows.map((row) => {
      const view = this.present(row);
      const interviews =
        interviewStats.find((s) => s.interviewerId === row.id)?._count._all ?? 0;
      const lastSubmissionAt =
        lastInterview.find((s) => s.interviewerId === row.id)?._max.updatedAt ?? null;
      const mine = transcriptStats.filter((t) => t.interview.interviewerId === row.id);
      return {
        ...view,
        lastSubmissionAt,
        lastActivityAt: latest(row.lastLoginAt, lastSubmissionAt),
        stats: {
          interviews,
          recordings: recordingCounts.filter((m) => m.interview?.interviewerId === row.id).length,
          transcriptsAwaitingReview: mine.filter((t) =>
            (AWAITING_ENUMERATOR as readonly string[]).includes(t.reviewStatus),
          ).length,
          transcriptsApproved: mine.filter((t) =>
            (APPROVED as readonly string[]).includes(t.reviewStatus),
          ).length,
        },
      };
    });

    const filtered = query.codeStatus
      ? items.filter((i) => i.accessCode.state === query.codeStatus)
      : items;

    const dir = query.sortOrder === 'desc' ? -1 : 1;
    const key = query.sortBy ?? 'name';
    filtered.sort((a, b) => {
      let cmp = 0;
      if (key === 'name') cmp = a.fullName.localeCompare(b.fullName);
      else if (key === 'state') cmp = (a.state ?? '').localeCompare(b.state ?? '');
      else if (key === 'createdAt') cmp = a.createdAt.getTime() - b.createdAt.getTime();
      else cmp = (a.lastActivityAt?.getTime() ?? 0) - (b.lastActivityAt?.getTime() ?? 0);
      return cmp * dir || a.fullName.localeCompare(b.fullName);
    });
    return filtered;
  }

  async get(id: string, organizationId: string) {
    const row = await this.require(id, organizationId);
    const view = this.present(row);

    const interviews = await this.prisma.interview.findMany({
      where: { organizationId, interviewerId: id, deletedAt: null },
      select: {
        id: true,
        type: true,
        status: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
        participant: { select: { displayName: true } },
        project: { select: { name: true } },
        recordings: { where: { deletedAt: null }, select: { id: true } },
        transcripts: { select: { id: true, reviewStatus: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const transcripts = interviews.flatMap((i) => i.transcripts);
    const count = (list: readonly string[]) =>
      transcripts.filter((t) => list.includes(t.reviewStatus)).length;

    const reports = await this.prisma.analysisReport.count({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { interviewId: { in: interviews.map((i) => i.id) } },
          { sources: { some: { interviewId: { in: interviews.map((i) => i.id) } } } },
        ],
      },
    });

    const events = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        auditableType: 'Enumerator',
        auditableId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, event: true, createdAt: true, newValues: true },
    });

    const perProject = new Map<string, number>();
    for (const i of interviews) {
      if (i.projectId) perProject.set(i.projectId, (perProject.get(i.projectId) ?? 0) + 1);
    }

    return {
      ...view,
      projects: view.projects.map((p) => ({ ...p, interviews: perProject.get(p.id) ?? 0 })),
      completedProjects: view.projects.filter((p) => p.status === 'completed'),
      summary: {
        interviews: interviews.length,
        pendingSubmissions: interviews.filter(
          (i) => i.status !== 'CANCELLED' && i.recordings.length === 0,
        ).length,
        recordingsSubmitted: interviews.reduce((n, i) => n + i.recordings.length, 0),
        transcriptsAwaitingEnumerator: count(AWAITING_ENUMERATOR),
        transcriptsAwaitingAdmin: count(['SUBMITTED_FOR_ADMIN_REVIEW']),
        transcriptsApproved: count(APPROVED),
        reports,
      },
      lastActivityAt: latest(row.lastLoginAt, interviews[0]?.updatedAt ?? null),
      recentActivity: [
        ...interviews.slice(0, 10).map((i) => ({
          kind: 'interview' as const,
          at: i.updatedAt,
          label: `${i.type ?? 'Interview'} with ${i.participant.displayName}`,
          detail: i.project?.name ?? null,
        })),
        ...events.map((e) => ({
          kind: 'account' as const,
          at: e.createdAt,
          label: e.event,
          detail: null,
        })),
      ]
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, 15),
    };
  }

  /** Recordings and transcripts this enumerator submitted, newest first. */
  async submissions(
    id: string,
    organizationId: string,
    filter: { type?: string; projectId?: string } = {},
  ) {
    await this.require(id, organizationId);
    const interviews = await this.prisma.interview.findMany({
      where: {
        organizationId,
        interviewerId: id,
        deletedAt: null,
        ...(filter.type && { type: filter.type }),
        ...(filter.projectId && { projectId: filter.projectId }),
      },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        participant: { select: { displayName: true } },
        project: { select: { id: true, name: true } },
        recordings: {
          where: { deletedAt: null },
          select: { id: true, originalName: true, size: true, createdAt: true },
        },
        transcripts: {
          select: { id: true, status: true, reviewStatus: true, updatedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return interviews;
  }

  // ─── Creating and editing ─────────────────────────────────────────────

  /**
   * One transaction: the account, the enumerator profile, project
   * assignments and the first access code. The code is returned here and
   * never again.
   */
  async create(dto: CreateEnumeratorDto, organizationId: string, actorId: string) {
    const phone = normalizePhone(dto.phone);
    await this.assertUnique(organizationId, { email: dto.email, phone });
    const projectIds = [...new Set(dto.projectIds ?? [])];
    await this.assertProjects(projectIds, organizationId);

    const roles = await provisionOrganizationRoles(this.prisma, organizationId);
    const fieldRoleId = roles.get(FIELD_ROLE_SLUG) as string;
    // Unusable password: enumerators sign in with a code, never a password.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const [firstName, lastName] = splitName(dto.fullName);
    const email =
      dto.email?.toLowerCase() ??
      `enumerator-${randomBytes(6).toString('hex')}@${FIELD_EMAIL_DOMAIN}`;

    try {
      const result = await this.executeTransaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, firstName, lastName, phone, passwordHash, organizationId },
        });
        await tx.roleUser.create({ data: { userId: user.id, roleId: fieldRoleId } });

        let uniqueId = generateUniqueId();
        for (let i = 0; i < 10; i++) {
          const clash = await tx.enumeratorProfile.findFirst({
            where: { organizationId, uniqueId },
            select: { id: true },
          });
          if (!clash) break;
          uniqueId = generateUniqueId();
        }
        await tx.enumeratorProfile.create({
          data: { userId: user.id, organizationId, uniqueId, state: dto.state },
        });
        if (projectIds.length) {
          await tx.projectTeam.createMany({
            data: projectIds.map((projectId) => ({
              projectId,
              userId: user.id,
              role: 'field',
            })),
          });
        }
        const issued = await this.issueCodeIn(tx, user.id, organizationId, actorId, {
          validDays: dto.codeValidDays,
          reason: null,
        });
        return { user, uniqueId, issued };
      });

      await this.audit.log({
        event: 'enumerator.created',
        auditableType: 'Enumerator',
        auditableId: result.user.id,
        userId: actorId,
        organizationId,
        newValues: { uniqueId: result.uniqueId, projects: projectIds.length },
      });
      return {
        id: result.user.id,
        uniqueId: result.uniqueId,
        // Shown once. Not retrievable afterwards.
        accessCode: {
          code: formatAccessCode(result.issued.code),
          expiresAt: result.issued.expiresAt,
        },
      };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('An enumerator with these details already exists');
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateEnumeratorDto,
    organizationId: string,
    actorId: string,
  ) {
    const row = await this.require(id, organizationId);
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;
    await this.assertUnique(
      organizationId,
      {
        email: dto.email && dto.email.toLowerCase() !== row.email ? dto.email : undefined,
        phone: phone && phone !== row.phone ? phone : undefined,
      },
      id,
    );
    const name = dto.fullName ? splitName(dto.fullName) : null;

    await this.executeTransaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(name && { firstName: name[0], lastName: name[1] }),
          ...(dto.email && { email: dto.email.toLowerCase() }),
          ...(phone && { phone }),
        },
      });
      if (dto.state !== undefined || dto.notes !== undefined) {
        await tx.enumeratorProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            organizationId,
            uniqueId: generateUniqueId(),
            state: dto.state,
            notes: dto.notes,
          },
          update: {
            ...(dto.state !== undefined && { state: dto.state }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
          },
        });
      }
    });
    await this.audit.log({
      event: 'enumerator.updated',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
      newValues: { fields: Object.keys(dto) },
    });
    return this.get(id, organizationId);
  }

  /** Deactivating also ends every session the enumerator has open. */
  async setActive(id: string, isActive: boolean, organizationId: string, actorId: string) {
    await this.require(id, organizationId);
    await this.prisma.user.update({
      where: { id },
      data: { isActive, ...(!isActive && { tokenVersion: { increment: 1 } }) },
    });
    await this.audit.log({
      event: isActive ? 'enumerator.activated' : 'enumerator.deactivated',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
    });
    return this.get(id, organizationId);
  }

  // ─── Project assignment ───────────────────────────────────────────────

  async setProjects(id: string, projectIds: string[], organizationId: string, actorId: string) {
    await this.require(id, organizationId);
    const unique = [...new Set(projectIds)];
    await this.assertProjects(unique, organizationId);
    await this.executeTransaction(async (tx) => {
      await tx.projectTeam.deleteMany({
        where: { userId: id, role: 'field', project: { organizationId }, projectId: { notIn: unique } },
      });
      if (unique.length) {
        await tx.projectTeam.createMany({
          data: unique.map((projectId) => ({ projectId, userId: id, role: 'field' })),
          skipDuplicates: true,
        });
      }
    });
    await this.audit.log({
      event: 'enumerator.projects_set',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
      newValues: { projectIds: unique },
    });
    return this.get(id, organizationId);
  }

  async assignProject(id: string, projectId: string, organizationId: string, actorId: string) {
    await this.require(id, organizationId);
    await this.assertProjects([projectId], organizationId);
    await this.prisma.projectTeam.upsert({
      where: { projectId_userId: { projectId, userId: id } },
      create: { projectId, userId: id, role: 'field' },
      update: {},
    });
    await this.audit.log({
      event: 'enumerator.project_assigned',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
      newValues: { projectId },
    });
    return this.get(id, organizationId);
  }

  async removeProject(id: string, projectId: string, organizationId: string, actorId: string) {
    await this.require(id, organizationId);
    await this.prisma.projectTeam.deleteMany({
      where: { userId: id, projectId, role: 'field', project: { organizationId } },
    });
    await this.audit.log({
      event: 'enumerator.project_removed',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
      newValues: { projectId },
    });
    return this.get(id, organizationId);
  }

  // ─── Access codes ─────────────────────────────────────────────────────

  /**
   * Issues a new code. Any earlier code (personal or a legacy shared one)
   * stops working at once and every phone signed in with it is signed out.
   */
  async issueCode(
    id: string,
    organizationId: string,
    actorId: string,
    validDays?: number,
  ) {
    const row = await this.require(id, organizationId);
    const hadCode = row.fieldAccessCodes.length > 0 || Boolean(row.fieldAccessCode);
    try {
      const issued = await this.executeTransaction((tx) =>
        this.issueCodeIn(tx, id, organizationId, actorId, {
          validDays,
          reason: 'Replaced by a new code',
        }),
      );
      await this.audit.log({
        event: hadCode ? 'enumerator.access_code_regenerated' : 'enumerator.access_code_issued',
        auditableType: 'Enumerator',
        auditableId: id,
        userId: actorId,
        organizationId,
      });
      return {
        code: formatAccessCode(issued.code),
        issuedAt: issued.issuedAt,
        expiresAt: issued.expiresAt,
      };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A code was just issued for this enumerator; refresh and try again');
      }
      throw err;
    }
  }

  async revokeCode(id: string, organizationId: string, actorId: string, reason?: string) {
    const row = await this.require(id, organizationId);
    const active = row.fieldAccessCodes.find((c) => c.status === 'ACTIVE');
    if (!active && !row.fieldAccessCode) {
      throw new ConflictException('This enumerator has no active access code');
    }
    await this.executeTransaction(async (tx) => {
      await tx.fieldAccessCode.updateMany({
        where: { userId: id, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedById: actorId,
          revokedReason: reason ?? null,
        },
      });
      await tx.user.update({
        where: { id },
        data: { fieldAccessCode: null, fieldAccessCodeIssuedAt: null, tokenVersion: { increment: 1 } },
      });
    });
    await this.audit.log({
      event: 'enumerator.access_code_revoked',
      auditableType: 'Enumerator',
      auditableId: id,
      userId: actorId,
      organizationId,
      newValues: { reason: reason ?? null },
    });
    return this.get(id, organizationId);
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private async issueCodeIn(
    tx: Prisma.TransactionClient | Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    userId: string,
    organizationId: string,
    actorId: string,
    opts: { validDays?: number; reason: string | null },
  ) {
    const db = tx as Prisma.TransactionClient;
    const now = new Date();
    await db.fieldAccessCode.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: now, revokedById: actorId, revokedReason: opts.reason },
    });
    const expiresAt = opts.validDays
      ? new Date(now.getTime() + opts.validDays * 24 * 3600_000)
      : null;

    // A collision of two random 49-bit codes is astronomically unlikely, but
    // codeHash is unique, so a clash would fail loudly rather than share a code.
    const code = generateAccessCode();
    await db.fieldAccessCode.create({
      data: {
        organizationId,
        userId,
        codeHash: hashAccessCode(code),
        issuedAt: now,
        issuedById: actorId,
        expiresAt,
      },
    });
    // Replaced codes end existing sessions; any legacy shared code is retired.
    await db.user.update({
      where: { id: userId },
      data: { fieldAccessCode: null, fieldAccessCodeIssuedAt: null, tokenVersion: { increment: 1 } },
    });
    return { code, issuedAt: now, expiresAt };
  }

  private async require(id: string, organizationId: string): Promise<EnumeratorRow> {
    const row = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        roles: { some: { role: { slug: FIELD_ROLE_SLUG, organizationId } } },
      },
      select: USER_SELECT,
    });
    if (!row) throw new NotFoundException('Enumerator not found');
    return row;
  }

  private present(row: EnumeratorRow) {
    const latestCode = row.fieldAccessCodes[0] ?? null;
    const legacyShared = Boolean(row.fieldAccessCode);
    const state = legacyShared
      ? row.lastLoginAt
        ? 'ACTIVE'
        : 'UNUSED'
      : accessCodeState(latestCode);
    return {
      id: row.id,
      fullName: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email.endsWith(`@${FIELD_EMAIL_DOMAIN}`) ? null : row.email,
      phone: row.phone,
      state: row.enumeratorProfile?.state ?? null,
      uniqueId: row.enumeratorProfile?.uniqueId ?? null,
      notes: row.enumeratorProfile?.notes ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      // Never the code itself, nor its hash.
      accessCode: {
        state: state as ReturnType<typeof accessCodeState>,
        issuedAt: legacyShared ? null : (latestCode?.issuedAt ?? null),
        expiresAt: legacyShared ? null : (latestCode?.expiresAt ?? null),
        lastUsedAt: legacyShared ? row.lastLoginAt : (latestCode?.lastUsedAt ?? null),
        revokedAt: latestCode?.status === 'REVOKED' ? latestCode.revokedAt : null,
        /** An older 4-character code that several people may share. */
        legacyShared,
      },
      projects: row.projectTeams.map((t) => t.project),
    };
  }

  private async assertUnique(
    organizationId: string,
    fields: { email?: string; phone?: string },
    exceptUserId?: string,
  ) {
    if (fields.email) {
      const clash = await this.prisma.user.findFirst({
        where: {
          email: { equals: fields.email, mode: 'insensitive' },
          ...(exceptUserId && { id: { not: exceptUserId } }),
        },
        select: { id: true },
      });
      // The same message whether it is here or in another organization.
      if (clash) throw new ConflictException('An account with this email address already exists');
    }
    if (fields.phone) {
      const clash = await this.prisma.user.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          phone: fields.phone,
          ...(exceptUserId && { id: { not: exceptUserId } }),
          roles: { some: { role: { slug: FIELD_ROLE_SLUG, organizationId } } },
        },
        select: { id: true },
      });
      if (clash) throw new ConflictException('An enumerator with this phone number already exists');
    }
  }

  private async assertProjects(projectIds: string[], organizationId: string) {
    if (!projectIds.length) return;
    const found = await this.prisma.project.count({
      where: { id: { in: projectIds }, organizationId, deletedAt: null },
    });
    if (found !== projectIds.length) {
      throw new BadRequestException('One or more projects were not found');
    }
  }
}

function latest(...dates: (Date | null)[]): Date | null {
  const real = dates.filter((d): d is Date => d != null);
  return real.length ? new Date(Math.max(...real.map((d) => d.getTime()))) : null;
}
