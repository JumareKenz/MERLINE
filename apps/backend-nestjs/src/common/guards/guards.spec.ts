/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * Unit coverage for the two guards that were written but never applied, plus
 * the global guard chain that now binds them.
 *
 * These run everywhere, with no database. The database-backed proof that one
 * tenant cannot read another's rows lives in `test/tenancy.integration-spec.ts`.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PermissionGuard } from './permission.guard';
import { TenantGuard } from './tenant.guard';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

/**
 * The guards read two different metadata keys. A mock that returns one value
 * for every key makes `@Permissions(...)` metadata look like `@Public()`,
 * which silently short-circuits the guard under test.
 */
function reflectorFor(options: { isPublic?: boolean; permissions?: string[] }): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === IS_PUBLIC_KEY) return options.isPublic;
      if (key === PERMISSIONS_KEY) return options.permissions;
      return undefined;
    },
  } as unknown as Reflector;
}

describe('TenantGuard', () => {
  const ORG = 'org-a';

  it('rejects a request with no organization on the user', () => {
    const guard = new TenantGuard(reflectorFor({}));
    expect(() => guard.canActivate(contextFor({ user: {}, params: {} }))).toThrow(
      ForbiddenException,
    );
  });

  it('puts the caller organization on the request as tenantId', () => {
    const guard = new TenantGuard(reflectorFor({}));
    const request: Record<string, unknown> = {
      user: { organizationId: ORG },
      params: {},
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(request.tenantId).toBe(ORG);
  });

  it('allows an org route param that matches the caller', () => {
    const guard = new TenantGuard(reflectorFor({}));
    const request = { user: { organizationId: ORG }, params: { orgId: ORG } };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('rejects an org route param belonging to another tenant', () => {
    // The hole behind `GET /organizations/:orgId/members`: the path parameter
    // was trusted, so any authenticated user could read another org.
    const guard = new TenantGuard(reflectorFor({}));
    const request = { user: { organizationId: ORG }, params: { orgId: 'org-b' } };

    expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
  });

  it('rejects a mismatched organizationId param too', () => {
    const guard = new TenantGuard(reflectorFor({}));
    const request = {
      user: { organizationId: ORG },
      params: { organizationId: 'org-b' },
    };

    expect(() => guard.canActivate(contextFor(request))).toThrow(ForbiddenException);
  });

  it('lets public routes through', () => {
    const guard = new TenantGuard(reflectorFor({ isPublic: true }));
    expect(guard.canActivate(contextFor({ params: {} }))).toBe(true);
  });
});

describe('PermissionGuard', () => {
  function prismaWithPermissions(slugs: string[], organizationId = 'org-a') {
    return {
      roleUser: {
        findMany: jest.fn().mockResolvedValue([
          {
            role: {
              organizationId,
              permissions: slugs.map((slug) => ({ permission: { slug } })),
            },
          },
        ]),
      },
    } as any;
  }

  it('allows an undecorated route through', async () => {
    // Deliberate: binding the guard globally must not fail every endpoint that
    // has not been decorated yet.
    const guard = new PermissionGuard(reflectorFor({}), prismaWithPermissions([]));
    await expect(guard.canActivate(contextFor({ user: { id: 'u1' } }))).resolves.toBe(true);
  });

  it('allows a caller holding the required permission', async () => {
    const guard = new PermissionGuard(
      reflectorFor({ permissions: ['view.projects'] }),
      prismaWithPermissions(['view.projects']),
    );

    await expect(
      guard.canActivate(contextFor({ user: { id: 'u1', organizationId: 'org-a' } })),
    ).resolves.toBe(true);
  });

  it('denies a caller missing the required permission', async () => {
    const guard = new PermissionGuard(
      reflectorFor({ permissions: ['delete.projects'] }),
      prismaWithPermissions(['view.projects']),
    );

    await expect(
      guard.canActivate(contextFor({ user: { id: 'u1', organizationId: 'org-a' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('accepts a module wildcard', async () => {
    const guard = new PermissionGuard(
      reflectorFor({ permissions: ['edit.projects'] }),
      prismaWithPermissions(['projects.*']),
    );

    await expect(
      guard.canActivate(contextFor({ user: { id: 'u1', organizationId: 'org-a' } })),
    ).resolves.toBe(true);
  });

  it('scopes the role lookup to the caller organization', async () => {
    const prisma = prismaWithPermissions(['view.projects']);
    const guard = new PermissionGuard(reflectorFor({ permissions: ['view.projects'] }), prisma);

    await guard.canActivate(contextFor({ user: { id: 'u1', organizationId: 'org-a' } }));

    // A role from another tenant must not be able to grant anything.
    expect(prisma.roleUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'u1',
          role: { organizationId: 'org-a' },
        }),
      }),
    );
  });

  it('denies an unauthenticated caller on a decorated route', async () => {
    const guard = new PermissionGuard(reflectorFor({ permissions: ['view.projects'] }), prismaWithPermissions([]));
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(ForbiddenException);
  });
});
