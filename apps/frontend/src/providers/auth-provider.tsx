'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { APP_HOME } from '@/lib/routes';
import { API } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { clearFieldData } from '@/lib/field/idb';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import type { AuthUser } from '@/types/auth';
import type { Permission } from '@/types/role';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  fieldLogin: (code: string) => Promise<void>;
  register: (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    organization_name: string;
    organization_type: string;
    country: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * PHASE 2 — real bug fixed here: '/field-login' was missing from this list,
 * separate from and in addition to the one middleware.ts uses. This
 * component's own effect below redirects unauthenticated visitors on any
 * non-public route to '/login' — without this entry, an unauthenticated
 * field worker landing on the field login page got bounced straight to the
 * admin login before they could even see it.
 */
const PUBLIC_ROUTES = ['/login', '/field-login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    token,
    permissions,
    isAuthenticated,
    isLoading,
    setUser,
    setToken,
    setPermissions,
    setLoading,
    login: storeLogin,
    logout: storeLogout,
    hydrate,
  } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // The permission store used by usePermissions() was never populated, so
  // every permission-gated control stayed hidden. Fill it from /auth/me.
  const queryClient = useQueryClient();
  const me = useCurrentUser();
  useEffect(() => {
    const slugs = me.data?.data?.data?.permissions;
    if (isAuthenticated && slugs) {
      setPermissions(slugs.map((slug) => ({ id: slug, slug, name: slug }) as unknown as Permission));
    }
  }, [isAuthenticated, me.data, setPermissions]);

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

      if (!isAuthenticated && !isPublicRoute && pathname !== '/') {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      }

      if (isAuthenticated && isPublicRoute) {
        // On field.jrecc.org the field sign-in page's address is /login
        // (middleware rewrites it to /field-login), so the pathname alone
        // cannot tell the two apps apart. Sending a field worker to
        // APP_HOME (/projects) there produced a 404 after every sign-in.
        const onFieldHost = window.location.hostname.startsWith('field.');
        if (onFieldHost) router.push('/');
        else router.push(pathname === '/field-login' ? '/field' : APP_HOME);
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const setAuthCookie = (token: string) => {
    document.cookie = `merline-auth-token=${token};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`;
  };

  const clearAuthCookie = () => {
    document.cookie = 'merline-auth-token=;path=/;max-age=0';
  };

  const login = async (email: string, password: string, remember?: boolean) => {
    const response = await API.auth.login({ email, password, device_name: remember ? 'web' : undefined });
    const { user: authUser, token } = response.data.data;
    setAuthCookie(token.accessToken);
    storeLogin(authUser, token.accessToken);
    router.push(APP_HOME);
  };

  const fieldLogin = async (code: string) => {
    const response = await API.auth.fieldLogin(code);
    const { user: authUser, token } = response.data.data;
    setAuthCookie(token.accessToken);
    storeLogin(authUser, token.accessToken);
    // On field.jrecc.org '/' is the field home; elsewhere the field app
    // lives under /field. Never route a field worker through the admin app.
    router.push(window.location.hostname.startsWith('field.') ? '/' : '/field');
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    organization_name: string;
    organization_type: string;
    country: string;
  }) => {
    const response = await API.auth.register({
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      password: data.password,
      orgName: data.organization_name,
    });
    const { user: authUser, token } = response.data.data;
    setAuthCookie(token.accessToken);
    storeLogin(authUser, token.accessToken);
    router.push(APP_HOME);
  };

  const logout = async () => {
    try {
      await API.auth.logout();
    } catch {
      // ignore errors on logout
    } finally {
      clearAuthCookie();
      storeLogout();
      queryClient.clear();
      useFieldOutbox.getState().stop();
      // Forget cached participant/interview details on this device. Unsent
      // recordings are kept (irreplaceable) and stay bound to their owner.
      await clearFieldData().catch(() => undefined);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await API.auth.me();
      const profile = response.data.data;
      setUser({ ...profile, roles: profile.roles.map((r) => r.name) });
    } catch {
      clearAuthCookie();
      storeLogout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        fieldLogin,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
