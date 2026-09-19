import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Establishes the tenant for every authenticated request, and closes the
 * path-parameter hole.
 *
 * Before Phase 1 this guard existed but was never applied to anything, and
 * organisation scoping was left to individual services — which mostly did not
 * do it. `GET /projects?organizationId=<other-org>` took the tenant straight
 * from the query string, and `GET /organizations/:orgId/members` took it from
 * the path, so any authenticated user could read another tenant's data.
 *
 * Two jobs:
 *
 *   1. Put the caller's organisation on the request as `tenantId`. Services
 *      take it from there (or from `@CurrentUser()`), never from client input.
 *
 *   2. Reject any request whose organisation-shaped route parameter does not
 *      match the caller's organisation. Routes are still free to accept
 *      `:orgId` for readability; it just cannot be used to cross tenants.
 *
 * Registered globally in `app.module.ts`, after JwtAuthGuard.
 */

/** Route params that name an organisation and must match the caller's. */
const ORG_ROUTE_PARAMS = ['orgId', 'organizationId'];

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.organizationId) {
      throw new ForbiddenException('Request is not scoped to an organization');
    }

    for (const param of ORG_ROUTE_PARAMS) {
      const value = request.params?.[param];
      if (value && value !== user.organizationId) {
        // Deliberately the same message as a missing record: telling the
        // caller that the organisation exists but is not theirs is itself a
        // small disclosure.
        throw new ForbiddenException('Resource not found in this organization');
      }
    }

    request.tenantId = user.organizationId;
    return true;
  }
}
