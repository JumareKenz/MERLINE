import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Moves a member to the Trash. The one implementation behind both
 * DELETE /users/:id and DELETE /organizations/:orgId/members/:userId:
 * they are signed out everywhere at once (token version bump), their field
 * access code stops working, and they cannot sign in until restored. You
 * cannot delete yourself, and an organization always keeps one
 * administrator. Their interviews, consents and findings stay attributed.
 */
export async function softDeleteUser(
  db: PrismaClient | Prisma.TransactionClient,
  id: string,
  organizationId: string,
  actorId?: string,
) {
  const user = await db.user.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    throw new NotFoundException(`User with id "${id}" not found`);
  }
  if (actorId && id === actorId) {
    throw new BadRequestException('You cannot delete your own account');
  }
  if (user.roles.some((r) => r.role.slug === 'administrator')) {
    const otherAdmins = await db.user.count({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        id: { not: id },
        roles: { some: { role: { slug: 'administrator', organizationId } } },
      },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException(
        'This is the only administrator; make someone else an administrator first',
      );
    }
  }

  await db.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      fieldAccessCode: null,
      tokenVersion: { increment: 1 },
    },
  });
  return { deleted: true };
}
