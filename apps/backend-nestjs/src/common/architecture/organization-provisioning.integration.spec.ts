/**
 * Every organization must end up with the permission catalogue and roles
 * that grant it — including organizations created by self-registration,
 * whose administrator role used to grant nothing (403 on every
 * permission-checked route). Runs with RUN_DB_TESTS=1 and DATABASE_URL.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { provisionOrganizationRoles } from '../../auth/organization-provisioning';
import {
  PERMISSION_SLUGS,
  ROLE_DEFINITIONS,
} from '../../auth/permission-catalogue';

const describeDb =
  process.env.RUN_DB_TESTS === '1' && process.env.DATABASE_URL
    ? describe
    : describe.skip;

describeDb('organization provisioning (database)', () => {
  const prisma = new PrismaClient();
  const orgIds: string[] = [];

  async function newOrg() {
    const id = randomUUID();
    orgIds.push(id);
    await prisma.organization.create({
      data: {
        id,
        name: `Prov ${id.slice(0, 6)}`,
        slug: `prov-${id.slice(0, 8)}`,
      },
    });
    return id;
  }

  async function grantedSlugs(roleId: string) {
    const rows = await prisma.permissionRole.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => r.permission.slug).sort();
  }

  afterAll(async () => {
    const where = { organizationId: { in: orgIds } };
    await prisma.roleUser.deleteMany({ where: { role: where } });
    await prisma.permissionRole.deleteMany({ where: { role: where } });
    await prisma.permission.deleteMany({ where });
    await prisma.role.deleteMany({ where });
    await prisma.user.deleteMany({ where });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.$disconnect();
  });

  it('gives a new organization every role, with the administrator holding every permission', async () => {
    const orgId = await newOrg();
    const roles = await provisionOrganizationRoles(prisma, orgId);

    expect([...roles.keys()].sort()).toEqual(
      ROLE_DEFINITIONS.map((r) => r.slug).sort(),
    );
    expect(await grantedSlugs(roles.get('administrator')!)).toEqual(
      [...PERMISSION_SLUGS].sort(),
    );
    const field = await grantedSlugs(roles.get('field-interviewer')!);
    expect(field).toContain('upload.recordings');
    expect(field).not.toContain('view.transcripts');
  });

  it('is idempotent: a second run adds nothing', async () => {
    const orgId = await newOrg();
    await provisionOrganizationRoles(prisma, orgId);
    const counts = async () => [
      await prisma.permission.count({ where: { organizationId: orgId } }),
      await prisma.role.count({ where: { organizationId: orgId } }),
      await prisma.permissionRole.count({
        where: { role: { organizationId: orgId } },
      }),
    ];
    const first = await counts();
    await provisionOrganizationRoles(prisma, orgId);
    expect(await counts()).toEqual(first);
    expect(first[0]).toBe(PERMISSION_SLUGS.length);
  });

  it('repairs a self-registered organization whose administrator role granted nothing', async () => {
    const orgId = await newOrg();
    const adminRole = await prisma.role.create({
      data: {
        name: 'Administrator',
        slug: 'administrator',
        organizationId: orgId,
        isSystem: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `prov-${randomUUID().slice(0, 8)}@t.test`,
        passwordHash: 'x',
        firstName: 'A',
        lastName: 'B',
        organizationId: orgId,
      },
    });
    await prisma.roleUser.create({
      data: { userId: user.id, roleId: adminRole.id },
    });
    expect(await grantedSlugs(adminRole.id)).toEqual([]);

    const roles = await provisionOrganizationRoles(prisma, orgId);

    // Same role row (the user's assignment is untouched), now fully granted.
    expect(roles.get('administrator')).toBe(adminRole.id);
    expect(await grantedSlugs(adminRole.id)).toEqual(
      [...PERMISSION_SLUGS].sort(),
    );
    expect(await prisma.roleUser.count({ where: { userId: user.id } })).toBe(1);
  });
});
