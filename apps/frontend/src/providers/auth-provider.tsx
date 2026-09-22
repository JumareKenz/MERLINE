'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { APP_HOME } from '@/lib/routes';
import { API } from '@/lib/api-client';
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

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

      if (!isAuthenticated && !isPublicRoute && pathname !== '/') {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      }

      if (isAuthenticated && isPublicRoute) {
        // An authenticated field worker revisiting /field-login belongs at
        // '/' (the field app home), never APP_HOME — that's the admin app.
        router.push(pathname === '/field-login' ? '/' : APP_HOME);
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
    router.push('/');
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
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await API.auth.me();
      setUser(response.data.data);
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
