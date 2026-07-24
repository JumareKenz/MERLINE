'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MainContent } from '@/components/layout/main-content';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300 ease-standard',
          sidebarCollapsed ? 'lg:ml-[52px]' : 'lg:ml-[220px]'
        )}
      >
        <Header />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
