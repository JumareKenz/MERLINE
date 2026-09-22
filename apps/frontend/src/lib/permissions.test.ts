import { describe, expect, it } from 'vitest';
import { APP_HOME, ROUTES } from './routes';
import {
  can,
  getModulePermissions,
  hasAnyPermission,
  hasPermission,
} from './permissions';
import type { Permission } from '@/types/role';

/**
 * The frontend had no tests and no Vitest config, while CI called a
 * `test:ci` script that did not exist.
 *
 * Starting here deliberately: `permissions.ts` decides which controls a user
 * is shown. It is not a security boundary — the server enforces that via
 * PermissionGuard — but if it disagrees with the server, users are shown
 * actions that then fail, or are hidden from actions they hold. Both are
 * defects worth catching.
 */

const perm = (slug: string): Permission => ({ slug }) as Permission;

describe('hasPermission', () => {
  const held = [perm('view.projects'), perm('create.projects')];

  it('grants a permission the user holds', () => {
    expect(hasPermission(held, 'projects', 'view')).toBe(true);
    expect(hasPermission(held, 'projects', 'create')).toBe(true);
  });

  it('denies a permission the user does not hold', () => {
    expect(hasPermission(held, 'projects', 'delete')).toBe(false);
  });

  it('denies across modules', () => {
    expect(hasPermission(held, 'users', 'view')).toBe(false);
  });

  it('honours a module wildcard', () => {
    expect(hasPermission([perm('projects.*')], 'projects', 'delete')).toBe(true);
  });

  it('denies when the action has no slug defined for that module', () => {
    // `invite` is only meaningful for users; projects maps it to ''.
    expect(hasPermission([perm('projects.*')], 'projects', 'invite')).toBe(false);
  });

  it('denies on an empty permission set', () => {
    expect(hasPermission([], 'projects', 'view')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('is true when the user holds any permission in the module', () => {
    expect(hasAnyPermission([perm('export.reports')], 'reports')).toBe(true);
  });

  it('is false when the user holds none', () => {
    expect(hasAnyPermission([perm('view.projects')], 'reports')).toBe(false);
  });
});

describe('can', () => {
  it('matches an exact slug', () => {
    expect(can([perm('edit.studies')], 'edit.studies')).toBe(true);
  });

  it('does not match a different action on the same module', () => {
    expect(can([perm('view.studies')], 'delete.studies')).toBe(false);
  });
});

describe('getModulePermissions', () => {
  it('lists only the actions actually held', () => {
    const actions = getModulePermissions(
      [perm('view.projects'), perm('edit.projects')],
      'projects',
    );

    expect(actions.sort()).toEqual(['edit', 'view']);
  });

  it('returns nothing for a module the user cannot touch', () => {
    expect(getModulePermissions([perm('view.projects')], 'roles')).toEqual([]);
  });
});

describe('routes', () => {
  it('lands on projects, not the deregistered dashboard', () => {
    // The dashboard reads only MERL metrics from DashboardsModule, which is
    // deregistered, so it can no longer load. See LEGACY.md.
    expect(APP_HOME).toBe('/projects');
    expect(ROUTES.home).toBe(APP_HOME);
  });
});
