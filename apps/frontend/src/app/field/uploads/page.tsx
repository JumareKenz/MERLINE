'use client';

import { CloudOff, HardDrive, RefreshCw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordingRow } from '@/components/field/recording-row';
import { useSyncState } from '@/components/field/sync-status';
import { formatBytes } from '@/components/interviews/recording-player';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { formatDateTime } from '@/lib/utils';

/**
 * Everything recorded on this phone and where it is. The only place that
 * says "uploaded" is a recording the server has confirmed, checksum and all.
 */
export default function FieldUploadsPage() {
  const { recordings, online, running, kick, storage, lastRunAt, available } = useFieldOutbox();
  const sync = useSyncState();
  const pending = recordings.filter((r) => r.status !== 'uploaded');
  const done = recordings.filter((r) => r.status === 'uploaded').slice(0, 20);

  return (
    <div className="space-y-7">
      <header>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">Uploads</h1>
        <p className="mt-1 text-[16px] text-foreground-secondary">{sync.label}</p>
      </header>

      {!available ? (
        <p className="rounded-2xl bg-warning-bg px-4 py-3.5 text-[15px] text-foreground" role="alert">
          This browser won’t let Merline store recordings on the phone (private browsing can do this). Recording offline is not available here.
        </p>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-navy px-4 py-4 text-white">
          {online ? <UploadCloud className="h-6 w-6 shrink-0 text-lemon" aria-hidden /> : <CloudOff className="h-6 w-6 shrink-0 text-lemon" aria-hidden />}
          <p className="flex-1 text-[15px] leading-snug">
            {online
              ? pending.length > 0
                ? 'Uploading in small parts. Keep Merline open to finish faster — progress is kept if you close it.'
                : 'Nothing waiting. New recordings upload by themselves.'
              : 'No connection. Recordings are safe on this phone and will upload when you’re back online with the app open.'}
          </p>
          {online && pending.length > 0 && (
            <Button variant="accent" onClick={() => kick()} loading={running} aria-label="Upload now">
              {!running && <RefreshCw className="h-4 w-4" aria-hidden />} Now
            </Button>
          )}
        </div>
      )}

      <section aria-labelledby="waiting-heading" className="space-y-3">
        <h2 id="waiting-heading" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
          On this phone · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-field-card px-4 py-5 text-center text-[15px] text-foreground-secondary ring-1 ring-field-line">
            No recordings waiting.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <RecordingRow key={r.id} recording={r} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby="done-heading" className="space-y-3">
          <h2 id="done-heading" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
            Uploaded recently
          </h2>
          <ul className="space-y-2">
            {done.map((r) => (
              <RecordingRow key={r.id} recording={r} />
            ))}
          </ul>
        </section>
      )}

      <footer className="space-y-1 text-[14px] text-foreground-tertiary">
        {storage && (
          <p className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" aria-hidden />
            {formatBytes(storage.usage)} used of {formatBytes(storage.quota)} available to Merline
            {storage.persisted ? ' · protected from automatic clean-up' : ''}
          </p>
        )}
        {lastRunAt && <p>Last checked {formatDateTime(lastRunAt)}</p>}
      </footer>
    </div>
  );
}
