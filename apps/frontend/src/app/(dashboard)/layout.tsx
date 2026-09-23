'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MainContent } from '@/components/layout/main-content';
import { useSession } from '@/hooks/use-session';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { isFieldOnly } = useSession();
  const router = useRouter();

  // A field interviewer has no business in the research workspace; the API
  // already refuses them its data. Send them to the app built for them
  // rather than showing a shell full of permission errors.
  useEffect(() => {
    if (isFieldOnly) router.replace('/field');
  }, [isFieldOnly, router]);

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-toast rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-base ease-standard',
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[248px]',
        )}
      >
        <Header />
        <MainContent>{isFieldOnly ? null : children}</MainContent>
      </div>
    </div>
  );
}
