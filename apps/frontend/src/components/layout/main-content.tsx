import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function MainContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" tabIndex={-1} className={cn('w-full flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8', className)}>
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </main>
  );
}
