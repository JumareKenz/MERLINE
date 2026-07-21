'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission, hasAnyPermission, can, getModulePermissions, type PermissionModule, type PermissionAction } from '@/lib/permissions';

export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);

  return useMemo(
    () => ({
      permissions,
      can: (slug: string) => can(permissions, slug),
      hasPermission: (module: PermissionModule, action: PermissionAction) =>
        hasPermission(permissions, module, action),
      hasAnyPermission: (module: PermissionModule) =>
        hasAnyPermission(permissions, module),
      getModulePermissions: (module: PermissionModule) =>
        getModulePermissions(permissions, module),
      isAdmin: permissions.some((p) => p.slug === 'admin.*' || p.slug === '*'),
    }),
    [permissions]
  );
}
