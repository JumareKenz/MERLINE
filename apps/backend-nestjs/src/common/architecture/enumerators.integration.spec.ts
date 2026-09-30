/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await -- supertest response bodies are untyped JSON */
/**
 * Enumerator management, personal access codes and access isolation —
 * through the real application (AppModule, guards, DTO validation, JWTs).
 *
 * Runs only with RUN_DB_TESTS=1 and DATABASE_URL (a test database).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { jwtSignOptions } from '../../auth/jwt.constants';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';
import { FieldLoginLimiter } from '../../auth/field-login-limiter';
import { AuthService } from '../../auth/auth.service';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { generateAccessCode } from '../../enumerators/access-code';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('enumerator management and access codes (application)', () => {
  const prisma = new PrismaClient();
  const run = randomUUID().slice(0, 8);
  const orgA = randomUUID();
  const orgB = randomUUID();
  const adminA = randomUUID();
  const adminB = randomUUID();
  const viewerA = randomUUID();
  let projectA: string;
  let projectB: string;
  let foreignProject: string;
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let auth: AuthService;
  let limiter: FieldLoginLimiter;
  let phoneSeq = 0;

  const phone = () =>
    `+23480${String(30000000 + ++phoneSeq * 7919).slice(0, 8)}`;
  const sign = (id: string, org: string, tkn = 0) =>
    jwt.sign(
      { sub: id, email: `${id}@t.test`, orgId: org, tkn },
      process.env.JWT_SECRET ?? 'test-secret',
      jwtSignOptions('7d'),
    );
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  let adminToken: string;
  let adminBToken: string;
  let viewerToken: string;

  async function createEnumerator(over: Record<string, unknown> = {}) {
    const res = await http
      .post('/api/v1/enumerators')
      .set(bearer(adminToken))
      .send({
        fullName: `Amina Yusuf ${run}`.replace(/\d|[a-f]/g, (c) =>
          /[a-f]/.test(c) ? c : '',
        ),
        phone: phone(),
        state: 'Kano',
        projectIds: [projectA],
        ...over,
      });
    return res;
  }
  const data = (res: request.Response) => res.body.data;

  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: orgA, name: `Enum A ${run}`, slug: `enum-a-${run}` },
        { id: orgB, name: `Enum B ${run}`, slug: `enum-b-${run}` },
      ],
    });
    const rolesA = await provisionOrganizationRoles(prisma, orgA);
    const rolesB = await provisionOrganizationRoles(prisma, orgB);
    await prisma.user.createMany({
      data: [adminA, adminB, viewerA].map((id) => ({
        id,
        email: `${id}@t.test`,
        passwordHash: 'x',
        firstName: 'T',
        lastName: 'User',
        organizationId: id === adminB ? orgB : orgA,
      })),
    });
    await prisma.roleUser.createMany({
      data: [
        { userId: adminA, roleId: rolesA.get('administrator') as string },
        { userId: adminB, roleId: rolesB.get('administrator') as string },
        { userId: viewerA, roleId: rolesA.get('viewer') as string },
      ],
    });
    const mk = async (name: string, org: string, by: string) =>
      (
        await prisma.project.create({
          data: { name, organizationId: org, createdById: by },
        })
      ).id;
    projectA = await mk('Water A', orgA, adminA);
    projectB = await mk('Water B', orgA, adminA);
    foreignProject = await mk('Foreign', orgB, adminB);
    adminToken = sign(adminA, orgA);
    adminBToken = sign(adminB, orgB);
    viewerToken = sign(viewerA, orgA);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    http = request(app.getHttpServer());
    auth = app.get(AuthService);
    limiter = app.get(FieldLoginLimiter);
  }, 60_000);

  afterAll(async () => {
    const orgs = { in: [orgA, orgB] };
    const users = await prisma.user.findMany({
      where: { organizationId: orgs },
      select: { id: true },
    });
    const userIds = { in: users.map((u) => u.id) };
    await prisma.interviewQuestionLog.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.interview.deleteMany({ where: { organizationId: orgs } });
    await prisma.consent.deleteMany({ where: { organizationId: orgs } });
    await prisma.participant.deleteMany({ where: { organizationId: orgs } });
    await prisma.projectTeam.deleteMany({ where: { userId: userIds } });
    await prisma.fieldAccessCode.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.enumeratorProfile.deleteMany({
      where: { organizationId: orgs },
    });
    await prisma.project.deleteMany({ where: { organizationId: orgs } });
    await prisma.auditLog.deleteMany({
      where: { OR: [{ organizationId: orgs }, { userId: userIds }] },
    });
    await prisma.roleUser.deleteMany({ where: { userId: userIds } });
    await prisma.permissionRole.deleteMany({
      where: { role: { organizationId: orgs } },
    });
    await prisma.role.deleteMany({ where: { organizationId: orgs } });
    await prisma.permission.deleteMany({ where: { organizationId: orgs } });
    await prisma.user.deleteMany({ where: { organizationId: orgs } });
    await prisma.organization.deleteMany({ where: { id: orgs } });
    await app?.close();
    await prisma.$disconnect();
  });

  // ─── creation, validation, secrecy ──────────────────────────────────

  describe('creating an enumerator', () => {
    it('creates the account, profile, assignments and a one-time code together', async () => {
      const res = await createEnumerator({
        fullName: 'Amina Yusuf',
        email: `amina-${run}@example.org`,
      });
      expect(res.status).toBe(201);
      const created = data(res);
      expect(created.uniqueId).toMatch(/^ENU-[A-Z2-9]{6}$/);
      expect(created.accessCode.code).toMatch(
        /^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/,
      );

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          enumeratorProfile: true,
          projectTeams: true,
          roles: { include: { role: true } },
        },
      });
      expect(user.roles.map((r) => r.role.slug)).toEqual(['field-interviewer']);
      expect(user.enumeratorProfile?.state).toBe('Kano');
      expect(user.projectTeams.map((t) => t.projectId)).toEqual([projectA]);
    });

    it('stores only a keyed hash: the code appears in no column and no API response', async () => {
      const res = await createEnumerator({ fullName: 'Binta Sani' });
      const code = data(res).accessCode.code as string;
      const plain = code.replace('-', '');

      const rows = await prisma.$queryRawUnsafe<{ j: string }[]>(
        `select row_to_json(t)::text as j from (
           select u.*, c.code_hash, c.status from users u join field_access_codes c on c.user_id = u.id where u.id = $1
         ) t`,
        data(res).id,
      );
      expect(rows[0].j).not.toContain(plain);
      expect(rows[0].j).not.toContain(code);
      const stored = await prisma.fieldAccessCode.findFirstOrThrow({
        where: { userId: data(res).id },
      });
      expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);

      // Not in the list, the detail or the submissions responses either.
      for (const url of [
        '/api/v1/enumerators',
        `/api/v1/enumerators/${data(res).id}`,
      ]) {
        const body = JSON.stringify(
          (await http.get(url).set(bearer(adminToken)).expect(200)).body,
        );
        expect(body).not.toContain(plain);
        expect(body).not.toContain(stored.codeHash);
        expect(body).not.toMatch(/codeHash|fieldAccessCode"/);
      }
    });

    it('rejects invalid names, emails, phone numbers and missing state', async () => {
      const bad = async (over: Record<string, unknown>) =>
        (await createEnumerator(over)).status;
      expect(await bad({ fullName: '12345' })).toBe(400);
      expect(await bad({ fullName: '' })).toBe(400);
      expect(await bad({ email: 'not-an-email' })).toBe(400);
      expect(await bad({ phone: 'abc' })).toBe(400);
      expect(await bad({ phone: '123' })).toBe(400);
      expect(await bad({ state: '' })).toBe(400);
      expect(await bad({ state: undefined })).toBe(400);
      // Unknown fields are refused outright.
      expect(await bad({ organizationId: orgB })).toBe(400);
      const res = await createEnumerator({ phone: 'abc' });
      expect(JSON.stringify(res.body)).toMatch(/valid phone number/i);
    });

    it('refuses duplicate email and duplicate phone with a clear message', async () => {
      const first = await createEnumerator({
        fullName: 'Chidi Okoro',
        email: `chidi-${run}@example.org`,
        phone: '+2348031110000',
      });
      expect(first.status).toBe(201);
      const dupEmail = await createEnumerator({
        fullName: 'Chidi Two',
        email: `CHIDI-${run}@example.org`,
      });
      expect(dupEmail.status).toBe(409);
      expect(JSON.stringify(dupEmail.body)).toMatch(
        /email address already exists/,
      );
      const dupPhone = await createEnumerator({
        fullName: 'Chidi Three',
        phone: '+234 803 111 0000',
      });
      expect(dupPhone.status).toBe(409);
      expect(JSON.stringify(dupPhone.body)).toMatch(
        /phone number already exists/,
      );
    });

    it('refuses projects that do not exist or belong to another organization', async () => {
      expect(
        (await createEnumerator({ projectIds: [foreignProject] })).status,
      ).toBe(400);
      expect(
        (await createEnumerator({ projectIds: [randomUUID()] })).status,
      ).toBe(400);
      // and leaves nothing behind (one transaction)
      const stray = await prisma.enumeratorProfile.count({
        where: { organizationId: orgA, user: { phone: null } },
      });
      expect(stray).toBe(0);
    });
  });

  // ─── permissions and tenancy ────────────────────────────────────────

  describe('who can manage enumerators', () => {
    it('is closed to unauthenticated callers and roles without the permission', async () => {
      await http.get('/api/v1/enumerators').expect(401);
      await http
        .get('/api/v1/enumerators')
        .set(bearer(viewerToken))
        .expect(403);
      await http
        .post('/api/v1/enumerators')
        .set(bearer(viewerToken))
        .send({})
        .expect(403);
    });

    it('never shows or changes another organization’s enumerator', async () => {
      const id = data(await createEnumerator({ fullName: 'Dauda Musa' })).id;
      await http
        .get(`/api/v1/enumerators/${id}`)
        .set(bearer(adminBToken))
        .expect(404);
      await http
        .patch(`/api/v1/enumerators/${id}`)
        .set(bearer(adminBToken))
        .send({ state: 'Lagos' })
        .expect(404);
      await http
        .post(`/api/v1/enumerators/${id}/access-code`)
        .set(bearer(adminBToken))
        .send({})
        .expect(404);
      await http
        .delete(`/api/v1/enumerators/${id}/access-code`)
        .set(bearer(adminBToken))
        .send({})
        .expect(404);
      await http
        .put(`/api/v1/enumerators/${id}/active`)
        .set(bearer(adminBToken))
        .send({ isActive: false })
        .expect(404);
      await http
        .put(`/api/v1/enumerators/${id}/projects/${projectA}`)
        .set(bearer(adminBToken))
        .expect(404);
      const list = await http
        .get('/api/v1/enumerators')
        .set(bearer(adminBToken))
        .expect(200);
      expect(JSON.stringify(list.body)).not.toContain(id);
    });

    it('lets an enumerator do none of it', async () => {
      const { code } = data(
        await createEnumerator({ fullName: 'Ebele Nwosu' }),
      ).accessCode;
      const login = await auth.fieldLogin({ code });
      const token = login.token.accessToken;
      await http.get('/api/v1/enumerators').set(bearer(token)).expect(403);
      await http
        .post('/api/v1/enumerators')
        .set(bearer(token))
        .send({})
        .expect(403);
    });
  });

  // ─── editing, status, projects ──────────────────────────────────────

  describe('editing and assigning', () => {
    let id: string;
    beforeAll(async () => {
      id = data(
        await createEnumerator({ fullName: 'Fatima Bello', state: 'Jigawa' }),
      ).id;
    });

    it('edits details and refuses a phone number another enumerator holds', async () => {
      const res = await http
        .patch(`/api/v1/enumerators/${id}`)
        .set(bearer(adminToken))
        .send({
          fullName: 'Fatima Bello-Sani',
          state: 'Katsina',
          notes: 'Hausa speaker',
        })
        .expect(200);
      expect(data(res)).toMatchObject({
        fullName: 'Fatima Bello-Sani',
        state: 'Katsina',
        notes: 'Hausa speaker',
      });
      await http
        .patch(`/api/v1/enumerators/${id}`)
        .set(bearer(adminToken))
        .send({ phone: '+2348031110000' })
        .expect(409);
      await http
        .patch(`/api/v1/enumerators/${id}`)
        .set(bearer(adminToken))
        .send({ phone: 'zzz' })
        .expect(400);
    });

    it('assigns, replaces and removes projects; only the organization’s own', async () => {
      await http
        .put(`/api/v1/enumerators/${id}/projects/${projectB}`)
        .set(bearer(adminToken))
        .expect(200);
      let detail = data(
        await http
          .get(`/api/v1/enumerators/${id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.projects.map((p: { id: string }) => p.id).sort()).toEqual(
        [projectA, projectB].sort(),
      );

      await http
        .delete(`/api/v1/enumerators/${id}/projects/${projectA}`)
        .set(bearer(adminToken))
        .expect(200);
      detail = data(
        await http
          .get(`/api/v1/enumerators/${id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.projects.map((p: { id: string }) => p.id)).toEqual([
        projectB,
      ]);

      await http
        .put(`/api/v1/enumerators/${id}/projects`)
        .set(bearer(adminToken))
        .send({ projectIds: [projectA] })
        .expect(200);
      detail = data(
        await http
          .get(`/api/v1/enumerators/${id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.projects.map((p: { id: string }) => p.id)).toEqual([
        projectA,
      ]);

      await http
        .put(`/api/v1/enumerators/${id}/projects/${foreignProject}`)
        .set(bearer(adminToken))
        .expect(400);
      await http
        .put(`/api/v1/enumerators/${id}/projects`)
        .set(bearer(adminToken))
        .send({ projectIds: [foreignProject] })
        .expect(400);
    });

    it('deactivating ends access at once; reactivating restores it with the same code', async () => {
      const fresh = data(await createEnumerator({ fullName: 'Garba Lawal' }));
      const login = await auth.fieldLogin({ code: fresh.accessCode.code });
      const token = login.token.accessToken;
      await http.get('/api/v1/field/projects').set(bearer(token)).expect(200);

      await http
        .put(`/api/v1/enumerators/${fresh.id}/active`)
        .set(bearer(adminToken))
        .send({ isActive: false })
        .expect(200);
      await http.get('/api/v1/field/projects').set(bearer(token)).expect(401); // session ended
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).rejects.toThrow(/invalid or expired/i);

      await http
        .put(`/api/v1/enumerators/${fresh.id}/active`)
        .set(bearer(adminToken))
        .send({ isActive: true })
        .expect(200);
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).resolves.toBeDefined();
    });
  });

  // ─── access-code login ──────────────────────────────────────────────

  describe('field login with a personal code', () => {
    let e: { id: string; accessCode: { code: string } };
    beforeAll(async () => {
      e = data(await createEnumerator({ fullName: 'Halima Idris' }));
    });

    it('signs in as exactly that enumerator, tolerating case, spaces and dashes', async () => {
      const typed = e.accessCode.code.toLowerCase().replace('-', ' ');
      const res = await auth.fieldLogin({ code: typed });
      expect(res.user.id).toBe(e.id);
      expect(res.user.enumerator.sharedCode).toBe(false);
      const c = await prisma.fieldAccessCode.findFirstOrThrow({
        where: { userId: e.id, status: 'ACTIVE' },
      });
      expect(c.useCount).toBe(1);
      expect(c.lastUsedAt).not.toBeNull();
      const detail = data(
        await http
          .get(`/api/v1/enumerators/${e.id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.accessCode.state).toBe('ACTIVE'); // was UNUSED before first use
    });

    it('gives the same answer for unknown, malformed and empty codes, and records the attempt without the code', async () => {
      const guess = generateAccessCode();
      const failures = await Promise.all(
        [guess, 'ZZZZZ-ZZZZZ', 'AB', '   ', '!!!!'].map((code) =>
          auth.fieldLogin({ code }, { ip: '198.51.100.7' }).then(
            () => 'ok',
            (err: Error) => err.message,
          ),
        ),
      );
      expect(new Set(failures)).toEqual(
        new Set(['Invalid or expired access code']),
      );
      const audit = await prisma.auditLog.findMany({
        where: { event: 'field_login.failed', ipAddress: '198.51.100.7' },
      });
      expect(audit.length).toBeGreaterThanOrEqual(5);
      expect(JSON.stringify(audit)).not.toContain(guess);
      const ok = await prisma.auditLog.findFirst({
        where: { event: 'field_login.succeeded', userId: e.id },
      });
      expect(ok).not.toBeNull();
    });

    it('one enumerator’s code opens only that enumerator’s account', async () => {
      const other = data(
        await createEnumerator({ fullName: 'Ibrahim Danjuma' }),
      );
      const a = await auth.fieldLogin({ code: e.accessCode.code });
      const b = await auth.fieldLogin({ code: other.accessCode.code });
      expect(a.user.id).toBe(e.id);
      expect(b.user.id).toBe(other.id);
      expect(a.user.id).not.toBe(b.user.id);
    });

    it('issues distinct, unpredictable codes', () => {
      const codes = new Set(Array.from({ length: 2000 }, generateAccessCode));
      expect(codes.size).toBe(2000);
    });

    it('regenerating retires the old code and ends its sessions; exactly one code stays active', async () => {
      const fresh = data(await createEnumerator({ fullName: 'Jamila Aliyu' }));
      const oldToken = (await auth.fieldLogin({ code: fresh.accessCode.code }))
        .token.accessToken;

      const res = await http
        .post(`/api/v1/enumerators/${fresh.id}/access-code`)
        .set(bearer(adminToken))
        .send({})
        .expect(201);
      const next = data(res).code as string;
      expect(next).not.toBe(fresh.accessCode.code);

      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).rejects.toThrow(/invalid or expired/i);
      await http
        .get('/api/v1/field/projects')
        .set(bearer(oldToken))
        .expect(401);
      const newLogin = await auth.fieldLogin({ code: next });
      expect(newLogin.user.id).toBe(fresh.id);

      const codes = await prisma.fieldAccessCode.findMany({
        where: { userId: fresh.id },
        orderBy: { issuedAt: 'asc' },
      });
      expect(codes.map((c) => c.status)).toEqual(['REVOKED', 'ACTIVE']);
      expect(codes[0].revokedAt).not.toBeNull();
      expect(codes[0].revokedById).toBe(adminA);

      // The database itself refuses a second active code.
      await expect(
        prisma.fieldAccessCode.create({
          data: {
            organizationId: orgA,
            userId: fresh.id,
            codeHash: 'x'.repeat(64),
            status: 'ACTIVE',
          },
        }),
      ).rejects.toThrow();
      const events = await prisma.auditLog.findMany({
        where: { auditableId: fresh.id, auditableType: 'Enumerator' },
      });
      expect(events.map((x) => x.event)).toEqual(
        expect.arrayContaining([
          'enumerator.created',
          'enumerator.access_code_regenerated',
        ]),
      );
    });

    it('revoking blocks the code and its sessions; state shows Revoked; a new code can follow', async () => {
      const fresh = data(await createEnumerator({ fullName: 'Kabiru Umar' }));
      const token = (await auth.fieldLogin({ code: fresh.accessCode.code }))
        .token.accessToken;

      await http
        .delete(`/api/v1/enumerators/${fresh.id}/access-code`)
        .set(bearer(adminToken))
        .send({ reason: 'Phone lost' })
        .expect(200);
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).rejects.toThrow(/invalid or expired/i);
      await http.get('/api/v1/field/projects').set(bearer(token)).expect(401);
      const detail = data(
        await http
          .get(`/api/v1/enumerators/${fresh.id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.accessCode.state).toBe('REVOKED');
      const row = await prisma.fieldAccessCode.findFirstOrThrow({
        where: { userId: fresh.id },
      });
      expect(row.revokedReason).toBe('Phone lost');

      await http
        .delete(`/api/v1/enumerators/${fresh.id}/access-code`)
        .set(bearer(adminToken))
        .send({})
        .expect(409);
      const reissue = data(
        await http
          .post(`/api/v1/enumerators/${fresh.id}/access-code`)
          .set(bearer(adminToken))
          .send({})
          .expect(201),
      );
      await expect(
        auth.fieldLogin({ code: reissue.code }),
      ).resolves.toBeDefined();
      // The revoked code stays dead.
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).rejects.toThrow(/invalid or expired/i);
    });

    it('honours an expiry, and shows Expired', async () => {
      const fresh = data(
        await createEnumerator({ fullName: 'Lami Garba', codeValidDays: 7 }),
      );
      const row = await prisma.fieldAccessCode.findFirstOrThrow({
        where: { userId: fresh.id },
      });
      expect(row.expiresAt!.getTime()).toBeGreaterThan(
        Date.now() + 6 * 24 * 3600_000,
      );
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).resolves.toBeDefined();

      await prisma.fieldAccessCode.update({
        where: { id: row.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(
        auth.fieldLogin({ code: fresh.accessCode.code }),
      ).rejects.toThrow(/invalid or expired/i);
      const detail = data(
        await http
          .get(`/api/v1/enumerators/${fresh.id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.accessCode.state).toBe('EXPIRED');
    });

    it('still accepts an older shared code, and marks it legacy', async () => {
      const legacyId = randomUUID();
      await prisma.user.create({
        data: {
          id: legacyId,
          email: `legacy-${run}@t.test`,
          passwordHash: 'x',
          firstName: 'Old Team',
          lastName: '',
          organizationId: orgA,
          fieldAccessCode: `Q${run
            .slice(0, 3)
            .toUpperCase()
            .replace(/[^A-Z]/g, 'X')}9`,
        },
      });
      const code = (
        await prisma.user.findUniqueOrThrow({ where: { id: legacyId } })
      ).fieldAccessCode!;
      const res = await auth.fieldLogin({ code });
      expect(res.user.id).toBe(legacyId);
      expect(res.user.enumerator.sharedCode).toBe(true);
    });
  });

  // ─── isolation ──────────────────────────────────────────────────────

  describe('what a signed-in enumerator can reach', () => {
    let a: { id: string; token: string };
    let b: { id: string; token: string };
    const interviewA = randomUUID();

    function interviewBody(
      id: string,
      projectId: string,
      extra: Record<string, unknown> = {},
    ) {
      return {
        interviewId: id,
        participantId: randomUUID(),
        consentId: randomUUID(),
        projectId,
        participant: { displayName: 'Respondent One' },
        consent: {
          version: 'v1',
          method: 'VERBAL',
          allowRecording: true,
          allowTranscription: true,
          allowAiAnalysis: true,
          allowQuotation: true,
          allowPublication: false,
          capturedAt: new Date().toISOString(),
        },
        ...extra,
      };
    }

    beforeAll(async () => {
      const ea = data(
        await createEnumerator({
          fullName: 'Maryam Abubakar',
          projectIds: [projectA],
        }),
      );
      const eb = data(
        await createEnumerator({
          fullName: 'Nura Kabir',
          projectIds: [projectB],
        }),
      );
      a = {
        id: ea.id,
        token: (await auth.fieldLogin({ code: ea.accessCode.code })).token
          .accessToken,
      };
      b = {
        id: eb.id,
        token: (await auth.fieldLogin({ code: eb.accessCode.code })).token
          .accessToken,
      };
    });

    it('lists only assigned projects, each with its interview types', async () => {
      const res = await http
        .get('/api/v1/field/projects')
        .set(bearer(a.token))
        .expect(200);
      const projects = data(res) as {
        id: string;
        interviewTypes: { key: string }[];
      }[];
      expect(projects.map((p) => p.id)).toEqual([projectA]);
      expect(projects[0].interviewTypes.map((t) => t.key)).toEqual(
        expect.arrayContaining([
          'KII',
          'FGD',
          'IDI',
          'HOUSEHOLD',
          'OBSERVATION',
        ]),
      );
    });

    it('cannot start an interview in a project it is not assigned to', async () => {
      await http
        .post('/api/v1/field/interviews')
        .set(bearer(a.token))
        .send(interviewBody(randomUUID(), projectB))
        .expect(403);
      await http
        .post('/api/v1/field/interviews')
        .set(bearer(a.token))
        .send(interviewBody(randomUUID(), foreignProject))
        .expect(404);
    });

    it('credits the interview to the signed-in enumerator whatever name the device sends', async () => {
      const res = await http
        .post('/api/v1/field/interviews')
        .set(bearer(a.token))
        .send(
          interviewBody(interviewA, projectA, {
            enumeratorName: 'Someone Else',
            type: 'FGD',
            typeMetadata: {},
          }),
        )
        .expect(201);
      expect(data(res).id).toBe(interviewA);
      const iv = await prisma.interview.findUniqueOrThrow({
        where: { id: interviewA },
      });
      expect(iv.enumeratorName).toBe('Maryam Abubakar');
      expect(iv.interviewerId).toBe(a.id);
      expect(iv.type).toBe('FGD');
    });

    it('rejects an interview type the project does not collect', async () => {
      await http
        .post('/api/v1/field/interviews')
        .set(bearer(a.token))
        .send(interviewBody(randomUUID(), projectA, { type: 'NOT_A_TYPE' }))
        .expect(400);
    });

    it('cannot read or change another enumerator’s interview or transcripts', async () => {
      // B is assigned elsewhere and did not conduct interviewA.
      const list = await http
        .get('/api/v1/interviews')
        .set(bearer(b.token))
        .expect(200);
      expect(JSON.stringify(list.body)).not.toContain(interviewA);
      const own = await http
        .get('/api/v1/interviews')
        .set(bearer(a.token))
        .expect(200);
      expect(JSON.stringify(own.body)).toContain(interviewA);
      const ids = await http
        .get(`/api/v1/interviews/${interviewA}`)
        .set(bearer(b.token));
      expect([403, 404]).toContain(ids.status);
      await http
        .get('/api/v1/field/transcripts')
        .set(bearer(b.token))
        .expect(200);
    });

    it('shows the administrator that enumerator’s activity and pending submissions', async () => {
      const detail = data(
        await http
          .get(`/api/v1/enumerators/${a.id}`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(detail.summary).toMatchObject({
        interviews: 1,
        pendingSubmissions: 1,
        recordingsSubmitted: 0,
      });
      expect(detail.recentActivity.length).toBeGreaterThan(0);
      expect(detail.lastActivityAt).not.toBeNull();
      const subs = data(
        await http
          .get(`/api/v1/enumerators/${a.id}/submissions?type=FGD`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(subs.map((s: { id: string }) => s.id)).toEqual([interviewA]);
      const none = data(
        await http
          .get(`/api/v1/enumerators/${a.id}/submissions?type=KII`)
          .set(bearer(adminToken))
          .expect(200),
      );
      expect(none).toEqual([]);
    });

    it('loses access to a project the moment it is unassigned', async () => {
      await http
        .delete(`/api/v1/enumerators/${b.id}/projects/${projectB}`)
        .set(bearer(adminToken))
        .expect(200);
      const res = await http
        .get('/api/v1/field/projects')
        .set(bearer(b.token))
        .expect(200);
      expect(data(res)).toEqual([]);
      await http
        .post('/api/v1/field/interviews')
        .set(bearer(b.token))
        .send(interviewBody(randomUUID(), projectB))
        .expect(403);
    });
  });

  // ─── search, filter, sort ───────────────────────────────────────────

  describe('finding enumerators', () => {
    const tag = `Zz${run.replace(/\d/g, 'q')}`;
    beforeAll(async () => {
      await createEnumerator({
        fullName: `${tag} Alpha`,
        state: 'Borno',
        projectIds: [projectA],
      });
      await createEnumerator({
        fullName: `${tag} Bravo`,
        state: 'Kano',
        projectIds: [projectB],
      });
      const c = data(
        await createEnumerator({
          fullName: `${tag} Charlie`,
          state: 'Kano',
          projectIds: [],
        }),
      );
      await http
        .put(`/api/v1/enumerators/${c.id}/active`)
        .set(bearer(adminToken))
        .send({ isActive: false })
        .expect(200);
      await http
        .delete(`/api/v1/enumerators/${c.id}/access-code`)
        .set(bearer(adminToken))
        .send({})
        .expect(200);
    });
    const names = async (qs: string) =>
      (
        data(
          await http
            .get(`/api/v1/enumerators?${qs}`)
            .set(bearer(adminToken))
            .expect(200),
        ) as { fullName: string }[]
      ).map((x) => x.fullName.replace(`${tag} `, ''));

    it('searches by name, and filters by state, status, project and code status', async () => {
      expect(await names(`search=${tag}`)).toEqual([
        'Alpha',
        'Bravo',
        'Charlie',
      ]);
      expect(await names(`search=${tag}%20bra`)).toEqual([]); // whole-string contains, not tokens
      expect(await names(`search=Bravo`)).toEqual(['Bravo']);
      expect(await names(`search=${tag}&state=kano`)).toEqual([
        'Bravo',
        'Charlie',
      ]);
      expect(await names(`search=${tag}&status=inactive`)).toEqual(['Charlie']);
      expect(await names(`search=${tag}&status=active`)).toEqual([
        'Alpha',
        'Bravo',
      ]);
      expect(await names(`search=${tag}&projectId=${projectB}`)).toEqual([
        'Bravo',
      ]);
      expect(await names(`search=${tag}&codeStatus=REVOKED`)).toEqual([
        'Charlie',
      ]);
      expect(await names(`search=${tag}&codeStatus=UNUSED`)).toEqual([
        'Alpha',
        'Bravo',
      ]);
    });

    it('sorts by name, state and creation date, and refuses unknown options', async () => {
      expect(await names(`search=${tag}&sortBy=name&sortOrder=desc`)).toEqual([
        'Charlie',
        'Bravo',
        'Alpha',
      ]);
      expect(await names(`search=${tag}&sortBy=state&sortOrder=asc`)).toEqual([
        'Alpha',
        'Bravo',
        'Charlie',
      ]);
      expect(
        await names(`search=${tag}&sortBy=createdAt&sortOrder=desc`),
      ).toEqual(['Charlie', 'Bravo', 'Alpha']);
      await http
        .get('/api/v1/enumerators?sortBy=passwordHash')
        .set(bearer(adminToken))
        .expect(400);
      await http
        .get('/api/v1/enumerators?status=deleted')
        .set(bearer(adminToken))
        .expect(400);
    });
  });

  // ─── brute force (last: it blocks this address) ────────────────────

  describe('brute-force protection', () => {
    it('throttles repeated wrong codes over HTTP and then blocks the address', async () => {
      const good = data(await createEnumerator({ fullName: 'Zainab Hassan' }))
        .accessCode.code as string;
      (limiter as unknown as { entries: Map<string, unknown> }).entries.clear();

      const statuses: number[] = [];
      for (let i = 0; i < 14; i++) {
        const res = await http
          .post('/api/v1/auth/field-login')
          .send({ code: generateAccessCode() });
        statuses.push(res.status);
      }
      expect(statuses[0]).toBe(401);
      expect(statuses).toContain(429);
      expect(statuses.filter((s) => s === 401).length).toBeLessThanOrEqual(10);

      // Blocked: even the right code is refused from this address for now.
      const blocked = await http
        .post('/api/v1/auth/field-login')
        .send({ code: good });
      expect(blocked.status).toBe(429);
    });
  });
});
