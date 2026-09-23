'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CloudOff, CloudUpload, Loader2 } from 'lucide-react';
import { summarizeOutbox, useFieldOutbox } from '@/stores/field-outbox-store';
import { cn } from '@/lib/utils';

/**
 * The field app's single source of truth about data safety. It never says
 * "synced" unless every recording on this device has been confirmed by the
 * server; offline, it says so and how much is waiting.
 */
export function useSyncState() {
  const { recordings, online, running, available } = useFieldOutbox();
  const s = summarizeOutbox(recordings);
  if (!available) return { tone: 'neutral' as const, label: 'Device storage unavailable', short: 'No storage', icon: AlertTriangle, ...s };
  if (!online)
    return {
      tone: 'offline' as const,
      label: s.pending > 0 ? `Offline · ${s.pending} saved on this device` : 'Offline',
      short: s.pending > 0 ? `Offline · ${s.pending}` : 'Offline',
      icon: CloudOff,
      ...s,
    };
  if (s.blocked > 0) return { tone: 'attention' as const, label: `${s.blocked} need attention`, short: `${s.blocked} need attention`, icon: AlertTriangle, ...s };
  if (running || s.uploading > 0)
    return { tone: 'busy' as const, label: `Uploading · ${s.pending} left`, short: `Uploading ${s.pending}`, icon: Loader2, ...s };
  if (s.pending > 0) return { tone: 'waiting' as const, label: `${s.pending} waiting to upload`, short: `${s.pending} waiting`, icon: CloudUpload, ...s };
  return { tone: 'ok' as const, label: 'All recordings uploaded', short: 'Up to date', icon: CheckCircle2, ...s };
}

/** Compact pill for the navy top bar. Links to the Uploads screen. */
export function SyncPill() {
  const state = useSyncState();
  const Icon = state.icon;
  return (
    <Link
      href="/field/uploads"
      aria-label={`Sync status: ${state.label}. Open uploads.`}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lemon',
        state.tone === 'ok' && 'bg-white/10 text-lemon',
        state.tone === 'offline' && 'bg-white text-navy',
        state.tone === 'attention' && 'bg-lemon text-lemon-foreground',
        (state.tone === 'busy' || state.tone === 'waiting') && 'bg-white/15 text-white',
        state.tone === 'neutral' && 'bg-white/10 text-white',
      )}
    >
      <Icon className={cn('h-4 w-4', state.tone === 'busy' && 'animate-spin')} aria-hidden />
      <span aria-live="polite">{state.short}</span>
    </Link>
  );
}
