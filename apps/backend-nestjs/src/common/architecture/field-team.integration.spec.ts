/**
 * Field teams and on-site interviews (database).
 *
 *   - An admin creates a named access code for one or more projects in one
 *     step; the account behind it gets a reserved address that is never
 *     shown, and the code can be read back and the name changed.
 *   - Several enumerators can use one code; each interview records who
 *     conducted it, and the code's list shows them.
 *   - A field worker sees and starts interviews only in assigned projects.
 *   - POST /field/interviews creates participant + consent + interview
 *     together, idempotently, with the device's consent time (bounded).
 *   - Project team/tag routes are tenant-scoped.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FieldService } from '../../field/field.service';
import {
  FieldTeamService,
  FIELD_EMAIL_DOMAIN,
} from '../../field/field-team.service';
import { UsersService } from '../../users/users.service';
import { ProjectsService } from '../../projects/projects.service';
import { ProjectTeamsService } from '../../projects/project-teams.service';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('field team and on-site interviews (database)', () => {
  const prisma = new PrismaClient();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  const adminId = randomUUID();
  const otherUserId = randomUUID();
  let projectA: string;
  let projectB: string;
  let foreignProject: string;

  const field = new FieldService(prisma as any);
  const team = new FieldTeamService(
    prisma as any,
    new UsersService(prisma as any),
  );
  const projects = new ProjectsService(prisma as any);
  const projectTeams = new ProjectTeamsService(prisma as any);

  function consent(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      version: 'v1',
      method: 'VERBAL' as const,
      allowRecording: true,
      allowTranscription: true,
      allowAiAnalysis: false,
      allowQuotation: true,
      allowPublication: false,
      capturedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeAll(async () => {
    const tag = orgId.slice(0, 8);
    await prisma.organization.createMany({
      data: [
        { id: orgId, name: `FT ${tag}`, slug: `ft-${tag}` },
        { id: otherOrgId, name: `FT2 ${tag}`, slug: `ft2-${tag}` },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          email: `ft-admin-${tag}@t.test`,
          passwordHash: 'x',
          firstName: 'A',
          lastName: 'D',
          organizationId: orgId,
        },
        {
          id: otherUserId,
          email: `ft-other-${tag}@t.test`,
          passwordHash: 'x',
          firstName: 'O',
          lastName: 'U',
          organizationId: otherOrgId,
        },
      ],
    });
    await provisionOrganizationRoles(prisma, orgId);
    const mk = (name: string, org: string, by: string) =>
      prisma.project
        .create({ data: { name, organizationId: org, createdById: by } })
        .then((p) => p.id);
    projectA = await mk('A', orgId, adminId);
    projectB = await mk('B', orgId, adminId);
    foreignProject = await mk('X', otherOrgId, otherUserId);
  });

  afterAll(async () => {
    const where = { organizationId: { in: [orgId, otherOrgId] } };
    await prisma.interview.deleteMany({ where });
    await prisma.consent.deleteMany({ where });
    await prisma.participant.deleteMany({ where });
    await prisma.projectTeam.deleteMany({ where: { project: where } });
    await prisma.project.deleteMany({ where });
    await prisma.roleUser.deleteMany({ where: { role: where } });
    await prisma.permissionRole.deleteMany({ where: { role: where } });
    await prisma.permission.deleteMany({ where });
    await prisma.role.deleteMany({ where });
    await prisma.user.deleteMany({ where });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it('creates a named 4-character access code for projects; hides the reserved email', async () => {
    const created = await team.create(
      { name: 'Kano team A', projectIds: [projectA, projectB] },
      orgId,
    );
    expect(created.code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/);
    expect(created.name).toBe('Kano team A');

    const row = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(row.email.endsWith(`@${FIELD_EMAIL_DOMAIN}`)).toBe(true);

    const listed = (await team.list(orgId)).find((w) => w.id === created.id)!;
    expect(listed.email).toBeNull();
    expect(listed.name).toBe('Kano team A');
    expect(listed.projects.map((p) => p.id).sort()).toEqual(
      [projectA, projectB].sort(),
    );
    expect(listed.accessCodeIssuedAt).toBeTruthy();
    expect(listed).not.toHaveProperty('code');

    // Managers can read the code back and rename it.
    expect((await team.code(created.id, orgId)).code).toBe(created.code);
    await expect(team.code(created.id, otherOrgId)).rejects.toThrow(
      /not found/i,
    );
    const renamed = await team.rename(created.id, 'Kano team B', orgId);
    expect(renamed?.name).toBe('Kano team B');

    await expect(
      team.create({ name: 'X', projectIds: [foreignProject] }, orgId),
    ).rejects.toThrow(/projects were not found/i);
  });

  it('scopes projects and on-site interviews to the worker’s assignments', async () => {
    const worker = await team.create(
      { name: 'B team', projectIds: [projectA] },
      orgId,
    );

    expect((await field.myProjects(worker.id, orgId)).map((p) => p.id)).toEqual(
      [projectA],
    );
    const listed = await projects.findAll({
      organizationId: orgId,
      viewerId: worker.id,
    });
    expect(listed.items.map((p) => p.id)).toEqual([projectA]);
    await expect(projects.findById(projectB, orgId, worker.id)).rejects.toThrow(
      /not found/i,
    );
    // Admins still see everything.
    expect(
      (await field.myProjects(adminId, orgId)).map((p) => p.id).sort(),
    ).toEqual([projectA, projectB].sort());

    const ids = {
      interviewId: randomUUID(),
      participantId: randomUUID(),
      consentId: randomUUID(),
    };
    await expect(
      field.createFieldInterview(
        {
          ...ids,
          projectId: projectB,
          participant: { displayName: 'P-1' },
          consent: consent(),
        },
        worker.id,
        orgId,
      ),
    ).rejects.toThrow(/not assigned to this project/i);

    const body = {
      ...ids,
      projectId: projectA,
      participant: { displayName: 'P-1' },
      consent: consent(),
      location: 'Ward 4',
    };
    const interview = await field.createFieldInterview(body, worker.id, orgId);
    expect(interview).toMatchObject({
      id: ids.interviewId,
      status: 'IN_PROGRESS',
      interviewerId: worker.id,
      projectId: projectA,
    });
    expect(interview.consent.allowRecording).toBe(true);

    // Re-sent after a dropped response: same interview, nothing duplicated.
    const again = await field.createFieldInterview(body, worker.id, orgId);
    expect(again.id).toBe(ids.interviewId);
    expect(
      await prisma.participant.count({ where: { id: ids.participantId } }),
    ).toBe(1);

    // Another user cannot claim the same ids.
    await expect(
      field.createFieldInterview(body, adminId, orgId),
    ).rejects.toThrow(/already in use/i);

    await expect(
      field.createFieldInterview(
        {
          interviewId: randomUUID(),
          participantId: randomUUID(),
          consentId: randomUUID(),
          projectId: projectA,
          participant: { displayName: 'P-2' },
          consent: consent({
            capturedAt: new Date(Date.now() + 3600_000).toISOString(),
          }),
        },
        worker.id,
        orgId,
      ),
    ).rejects.toThrow(/date and time/i);

    await team.setProjects(worker.id, [projectB], orgId);
    expect((await field.myProjects(worker.id, orgId)).map((p) => p.id)).toEqual(
      [projectB],
    );
  });

  it('lets several enumerators share one code and records who conducted each interview', async () => {
    const shared = await team.create(
      { name: 'Shared team', projectIds: [projectA] },
      orgId,
    );
    const start = (enumeratorName?: string) =>
      field.createFieldInterview(
        {
          interviewId: randomUUID(),
          participantId: randomUUID(),
          consentId: randomUUID(),
          projectId: projectA,
          participant: { displayName: `P-${randomUUID().slice(0, 4)}` },
          consent: consent(),
          ...(enumeratorName !== undefined && { enumeratorName }),
        },
        shared.id,
        orgId,
      );
    const a = await start('  Musa Bello ');
    await start('Musa Bello');
    await start('Hauwa Sani');
    // An interview queued offline by an older app version has no name.
    const legacy = await start();

    const stored = await prisma.interview.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(stored.enumeratorName).toBe('Musa Bello');
    expect(stored.interviewerId).toBe(shared.id);
    expect(
      (await prisma.interview.findUniqueOrThrow({ where: { id: legacy.id } }))
        .enumeratorName,
    ).toBeNull();

    const listed = (await team.list(orgId)).find((w) => w.id === shared.id)!;
    expect(listed.interviews.total).toBe(4);
    expect(listed.enumerators).toEqual([
      { name: 'Musa Bello', interviews: 2 },
      { name: 'Hauwa Sani', interviews: 1 },
    ]);
  });

  it('keeps project teams inside the tenant', async () => {
    await expect(
      projectTeams.findByProject(foreignProject, orgId),
    ).rejects.toThrow(/not found/i);
    await expect(
      projectTeams.addMember(projectA, otherUserId, orgId),
    ).rejects.toThrow(/user not found/i);
  });
});
