import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main className={cn('flex-1 px-5 py-6 lg:px-8 max-w-[1600px]', className)}>
      {children}
    </main>
  );
}
