'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Reflects real `navigator.onLine` state — nothing more. Deliberately does
 * NOT say "synced" or "saved": there is no offline recording queue in this
 * build (see sw.js), so implying sync status here would be exactly the kind
 * of false data-safety signal the brief warns against. This only ever
 * promises what's true: whether the device currently has a connection.
 */
export function NetworkStatus({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium',
        isOnline ? 'text-lemon-500' : 'bg-error/15 text-white',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}
