import type { PrismaClient } from '@prisma/client';

/**
 * PHASE 2 — field-worker data scoping.
 *
 * `view.interviews` / `view.participants` are organization-wide permissions.
 * That is right for researchers and reviewers, but a field interviewer's
 * device is the most likely thing in the system to be lost or shared, so a
 * user whose *only* role is `field-interviewer` sees just their own work:
 * interviews assigned to them, and participants they registered or are
 * interviewing. The field app used to filter this client-side; the API is
 * now the authority.
 *
 * Returns the user id to scope by, or `null` when the user holds any other
 * role in their organization (and therefore sees organization-wide data, as
 * their permissions already allow).
 */
export const FIELD_ROLE_SLUG = 'field-interviewer';

type RoleReader = Pick<PrismaClient, 'roleUser'>;

export async function resolveFieldScope(
  prisma: RoleReader,
  userId: string | undefined,
  organizationId: string,
): Promise<string | null> {
  if (!userId) return null;

  const roles = await prisma.roleUser.findMany({
    where: { userId, role: { organizationId } },
    select: { role: { select: { slug: true } } },
  });

  if (roles.length === 0) return null;
  return roles.every((r) => r.role.slug === FIELD_ROLE_SLUG) ? userId : null;
}
