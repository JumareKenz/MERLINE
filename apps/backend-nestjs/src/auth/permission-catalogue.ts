/**
 * PHASE 1 — PLATFORM SAFETY
 *
 * The permission catalogue and the roles it maps to.
 *
 * Before Phase 1 the RBAC tables existed and `PermissionGuard` was written,
 * but **no code path anywhere created a `Permission` row**. The table could
 * only be read. Enabling the guard in that state would have returned
 * "Insufficient permissions" for every decorated route, including for
 * administrators — which is why the order matters:
 *
 *     define catalogue -> seed -> attach to roles -> decorate -> enforce
 *
 * Slugs are `<action>.<module>` to match the shape the frontend's
 * `lib/permissions.ts` already expects.
 */

export interface PermissionDefinition {
  slug: string;
  name: string;
  module: string;
}

function crud(module: string, label: string, actions: string[]): PermissionDefinition[] {
  return actions.map((action) => ({
    slug: `${action}.${module}`,
    name: `${action[0].toUpperCase()}${action.slice(1)} ${label}`,
    module,
  }));
}

/**
 * Qualitative modules only. Legacy MERL permissions (studies, indicators,
 * questionnaires, submissions) are deliberately absent — those modules are
 * deregistered, so granting access to them would be meaningless.
 *
 * Phase 2 adds: guides, participants, consents, interviews, recordings,
 * transcripts, findings, approvals.
 */
export const PERMISSION_CATALOGUE: PermissionDefinition[] = [
  ...crud('projects', 'Projects', ['view', 'create', 'edit', 'delete']),
  ...crud('media', 'Media', ['view', 'upload', 'delete']),
  ...crud('users', 'Users', ['view', 'create', 'edit', 'delete', 'invite']),
  ...crud('roles', 'Roles', ['view', 'create', 'edit', 'delete']),
  ...crud('organizations', 'Organization', ['view', 'edit']),
  ...crud('workspaces', 'Workspaces', ['view', 'create', 'edit', 'delete']),
  ...crud('ai', 'AI Assistant', ['use', 'view', 'configure']),
  ...crud('audit', 'Audit Log', ['view', 'export']),
  ...crud('reports', 'Reports', ['view', 'create', 'export']),
];

export const PERMISSION_SLUGS = PERMISSION_CATALOGUE.map((p) => p.slug);

/**
 * Roles for the qualitative product.
 *
 * `researcher` and `reviewer` are separated deliberately so that dual-control
 * approval becomes a configuration choice in Phase 2 rather than a schema
 * change: a researcher can propose findings but not approve them.
 *
 * `field-interviewer` is intentionally narrow. A field device is the most
 * likely thing to be lost or shared, so it gets the least authority — notably
 * no access to transcripts when those arrive.
 */
export interface RoleDefinition {
  slug: string;
  name: string;
  description: string;
  /** `'*'` grants every permission in the catalogue. */
  permissions: string[] | '*';
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    slug: 'administrator',
    name: 'Administrator',
    description: 'Full access to the organization and its settings',
    permissions: '*',
  },
  {
    slug: 'research-lead',
    name: 'Research Lead',
    description: 'Owns projects end to end, including approval',
    permissions: [
      'view.projects', 'create.projects', 'edit.projects',
      'view.media', 'upload.media',
      'view.users',
      'use.ai', 'view.ai',
      'view.reports', 'create.reports', 'export.reports',
      'view.audit',
    ],
  },
  {
    slug: 'researcher',
    name: 'Researcher',
    description: 'Designs research and analyses material; cannot approve',
    permissions: [
      'view.projects', 'edit.projects',
      'view.media', 'upload.media',
      'use.ai', 'view.ai',
      'view.reports', 'create.reports',
    ],
  },
  {
    slug: 'field-interviewer',
    name: 'Field Interviewer',
    description: 'Conducts assigned interviews in the field',
    permissions: ['view.projects', 'upload.media'],
  },
  {
    slug: 'reviewer',
    name: 'Reviewer',
    description: 'Independent quality gate for transcripts and findings',
    permissions: ['view.projects', 'view.media', 'view.reports'],
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to reports',
    permissions: ['view.projects', 'view.reports'],
  },
];

export function permissionsForRole(role: RoleDefinition): string[] {
  return role.permissions === '*' ? PERMISSION_SLUGS : role.permissions;
}
