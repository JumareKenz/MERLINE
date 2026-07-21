import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  recentStudies: string[];
  activeModal: { type: string; props?: Record<string, unknown> } | null;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addRecentStudy: (studyId: string) => void;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'system',
      recentStudies: [],
      activeModal: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed, sidebarOpen: !collapsed }),

      setTheme: (theme) => set({ theme }),

      addRecentStudy: (studyId) => {
        const recent = get().recentStudies.filter((id) => id !== studyId);
        recent.unshift(studyId);
        if (recent.length > 5) recent.pop();
        set({ recentStudies: recent });
      },

      openModal: (type, props) => set({ activeModal: { type, props } }),
      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: 'merline-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        recentStudies: state.recentStudies,
      }),
    }
  )
);
