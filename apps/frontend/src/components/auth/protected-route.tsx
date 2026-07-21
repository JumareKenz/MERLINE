'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingState } from '@/components/shared/loading-state';
import type { PermissionModule, PermissionAction } from '@/lib/permissions';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: {
    module: PermissionModule;
    action: PermissionAction;
  };
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-foreground-secondary">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
