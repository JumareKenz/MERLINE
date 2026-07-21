import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/auth';
import type { Permission } from '@/types/role';
import { clearStoredAuth, getStoredToken, setStoredToken } from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  setPermissions: (permissions: Permission[]) => void;
  setLoading: (loading: boolean) => void;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        setStoredToken(token);
        set({ token });
      },
      setPermissions: (permissions) => set({ permissions }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token) => {
        setStoredToken(token);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        clearStoredAuth();
        set({
          user: null,
          token: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        });
      },

      hydrate: () => {
        try {
          const token = getStoredToken();
          if (token) {
            const state = get();
            if (state.user && token) {
              set({ isAuthenticated: true, isLoading: false });
              return;
            }
          }
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'merline-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        permissions: state.permissions,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token;
          state.isLoading = false;
        }
      },
    }
  )
);
