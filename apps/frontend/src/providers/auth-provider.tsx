'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
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

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

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
        router.push('/dashboard');
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
    const { user: authUser, token: authToken } = response.data.data;
    setAuthCookie(authToken);
    storeLogin(authUser, authToken);
    router.push('/dashboard');
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
    const { user: authUser, token: authToken } = response.data.data;
    setAuthCookie(authToken);
    storeLogin(authUser, authToken);
    router.push('/dashboard');
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
