'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
          <p className="text-foreground-secondary mb-4">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-600"
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  );
}
