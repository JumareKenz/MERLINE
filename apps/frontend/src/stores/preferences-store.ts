import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  itemsPerPage: number;
  defaultView: 'card' | 'table';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };

  setItemsPerPage: (count: number) => void;
  setDefaultView: (view: 'card' | 'table') => void;
  setLanguage: (lang: string) => void;
  setTimezone: (tz: string) => void;
  updateNotifications: (prefs: Partial<PreferencesState['notifications']>) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      itemsPerPage: 25,
      defaultView: 'table',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        inApp: true,
      },

      setItemsPerPage: (itemsPerPage) => set({ itemsPerPage }),
      setDefaultView: (defaultView) => set({ defaultView }),
      setLanguage: (language) => set({ language }),
      setTimezone: (timezone) => set({ timezone }),
      updateNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),
    }),
    { name: 'merline-preferences' }
  )
);
