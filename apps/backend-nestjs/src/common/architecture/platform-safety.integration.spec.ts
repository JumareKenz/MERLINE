/**
 * PHASE 1 — PLATFORM SAFETY · ACCEPTANCE SUITE
 *
 * End-to-end verification of the Phase 1 gates, through the real application:
 * real AppModule, real global guard chain, real JWTs, real database, HTTP via
 * supertest. Service-level unit tests can be satisfied by a mock that agrees
 * with the code; this cannot.
 *
 * Covers, in order:
 *   1. Organization A cannot LIST organization B's records
 *   2. Organization A cannot GET organization B's records by id
 *   3. Organization A cannot DOWNLOAD organization B's media
 *   4. A mismatched :orgId route param returns 403
 *   5. A caller without the required permission returns 403
 *   6. Audit rows are written for media and user actions
 *   7. Unauthenticated and malformed tokens are rejected
 *
 * Runs only when RUN_DB_TESTS=1 and DATABASE_URL is set, against a database
 * that has had `prisma migrate deploy` applied. Skips otherwise.
 *
 * Fixtures are namespaced per run and removed afterwards.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { jwtSignOptions } from '../../auth/jwt.constants';
import { PERMISSION_CATALOGUE, ROLE_DEFINITIONS, permissionsForRole } from '../../auth/permission-catalogue';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { TransformInterceptor } from '../interceptors/transform.interceptor';

const shouldRun = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const describeDb = shouldRun ? describe : describe.skip;

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

describeDb('Phase 1 platform safety (application)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  const run = randomUUID().slice(0, 8);

  const orgA = randomUUID();
  const orgB = randomUUID();
  const adminA = randomUUID();
  const adminB = randomUUID();
  const viewerA = randomUUID();

  const projectA = randomUUID();
  const projectB = randomUUID();
  const mediaA = randomUUID();
  const mediaB = randomUUID();

  let tokenAdminA = '';
  let tokenAdminB = '';
  let tokenViewerA = '';

  function sign(userId: string, organizationId: string, email: string) {
    return jwt.sign(
      { sub: userId, email, orgId: organizationId, tkn: 0 },
      JWT_SECRET,
      jwtSignOptions('7d'),
    );
  }

  async function seedOrg(orgId: string, label: string) {
    await prisma.organization.create({
      data: { id: orgId, name: `${label} ${run}`, slug: `${label.toLowerCase()}-${run}` },
    });

    await prisma.permission.createMany({
      data: PERMISSION_CATALOGUE.map((p) => ({
        id: randomUUID(),
        slug: p.slug,
        name: p.name,
        module: p.module,
        organizationId: orgId,
      })),
      skipDuplicates: true,
    });

    const permissions = await prisma.permission.findMany({ where: { organizationId: orgId } });
    const bySlug = new Map(permissions.map((p) => [p.slug, p]));
    const roles = new Map<string, string>();

    for (const definition of ROLE_DEFINITIONS) {
      const role = await prisma.role.create({
        data: {
          id: randomUUID(),
          name: definition.name,
          slug: definition.slug,
          organizationId: orgId,
          isSystem: true,
        },
      });
      roles.set(definition.slug, role.id);

      await prisma.permissionRole.createMany({
        data: permissionsForRole(definition)
          .map((slug) => bySlug.get(slug)?.id)
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ permissionId, roleId: role.id })),
        skipDuplicates: true,
      });
    }

    return roles;
  }

  beforeAll(async () => {
    await prisma.$connect();

    const rolesA = await seedOrg(orgA, 'OrgA');
    const rolesB = await seedOrg(orgB, 'OrgB');

    await prisma.user.createMany({
      data: [
        { id: adminA, email: `admin-a-${run}@t.test`, passwordHash: 'x', firstName: 'A', lastName: 'Admin', organizationId: orgA },
        { id: adminB, email: `admin-b-${run}@t.test`, passwordHash: 'x', firstName: 'B', lastName: 'Admin', organizationId: orgB },
        { id: viewerA, email: `viewer-a-${run}@t.test`, passwordHash: 'x', firstName: 'A', lastName: 'Viewer', organizationId: orgA },
      ],
    });

    await prisma.roleUser.createMany({
      data: [
        { userId: adminA, roleId: rolesA.get('administrator') as string },
        { userId: adminB, roleId: rolesB.get('administrator') as string },
        // Viewer holds view.projects but NOT create/delete.projects or delete.media.
        { userId: viewerA, roleId: rolesA.get('viewer') as string },
      ],
    });

    await prisma.project.createMany({
      data: [
        { id: projectA, name: `Project A ${run}`, organizationId: orgA, createdById: adminA },
        { id: projectB, name: `Project B ${run}`, organizationId: orgB, createdById: adminB },
      ],
    });

    await prisma.media.createMany({
      data: [
        {
          id: mediaA, filename: 'a.webm', originalName: 'a.webm', mimeType: 'audio/webm',
          size: 10, type: 'AUDIO', path: `org/${orgA}/media/a.webm`,
          uploadedById: adminA, organizationId: orgA,
        },
        {
          id: mediaB, filename: 'b.webm', originalName: 'b.webm', mimeType: 'audio/webm',
          size: 10, type: 'AUDIO', path: `org/${orgB}/media/b.webm`,
          uploadedById: adminB, organizationId: orgB,
        },
      ],
    });

    tokenAdminA = sign(adminA, orgA, `admin-a-${run}@t.test`);
    tokenAdminB = sign(adminB, orgB, `admin-b-${run}@t.test`);
    tokenViewerA = sign(viewerA, orgA, `viewer-a-${run}@t.test`);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts so the test exercises the deployed configuration.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    http = request(app.getHttpServer());
  }, 60_000);

  afterAll(async () => {
    const orgs = { in: [orgA, orgB] };
    await prisma.media.deleteMany({ where: { organizationId: orgs } });
    await prisma.project.deleteMany({ where: { organizationId: orgs } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgs } });
    await prisma.roleUser.deleteMany({ where: { userId: { in: [adminA, adminB, viewerA] } } });
    await prisma.permissionRole.deleteMany({ where: { role: { organizationId: orgs } } });
    await prisma.role.deleteMany({ where: { organizationId: orgs } });
    await prisma.permission.deleteMany({ where: { organizationId: orgs } });
    await prisma.user.deleteMany({ where: { organizationId: orgs } });
    await prisma.organization.deleteMany({ where: { id: orgs } });
    await app?.close();
    await prisma.$disconnect();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  describe('1. cross-tenant listing', () => {
    it('lists only the caller organization projects', async () => {
      const res = await http.get('/api/v1/projects').set(auth(tokenAdminA)).expect(200);
      const body = JSON.stringify(res.body);

      expect(body).toContain(`Project A ${run}`);
      expect(body).not.toContain(`Project B ${run}`);
    });

    it('does not leak the other organization media in a list', async () => {
      const res = await http.get('/api/v1/media').set(auth(tokenAdminA)).expect(200);
      const body = JSON.stringify(res.body);

      expect(body).toContain(mediaA);
      expect(body).not.toContain(mediaB);
    });
  });

  describe('2. cross-tenant retrieval by id', () => {
    it('refuses another organization project by id', async () => {
      await http.get(`/api/v1/projects/${projectB}`).set(auth(tokenAdminA)).expect(404);
    });

    it('returns the caller own project by id', async () => {
      await http.get(`/api/v1/projects/${projectA}`).set(auth(tokenAdminA)).expect(200);
    });

    it('refuses another organization media by id', async () => {
      await http.get(`/api/v1/media/${mediaB}`).set(auth(tokenAdminA)).expect(404);
    });

    it('refuses to mutate another organization project', async () => {
      await http
        .put(`/api/v1/projects/${projectB}`)
        .set(auth(tokenAdminA))
        .send({ name: 'hijacked' })
        .expect(404);

      const untouched = await prisma.project.findUnique({ where: { id: projectB } });
      expect(untouched?.name).toBe(`Project B ${run}`);
    });
  });

  describe('3. cross-tenant media download', () => {
    it('refuses to mint a signed URL for another organization media', async () => {
      // The ownership check must happen before any URL is generated: a signed
      // URL carries no identity, so issuing one is equivalent to handing over
      // the object.
      const res = await http
        .get(`/api/v1/media/${mediaB}/download`)
        .set(auth(tokenAdminA));

      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain('http');
    });

    it('the owning organization reaches its own media record', async () => {
      await http.get(`/api/v1/media/${mediaA}`).set(auth(tokenAdminA)).expect(200);
    });
  });

  describe('3b. tenant cannot be supplied by the client on create', () => {
    // Found by this suite on its first real run: CreateProjectDto and
    // CreateUserDto both REQUIRED `organizationId` in the body, so a caller
    // could create a project — or plant a user account — inside another
    // organization just by naming it. The GET paths had been fixed; the
    // create paths had not.
    it('creates a project in the caller organization, without being told which', async () => {
      const name = `Tenant From Token ${run}`;
      const res = await http
        .post('/api/v1/projects')
        .set(auth(tokenAdminA))
        .send({ name })
        .expect(201);

      const created = await prisma.project.findFirst({ where: { name } });
      expect(created?.organizationId).toBe(orgA);
      expect(JSON.stringify(res.body)).toContain(name);
    });

    it('rejects an attempt to create a project in another organization', async () => {
      // `forbidNonWhitelisted` makes the smuggled field an explicit 400
      // rather than something silently ignored.
      await http
        .post('/api/v1/projects')
        .set(auth(tokenAdminA))
        .send({ name: `Smuggled ${run}`, organizationId: orgB })
        .expect(400);

      const leaked = await prisma.project.findFirst({
        where: { name: `Smuggled ${run}` },
      });
      expect(leaked).toBeNull();
    });

    it('rejects an attempt to plant a user in another organization', async () => {
      await http
        .post('/api/v1/users')
        .set(auth(tokenAdminA))
        .send({
          email: `planted-${run}@t.test`,
          password: 'Sufficiently-Long-Pass-1',
          firstName: 'Planted',
          lastName: 'User',
          organizationId: orgB,
        })
        .expect(400);

      const planted = await prisma.user.findUnique({
        where: { email: `planted-${run}@t.test` },
      });
      expect(planted).toBeNull();
    });
  });

  describe('4. organization route parameter mismatch', () => {
    it('returns 403 for another organization id in the path', async () => {
      await http
        .get(`/api/v1/organizations/${orgB}/members`)
        .set(auth(tokenAdminA))
        .expect(403);
    });

    it('allows the caller own organization id in the path', async () => {
      const res = await http
        .get(`/api/v1/organizations/${orgA}/members`)
        .set(auth(tokenAdminA));

      expect(res.status).not.toBe(403);
    });
  });

  describe('5. permission enforcement', () => {
    it('returns 403 when the caller lacks the permission', async () => {
      // Viewer holds view.projects but not create.projects.
      await http
        .post('/api/v1/projects')
        .set(auth(tokenViewerA))
        .send({ name: `Should not exist ${run}` })
        .expect(403);
    });

    it('returns 403 for a delete the caller cannot perform', async () => {
      await http.delete(`/api/v1/projects/${projectA}`).set(auth(tokenViewerA)).expect(403);

      const stillThere = await prisma.project.findUnique({ where: { id: projectA } });
      expect(stillThere?.deletedAt).toBeNull();
    });

    it('allows a permitted read for the same caller', async () => {
      await http.get('/api/v1/projects').set(auth(tokenViewerA)).expect(200);
    });

    it('allows the administrator to perform the same delete', async () => {
      const disposable = randomUUID();
      await prisma.project.create({
        data: { id: disposable, name: `Disposable ${run}`, organizationId: orgA, createdById: adminA },
      });

      await http.delete(`/api/v1/projects/${disposable}`).set(auth(tokenAdminA)).expect(200);

      const removed = await prisma.project.findUnique({ where: { id: disposable } });
      expect(removed?.deletedAt).not.toBeNull();
    });
  });

  describe('6. audit trail', () => {
    it('writes an audit row for a project mutation', async () => {
      const name = `Audited ${run}`;
      await http.post('/api/v1/projects').set(auth(tokenAdminA)).send({ name }).expect(201);

      // The interceptor writes after the response is emitted.
      await new Promise((resolve) => setTimeout(resolve, 400));

      const rows = await prisma.auditLog.findMany({
        where: { organizationId: orgA, auditableType: 'Project' },
      });

      expect(rows.length).toBeGreaterThan(0);
      const row = rows[rows.length - 1];
      expect(row.event).toBe('POST:projects');
      expect(row.userId).toBe(adminA);
      // Previously hard-coded to null, leaving the column decorative.
      expect(row.checksum).toBeTruthy();
      // Previously always 'unknown' for creates.
      expect(row.auditableId).not.toBe('unknown');
    });

    it('writes an audit row for a media deletion', async () => {
      const disposable = randomUUID();
      await prisma.media.create({
        data: {
          id: disposable, filename: 'd.webm', originalName: 'd.webm', mimeType: 'audio/webm',
          size: 1, type: 'AUDIO', path: `org/${orgA}/media/d.webm`,
          uploadedById: adminA, organizationId: orgA,
        },
      });

      await http.delete(`/api/v1/media/${disposable}`).set(auth(tokenAdminA)).expect(200);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const rows = await prisma.auditLog.findMany({
        where: { organizationId: orgA, auditableType: 'Media' },
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[rows.length - 1].event).toBe('DELETE:media');
    });
  });

  describe('7. authentication', () => {
    it('rejects a request with no token', async () => {
      await http.get('/api/v1/projects').expect(401);
    });

    it('rejects a token signed without the expected issuer and audience', async () => {
      // The Phase 1 defect in reverse: a bare sign() must not be accepted.
      const bare = jwt.sign({ sub: adminA, email: 'x', orgId: orgA, tkn: 0 }, JWT_SECRET, {
        expiresIn: '7d',
      });

      await http.get('/api/v1/projects').set(auth(bare)).expect(401);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const forged = jwt.sign(
        { sub: adminA, email: 'x', orgId: orgA, tkn: 0 },
        'not-the-secret',
        jwtSignOptions('7d'),
      );

      await http.get('/api/v1/projects').set(auth(forged)).expect(401);
    });

    it('accepts a correctly signed token', async () => {
      await http.get('/api/v1/projects').set(auth(tokenAdminA)).expect(200);
    });
  });
});
