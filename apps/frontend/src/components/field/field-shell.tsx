'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, CloudUpload, UsersRound } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { useAuthStore } from '@/stores/auth-store';
import { summarizeOutbox, useFieldOutbox } from '@/stores/field-outbox-store';
import { cn } from '@/lib/utils';
import { SyncPill } from './sync-status';
import { AccountSheet } from './account-sheet';

const NAV = [
  { href: '/field', label: 'Today', icon: CalendarCheck, match: (p: string) => p === '/field' || p.startsWith('/field/interview') },
  { href: '/field/participants', label: 'People', icon: UsersRound, match: (p: string) => p.startsWith('/field/participants') },
  { href: '/field/uploads', label: 'Uploads', icon: CloudUpload, match: (p: string) => p.startsWith('/field/uploads') },
];

/**
 * The field app's frame — deliberately not the admin shell with parts
 * hidden. A compact navy bar (where am I, is my work safe) and a thumb-reach
 * bottom bar with three destinations. No research, review or admin
 * navigation exists here at all.
 */
export function FieldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id);
  const start = useFieldOutbox((s) => s.start);
  const { pending } = summarizeOutbox(useFieldOutbox((s) => s.recordings));

  useEffect(() => {
    if (userId) start(userId);
  }, [userId, start]);

  // Once signed in, make every field screen (and its code) available
  // offline — including the interview screen, even if it has never been
  // opened on this device yet.
  useEffect(() => {
    if (!userId || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.active?.postMessage({
          type: 'warm',
          urls: ['/field', '/field/interview', '/field/uploads', '/field/participants', '/field/participants/new', '/offline.html'],
        }),
      )
      .catch(() => undefined);
  }, [userId]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-field-paper text-foreground">
      <header className="pt-safe sticky top-0 z-sticky bg-navy text-white shadow-[0_1px_0_hsl(0_0%_100%/0.06)]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <Link href="/field" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lemon" aria-label="Merline Field, today">
            <Logo variant="mark" theme="dark" height={26} />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Field</span>
          </Link>
          <div className="flex-1" />
          <SyncPill />
          <AccountSheet />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-5">
        {children}
      </main>

      <nav
        aria-label="Field app"
        className="pb-safe fixed inset-x-0 bottom-0 z-sticky border-t border-field-line bg-field-card shadow-[0_-1px_12px_hsl(var(--shadow-color)/0.06)]"
      >
        <ul className="mx-auto grid h-[68px] max-w-xl grid-cols-3">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-full flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    active ? 'text-navy dark:text-white' : 'text-foreground-tertiary',
                  )}
                >
                  <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', active && 'bg-lemon text-lemon-foreground')}>
                    <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  </span>
                  {item.label}
                  {item.href === '/field/uploads' && pending > 0 && (
                    <span className="absolute right-[calc(50%-30px)] top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1 text-[11px] font-bold text-white tabular-nums">
                      {pending}
                      <span className="sr-only"> waiting</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
