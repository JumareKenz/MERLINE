import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main className={cn('flex-1 px-6 py-6 lg:px-8', className)}>
      {children}
    </main>
  );
}
