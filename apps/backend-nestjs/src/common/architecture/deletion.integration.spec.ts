/**
 * Deletion is a move to the Trash, administrators only, and reversible:
 *
 *   - Deleting a project takes its interviews, participants and reports
 *     with it; restoring it brings back exactly those, not an interview
 *     that had been deleted on its own before.
 *   - An interview cannot be restored while its project is in the Trash.
 *   - A deleted user loses access at once (sign-in, field code, sessions),
 *     cannot be the last administrator or the person deleting, and can be
 *     restored.
 *   - Consent records are never deleted.
 */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthService } from '../../auth/auth.service';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';
import { ProjectsService } from '../../projects/projects.service';
import { TrashService } from '../../trash/trash.service';
import { UsersService } from '../../users/users.service';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('deletion and the Trash (database)', () => {
  const prisma = new PrismaClient();
  const orgId = randomUUID();
  const adminId = randomUUID();
  const staffId = randomUUID();
  const tag = orgId.slice(0, 8);
  const projects = new ProjectsService(prisma as any);
  const trash = new TrashService(prisma as any);
  const users = new UsersService(prisma as any);
  const auth = new AuthService(
    prisma as any,
    new JwtService({ secret: 'test-secret' }),
    new ConfigService({ jwt: { secret: 'test-secret', expiresIn: '1h' } }),
  );

  async function interviewIn(projectId: string | null, name: string) {
    const participant = await prisma.participant.create({
      data: {
        displayName: name,
        organizationId: orgId,
        projectId,
        createdById: adminId,
      },
    });
    const consent = await prisma.consent.create({
      data: {
        participantId: participant.id,
        organizationId: orgId,
        version: 'v1',
        method: 'VERBAL',
        allowRecording: true,
        actorId: adminId,
      },
    });
    const interview = await prisma.interview.create({
      data: {
        participantId: participant.id,
        consentId: consent.id,
        projectId,
        interviewerId: adminId,
        organizationId: orgId,
      },
    });
    return { participant, consent, interview };
  }

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: orgId, name: `Del ${tag}`, slug: `del-${tag}` },
    });
    const passwordHash = await bcrypt.hash('Correct-Horse-9', 4);
    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          email: `del-admin-${tag}@t.test`,
          passwordHash,
          firstName: 'Ada',
          lastName: 'Admin',
          organizationId: orgId,
        },
        {
          id: staffId,
          email: `del-staff-${tag}@t.test`,
          passwordHash,
          firstName: 'Sam',
          lastName: 'Staff',
          organizationId: orgId,
          fieldAccessCode:
            `DEL${tag.slice(0, 2)}-${tag.slice(2, 7)}`.toUpperCase(),
        },
      ],
    });
    const roles = await provisionOrganizationRoles(prisma, orgId);
    await prisma.roleUser.create({
      data: { userId: adminId, roleId: roles.get('administrator')! },
    });
  });

  afterAll(async () => {
    const where = { organizationId: orgId };
    await prisma.analysisReport.deleteMany({ where });
    await prisma.interview.deleteMany({ where });
    await prisma.consent.deleteMany({ where });
    await prisma.participant.deleteMany({ where });
    await prisma.project.deleteMany({ where });
    await prisma.roleUser.deleteMany({ where: { role: where } });
    await prisma.permissionRole.deleteMany({ where: { role: where } });
    await prisma.permission.deleteMany({ where });
    await prisma.role.deleteMany({ where });
    await prisma.user.deleteMany({ where });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('moves a project to the Trash with its interviews, and restores exactly those', async () => {
    const project = await prisma.project.create({
      data: { name: 'Water', organizationId: orgId, createdById: adminId },
    });
    const a = await interviewIn(project.id, 'A');
    const b = await interviewIn(project.id, 'B');
    // Deleted on its own earlier: must stay deleted when the project comes back.
    await prisma.interview.update({
      where: { id: b.interview.id },
      data: { deletedAt: new Date(Date.now() - 60_000) },
    });
    await prisma.analysisReport.create({
      data: {
        scope: 'PROJECT',
        title: 'R',
        projectId: project.id,
        organizationId: orgId,
        requestedById: adminId,
      },
    });

    await projects.remove(project.id, orgId);

    const items = await trash.list(orgId);
    expect(items.map((i) => i.type)).toEqual(
      expect.arrayContaining(['project', 'interview', 'participant', 'report']),
    );
    await expect(
      trash.restore('interview', a.interview.id, orgId),
    ).rejects.toThrow(/Restore the project/);

    await trash.restore('project', project.id, orgId);
    const [ia, ib, report, consents] = await Promise.all([
      prisma.interview.findUniqueOrThrow({ where: { id: a.interview.id } }),
      prisma.interview.findUniqueOrThrow({ where: { id: b.interview.id } }),
      prisma.analysisReport.findFirstOrThrow({
        where: { projectId: project.id },
      }),
      prisma.consent.count({
        where: { id: { in: [a.consent.id, b.consent.id] } },
      }),
    ]);
    expect(ia.deletedAt).toBeNull();
    expect(ib.deletedAt).not.toBeNull();
    expect(report.deletedAt).toBeNull();
    expect(consents).toBe(2); // consent records are never deleted
  });

  it('refuses to delete yourself or the last administrator', async () => {
    await expect(users.delete(adminId, orgId, adminId)).rejects.toThrow(
      /your own account/,
    );
    await expect(users.delete(adminId, orgId, staffId)).rejects.toThrow(
      /only administrator/,
    );
  });

  it("ends a deleted user's access at once, and restores it from the Trash", async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
    });
    await auth.login({ email: before.email, password: 'Correct-Horse-9' });

    await users.delete(staffId, orgId, adminId);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
    });
    expect(after.fieldAccessCode).toBeNull();
    expect(after.tokenVersion).toBe(before.tokenVersion + 1); // existing sessions invalid
    await expect(
      auth.login({ email: before.email, password: 'Correct-Horse-9' }),
    ).rejects.toThrow(/Invalid email or password/);
    await expect(
      auth.fieldLogin({ code: before.fieldAccessCode! } as any),
    ).rejects.toThrow();

    await trash.restore('user', staffId, orgId);
    await expect(
      auth.login({ email: before.email, password: 'Correct-Horse-9' }),
    ).resolves.toBeDefined();
  });
});
