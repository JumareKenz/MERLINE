/**
 * Guard rail: every route on the organization-administration controllers
 * must declare @Permissions. Undecorated routes are "authenticated only"
 * under PermissionGuard, which is how any signed-in user — a field
 * interviewer included — could rewrite roles and permissions, including
 * their own. A new undecorated route here fails this test.
 */
import { PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { OrganizationsController } from './organizations.controller';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { WorkspacesController } from './workspaces.controller';

const CONTROLLERS = [
  OrganizationsController,
  RolesController,
  WorkspacesController,
  PermissionsController,
];

/** Routes intentionally open to any member of the organization. */
const OPEN_BY_DESIGN = new Set([
  'OrganizationsController.findAll', // returns only the caller's own org
  'OrganizationsController.findById', // own org only
]);

describe('organization administration authorization coverage', () => {
  for (const controller of CONTROLLERS) {
    const proto = controller.prototype as unknown as Record<string, unknown>;
    const routes = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' &&
        typeof proto[name] === 'function' &&
        Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
    );

    it(`${controller.name} has routes`, () => {
      expect(routes.length).toBeGreaterThan(0);
    });

    for (const route of routes) {
      const key = `${controller.name}.${route}`;
      if (OPEN_BY_DESIGN.has(key)) continue;
      it(`${key} declares @Permissions`, () => {
        const permissions = Reflect.getMetadata(
          PERMISSIONS_KEY,
          proto[route] as object,
        ) as string[] | undefined;
        expect(permissions?.length ?? 0).toBeGreaterThan(0);
      });
    }
  }
});
