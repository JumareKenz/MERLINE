'use client';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
      <p className="text-foreground-secondary mb-4">
        {error.message || 'Something went wrong loading this page.'}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}
