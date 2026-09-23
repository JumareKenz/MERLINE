/**
 * Repair: give every organization the full permission catalogue and the
 * standard roles with their grants. Idempotent — only missing rows are
 * added; nothing is removed or renamed, and no user's role changes.
 *
 * Needed for organizations created by self-registration before
 * registration provisioned roles (their administrator role granted
 * nothing, so every permission-checked route returned 403).
 *
 *   npx ts-node prisma/provision-organizations.ts            # all orgs
 *   npx ts-node prisma/provision-organizations.ts <org-slug> # one org
 */
import { PrismaClient } from '@prisma/client';
import { provisionOrganizationRoles } from '../src/auth/organization-provisioning';

async function main() {
  const prisma = new PrismaClient();
  const slug = process.argv[2];
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null, ...(slug ? { slug } : {}) },
    select: { id: true, slug: true },
  });
  if (orgs.length === 0)
    throw new Error(slug ? `No organization "${slug}"` : 'No organizations');

  for (const org of orgs) {
    const count = async () => ({
      permissions: await prisma.permission.count({
        where: { organizationId: org.id },
      }),
      roles: await prisma.role.count({ where: { organizationId: org.id } }),
      grants: await prisma.permissionRole.count({
        where: { role: { organizationId: org.id } },
      }),
    });
    const before = await count();
    await prisma.$transaction((tx) => provisionOrganizationRoles(tx, org.id));
    const after = await count();
    console.log(
      `${org.slug}: before ${JSON.stringify(before)} after ${JSON.stringify(after)}`,
    );
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
