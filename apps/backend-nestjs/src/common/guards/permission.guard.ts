import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Authorization.
 *
 * This guard was written but never applied to anything, so the effective model
 * was "any authenticated user can do anything". It is now bound globally in
 * `app.module.ts`.
 *
 * It only enforces on routes that carry `@Permissions(...)`. That is
 * deliberate: an undecorated route stays merely authenticated rather than
 * failing closed, so adding the guard globally could not break every endpoint
 * at once. Decorating the remaining routes is incremental work, tracked in
 * LEGACY.md.
 *
 * Permissions are scoped to the caller's organization. Roles are per-tenant,
 * so a role id from another organization must not grant anything here.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const userRoles = await this.prisma.roleUser.findMany({
      where: {
        userId: user.id,
        // Tenant-scoped: a role belonging to another organization grants
        // nothing, even if the join row somehow exists.
        role: { organizationId: user.organizationId },
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const granted = new Set(
      userRoles.flatMap((ru) => ru.role.permissions.map((rp) => rp.permission.slug)),
    );

    const missing = requiredPermissions.filter(
      (permission) => !granted.has(permission) && !granted.has(this.wildcardFor(permission)),
    );

    if (missing.length > 0) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /** `edit.projects` is also satisfied by the module wildcard `projects.*`. */
  private wildcardFor(permission: string): string {
    const [, module] = permission.split('.');
    return `${module}.*`;
  }
}
