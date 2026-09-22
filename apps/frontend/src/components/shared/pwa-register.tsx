'use client';

import { useEffect } from 'react';

/** Registers the app-shell service worker. Silently no-ops where unsupported. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability degrades gracefully — the app still works without it.
    });
  }, []);

  return null;
}
