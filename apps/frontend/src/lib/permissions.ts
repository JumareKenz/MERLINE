import type { Permission } from '@/types/role';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'invite';

export type PermissionModule =
  | 'projects'
  | 'studies'
  | 'questionnaires'
  | 'indicators'
  | 'data_collection'
  | 'reports'
  | 'users'
  | 'roles'
  | 'workspaces'
  | 'organizations'
  | 'settings'
  | 'activity_log';

const PERMISSION_MAP: Record<PermissionModule, Record<PermissionAction, string>> = {
  projects: { view: 'view.projects', create: 'create.projects', edit: 'edit.projects', delete: 'delete.projects', approve: 'approve.projects', export: 'export.projects', invite: '' },
  studies: { view: 'view.studies', create: 'create.studies', edit: 'edit.studies', delete: 'delete.studies', approve: 'approve.studies', export: 'export.studies', invite: '' },
  questionnaires: { view: 'view.questionnaires', create: 'create.questionnaires', edit: 'edit.questionnaires', delete: 'delete.questionnaires', approve: 'approve.questionnaires', export: 'export.questionnaires', invite: '' },
  indicators: { view: 'view.indicators', create: 'create.indicators', edit: 'edit.indicators', delete: 'delete.indicators', approve: 'approve.indicators', export: 'export.indicators', invite: '' },
  data_collection: { view: 'view.data_collection', create: 'create.data_collection', edit: 'edit.data_collection', delete: 'delete.data_collection', approve: 'approve.data_collection', export: 'export.data_collection', invite: '' },
  reports: { view: 'view.reports', create: 'create.reports', edit: 'edit.reports', delete: 'delete.reports', approve: 'approve.reports', export: 'export.reports', invite: '' },
  users: { view: 'view.users', create: 'create.users', edit: 'edit.users', delete: 'delete.users', approve: '', export: 'export.users', invite: 'invite.users' },
  roles: { view: 'view.roles', create: 'create.roles', edit: 'edit.roles', delete: 'delete.roles', approve: '', export: '', invite: '' },
  workspaces: { view: 'view.workspaces', create: 'create.workspaces', edit: 'edit.workspaces', delete: 'delete.workspaces', approve: '', export: '', invite: '' },
  organizations: { view: 'view.organizations', create: '', edit: 'edit.organizations', delete: '', approve: '', export: '', invite: '' },
  settings: { view: 'view.settings', create: '', edit: 'edit.settings', delete: '', approve: '', export: '', invite: '' },
  activity_log: { view: 'view.activity_log', create: '', edit: '', delete: '', approve: '', export: 'export.activity_log', invite: '' },
};

export function hasPermission(permissions: Permission[], module: PermissionModule, action: PermissionAction): boolean {
  const slug = PERMISSION_MAP[module]?.[action];
  if (!slug) return false;
  return permissions.some((p) => p.slug === slug || p.slug === `${module}.*`);
}

export function hasAnyPermission(permissions: Permission[], module: PermissionModule): boolean {
  const modulePermissions = Object.values(PERMISSION_MAP[module]).filter(Boolean);
  return permissions.some((p) => modulePermissions.includes(p.slug) || p.slug === `${module}.*`);
}

export function can(permissions: Permission[], permissionSlug: string): boolean {
  return permissions.some((p) => p.slug === permissionSlug || p.slug === `${permissionSlug.split('.')[0]}.*`);
}

export function getModulePermissions(permissions: Permission[], module: PermissionModule): PermissionAction[] {
  return (Object.entries(PERMISSION_MAP[module]) as [PermissionAction, string][])
    .filter(([, slug]) => slug && permissions.some((p) => p.slug === slug || p.slug === `${module}.*`))
    .map(([action]) => action);
}
