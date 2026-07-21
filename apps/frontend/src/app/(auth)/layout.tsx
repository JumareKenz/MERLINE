import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-4">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Merline</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Monitoring, Evaluation, Research & Learning
          </p>
        </div>
        <div className="rounded-xl bg-background-elevated p-6 shadow-3 border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
