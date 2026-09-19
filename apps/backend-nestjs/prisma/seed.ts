/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * Core seed: organization, roles, admin user, and one project.
 *
 * MERL demo data (study, questionnaire) moved to `seed-legacy.ts` so the core
 * seed no longer depends on deregistered modules' tables. Run the legacy seed
 * separately with `npm run prisma:seed:legacy` if you need the old fixtures.
 *
 * NOTE: the demo admin password below is a development convenience and must
 * never be used against a shared or production database. Phase 1 replaces this
 * with an interactive bootstrap.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  PERMISSION_CATALOGUE,
  ROLE_DEFINITIONS,
  permissionsForRole,
} from '../src/auth/permission-catalogue';

const prisma = new PrismaClient();

export const DEMO_ORG_SLUG = 'demo-org';
export const DEMO_ADMIN_EMAIL = 'admin@merline.org';
export const DEMO_PROJECT_NAME = 'Kenya Health Impact Evaluation';

async function main() {
  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
    12,
  );

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Demo Organization',
      slug: DEMO_ORG_SLUG,
      settings: { locale: 'en', timezone: 'UTC' },
    },
  });

  // ─── PHASE 1: seed the permission catalogue ───
  //
  // Nothing in the codebase created Permission rows before this, so the table
  // could only ever be read. Enabling PermissionGuard against an empty table
  // would have denied every decorated route, including for the administrator.
  // Seeding must therefore happen before enforcement.
  await prisma.permission.createMany({
    data: PERMISSION_CATALOGUE.map((permission) => ({
      id: uuidv4(),
      slug: permission.slug,
      name: permission.name,
      module: permission.module,
      organizationId: org.id,
    })),
    skipDuplicates: true,
  });

  const permissionsBySlug = new Map(
    (
      await prisma.permission.findMany({ where: { organizationId: org.id } })
    ).map((permission) => [permission.slug, permission]),
  );

  const rolesBySlug = new Map<string, { id: string }>();

  for (const definition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        slug_organizationId: {
          slug: definition.slug,
          organizationId: org.id,
        },
      },
      update: { name: definition.name, description: definition.description },
      create: {
        id: uuidv4(),
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        organizationId: org.id,
        isSystem: true,
      },
    });
    rolesBySlug.set(definition.slug, role);

    const permissionIds = permissionsForRole(definition)
      .map((slug) => permissionsBySlug.get(slug)?.id)
      .filter((id): id is string => Boolean(id));

    await prisma.permissionRole.createMany({
      data: permissionIds.map((permissionId) => ({
        permissionId,
        roleId: role.id,
      })),
      skipDuplicates: true,
    });
  }

  const adminRole = rolesBySlug.get('administrator');
  if (!adminRole) {
    throw new Error('Administrator role was not seeded');
  }

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: {},
    create: {
      id: uuidv4(),
      email: DEMO_ADMIN_EMAIL,
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      organizationId: org.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.roleUser.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const existingProject = await prisma.project.findFirst({
    where: { name: DEMO_PROJECT_NAME, organizationId: org.id },
  });

  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        id: uuidv4(),
        name: DEMO_PROJECT_NAME,
        description:
          'A comprehensive health impact evaluation across select counties in Kenya.',
        status: 'active',
        organizationId: org.id,
        createdById: admin.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    }));

  console.log('Core seed completed.');
  console.log(`  organization: ${org.slug}`);
  console.log(`  admin:        ${admin.email}`);
  console.log(`  project:      ${project.name}`);
  console.log(
    'Legacy MERL fixtures are not seeded. Run `npm run prisma:seed:legacy` if needed.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
