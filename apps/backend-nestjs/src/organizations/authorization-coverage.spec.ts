/**
 * Guard rail: every route of every active controller declares
 * @Permissions, unless it is listed below as open by design.
 *
 * PermissionGuard treats an undecorated route as "authenticated only".
 * That is how, before this test covered the whole app, any signed-in user
 * — a field interviewer included — could rewrite roles and permissions,
 * edit other tenants' project teams, change AI prompts and read the audit
 * log. A new undecorated route anywhere fails this test.
 */
import 'reflect-metadata';
import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AppModule } from '../app.module';

/** Routes intentionally open to any signed-in member (or public). */
const OPEN_BY_DESIGN = new Set([
  // Own organization only (resolved from the token).
  'OrganizationsController.findAll',
  'OrganizationsController.findById',
  // The caller's own session and profile.
  'AuthController.logout',
  'AuthController.refresh',
  'AuthController.me',
  'AuthController.getProfile',
  'AuthController.updateProfile',
  'AuthController.changePassword',
  // The caller's own notifications (scoped by user id in the service).
  'NotificationsController.findAll',
  'NotificationsController.getUnreadCount',
  'NotificationsController.markAsRead',
  'NotificationsController.markAllAsRead',
  'NotificationsController.remove',
  'NotificationsController.delete',
  // Liveness/readiness probes.
  'HealthController.check',
  'HealthController.health',
  'HealthController.ready',
]);

type Ctor = { name: string; prototype: Record<string, unknown> };

function activeControllers(): Ctor[] {
  const imports = (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ??
    []) as unknown[];
  const controllers: Ctor[] = [];
  for (const mod of imports) {
    if (typeof mod !== 'function') continue; // dynamic modules (config, throttler)
    const list = (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, mod) ??
      []) as Ctor[];
    controllers.push(...list);
  }
  return controllers;
}

describe('authorization coverage (all active controllers)', () => {
  const controllers = activeControllers();

  it('finds the active controllers', () => {
    expect(controllers.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'InterviewsController',
        'ProjectTeamsController',
        'RolesController',
        'FieldController',
        'FieldTeamController',
        'AiController',
      ]),
    );
  });

  for (const controller of controllers) {
    const proto = controller.prototype;
    const classPublic = Boolean(
      Reflect.getMetadata(IS_PUBLIC_KEY, controller) as boolean | undefined,
    );
    const routes = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' &&
        typeof proto[name] === 'function' &&
        Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
    );

    for (const route of routes) {
      const key = `${controller.name}.${route}`;
      const handler = proto[route] as object;
      const isPublic =
        classPublic ||
        Boolean(
          Reflect.getMetadata(IS_PUBLIC_KEY, handler) as boolean | undefined,
        );
      if (isPublic || OPEN_BY_DESIGN.has(key)) continue;
      it(`${key} declares @Permissions`, () => {
        const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler) as
          string[] | undefined;
        expect(permissions?.length ?? 0).toBeGreaterThan(0);
      });
    }
  }
});
