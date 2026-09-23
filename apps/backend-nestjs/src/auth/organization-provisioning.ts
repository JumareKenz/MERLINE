import type { Prisma, PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  PERMISSION_CATALOGUE,
  ROLE_DEFINITIONS,
  permissionsForRole,
} from './permission-catalogue';

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Gives an organization the full permission catalogue and the standard
 * roles, with each role's permissions attached. Idempotent: existing
 * permission rows, roles and grants are kept, and only what is missing is
 * added — so it is safe to run on every registration and as a repair.
 *
 * Why this exists: permissions are per-organization rows, and only the
 * seed script ever created them. Self-registration created an organization
 * and an "administrator" role with no permissions attached, so
 * PermissionGuard refused its own administrator on every decorated route.
 * (Hidden for a while because the frontend's API client never sent those
 * requests.)
 *
 * Returns the role ids by slug.
 */
export async function provisionOrganizationRoles(
  db: Db,
  organizationId: string,
): Promise<Map<string, string>> {
  // Permission has no (slug, organizationId) unique constraint, so
  // skipDuplicates cannot prevent duplicates: read what exists and insert
  // only the missing slugs. The oldest row per slug is canonical.
  const readExisting = async () => {
    const rows = await db.permission.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true },
    });
    const bySlug = new Map<string, string>();
    for (const p of rows) if (!bySlug.has(p.slug)) bySlug.set(p.slug, p.id);
    return bySlug;
  };

  let permissionIdBySlug = await readExisting();
  const missing = PERMISSION_CATALOGUE.filter(
    (p) => !permissionIdBySlug.has(p.slug),
  );
  if (missing.length > 0) {
    await db.permission.createMany({
      data: missing.map((permission) => ({
        id: uuidv4(),
        slug: permission.slug,
        name: permission.name,
        module: permission.module,
        organizationId,
      })),
    });
    permissionIdBySlug = await readExisting();
  }

  const roleIdBySlug = new Map<string, string>();
  for (const definition of ROLE_DEFINITIONS) {
    const role = await db.role.upsert({
      where: {
        slug_organizationId: { slug: definition.slug, organizationId },
      },
      update: {},
      create: {
        id: uuidv4(),
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        organizationId,
        isSystem: true,
      },
    });
    roleIdBySlug.set(definition.slug, role.id);

    const permissionIds = permissionsForRole(definition)
      .map((slug) => permissionIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await db.permissionRole.createMany({
      data: permissionIds.map((permissionId) => ({
        permissionId,
        roleId: role.id,
      })),
      skipDuplicates: true,
    });
  }

  return roleIdBySlug;
}
