/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Database-backed proof that one organization cannot read another's rows.
 *
 * This is the acceptance test for the tenancy work. Guard unit tests show the
 * guard behaves; this shows the *services* filter, which is where the original
 * exposure lived: `StudiesService.findAll`, `SubmissionsService.findAll` and
 * friends built their `where` clause without `organizationId`, and
 * `GET /projects?organizationId=` took the tenant from the query string.
 *
 * Runs only when RUN_DB_TESTS is set and DATABASE_URL points at a migrated
 * database — CI sets both (see backend-ci.yml). Skips otherwise so the suite
 * stays runnable on a machine with no Postgres.
 *
 * Creates and removes its own fixtures; it does not read or modify anything it
 * did not create.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ProjectsService } from '../../projects/projects.service';
import { UsersService } from '../../users/users.service';

const shouldRun = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const describeDb = shouldRun ? describe : describe.skip;

describeDb('tenant isolation (database)', () => {
  const prisma = new PrismaClient();

  // Namespaced so a failed run cannot collide with a later one.
  const run = randomUUID().slice(0, 8);
  const orgAId = randomUUID();
  const orgBId = randomUUID();
  const userAId = randomUUID();
  const userBId = randomUUID();
  const projectAId = randomUUID();
  const projectBId = randomUUID();

  let projects: ProjectsService;
  let users: UsersService;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.organization.createMany({
      data: [
        { id: orgAId, name: `Org A ${run}`, slug: `org-a-${run}` },
        { id: orgBId, name: `Org B ${run}`, slug: `org-b-${run}` },
      ],
    });

    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          email: `a-${run}@tenancy.test`,
          passwordHash: 'x',
          firstName: 'A',
          lastName: 'User',
          organizationId: orgAId,
        },
        {
          id: userBId,
          email: `b-${run}@tenancy.test`,
          passwordHash: 'x',
          firstName: 'B',
          lastName: 'User',
          organizationId: orgBId,
        },
      ],
    });

    await prisma.project.createMany({
      data: [
        {
          id: projectAId,
          name: `Project A ${run}`,
          organizationId: orgAId,
          createdById: userAId,
        },
        {
          id: projectBId,
          name: `Project B ${run}`,
          organizationId: orgBId,
          createdById: userBId,
        },
      ],
    });

    projects = new ProjectsService(prisma as any);
    users = new UsersService(prisma as any);
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  describe('projects', () => {
    it('lists only the calling organization projects', async () => {
      const result: any = await projects.findAll({ organizationId: orgAId });
      const names = (result.items ?? result).map((p: any) => p.name);

      expect(names).toContain(`Project A ${run}`);
      expect(names).not.toContain(`Project B ${run}`);
    });

    it('does not return another organization project by id', async () => {
      // Previously `findById` looked up by primary key alone, so knowing a
      // UUID was sufficient to read any tenant's project.
      await expect(projects.findById(projectBId, orgAId)).rejects.toThrow();
    });

    it('returns the caller own project by id', async () => {
      const project = await projects.findById(projectAId, orgAId);
      expect(project.id).toBe(projectAId);
    });

    it('refuses to update another organization project', async () => {
      await expect(
        projects.update(projectBId, { name: 'hijacked' } as any, orgAId),
      ).rejects.toThrow();

      const untouched = await prisma.project.findUnique({ where: { id: projectBId } });
      expect(untouched?.name).toBe(`Project B ${run}`);
    });

    it('refuses to delete another organization project', async () => {
      await expect(projects.remove(projectBId, orgAId)).rejects.toThrow();

      const untouched = await prisma.project.findUnique({ where: { id: projectBId } });
      expect(untouched?.deletedAt).toBeNull();
    });
  });

  describe('users', () => {
    it('lists only the calling organization users', async () => {
      const result: any = await users.findAll({ organizationId: orgAId });
      const emails = (result.items ?? result).map((u: any) => u.email);

      expect(emails).toContain(`a-${run}@tenancy.test`);
      expect(emails).not.toContain(`b-${run}@tenancy.test`);
    });
  });
});
