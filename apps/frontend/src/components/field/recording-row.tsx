'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, CloudOff, Loader2, Mic, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatBytes } from '@/components/interviews/recording-player';
import type { LocalRecording } from '@/lib/field/types';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { cn, formatDateTime, formatDuration } from '@/lib/utils';

function describe(r: LocalRecording, online: boolean) {
  switch (r.status) {
    case 'uploaded':
      return { icon: CheckCircle2, tone: 'ok', label: `Uploaded${r.uploadedAt ? ` ${formatDateTime(r.uploadedAt)}` : ''}` };
    case 'uploading': {
      const pct = r.totalParts ? Math.round((r.uploadedParts.length / r.totalParts) * 100) : 0;
      return { icon: Loader2, tone: 'busy', label: `Uploading · ${pct}%`, pct };
    }
    case 'recording':
      return { icon: Mic, tone: 'busy', label: 'Recording now' };
    case 'blocked':
      return { icon: AlertTriangle, tone: 'bad', label: r.lastError ?? 'The server refused this recording' };
    case 'failed':
      return online
        ? { icon: Clock3, tone: 'wait', label: r.lastError ? `Will retry · ${r.lastError}` : 'Will retry shortly' }
        : { icon: CloudOff, tone: 'wait', label: 'Waiting for a connection' };
    default:
      return online ? { icon: Clock3, tone: 'wait', label: 'Queued' } : { icon: CloudOff, tone: 'wait', label: 'Waiting for a connection' };
  }
}

/** One recording held on this device, with its honest upload state. */
export function RecordingRow({ recording: r, compact }: { recording: LocalRecording; compact?: boolean }) {
  const { online, retry, remove } = useFieldOutbox();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const d = describe(r, online);
  const Icon = d.icon;
  const pct = 'pct' in d ? (d.pct as number) : null;

  return (
    <li className="rounded-2xl bg-field-card px-4 py-3.5 ring-1 ring-field-line">
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0',
            d.tone === 'ok' && 'text-success',
            d.tone === 'busy' && 'animate-spin text-navy dark:text-lemon',
            d.tone === 'wait' && 'text-foreground-tertiary',
            d.tone === 'bad' && 'text-error',
            r.status === 'recording' && 'animate-none text-recording',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          {!compact && <p className="truncate text-[16px] font-semibold text-foreground">{r.participantName ?? 'Interview recording'}</p>}
          <p className={cn('text-[15px]', compact ? 'font-medium text-foreground' : 'text-foreground-secondary')}>
            {formatDuration(r.durationMs)} · {formatBytes(r.size)} · {formatDateTime(r.createdAt)}
            {r.recovered ? ' · recovered' : ''}
          </p>
          <p className={cn('mt-0.5 text-[14px]', d.tone === 'bad' ? 'text-foreground-error' : 'text-foreground-secondary')} role={d.tone === 'bad' ? 'alert' : undefined}>
            {d.label}
          </p>
          {pct !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-field-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
              <div className="h-full rounded-full bg-lemon-600 transition-[width] duration-base" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      {(r.status === 'failed' || r.status === 'blocked') && (
        <div className="mt-3 flex gap-2 pl-8">
          {r.status === 'failed' && (
            <Button variant="secondary" size="default" disabled={!online} onClick={() => retry(r.id)}>
              <RotateCw className="h-4 w-4" aria-hidden /> Retry now
            </Button>
          )}
          {r.status === 'blocked' && (
            <Button variant="ghost" size="default" className="text-error" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden /> Delete from phone
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this recording from the phone?"
        description="It has not been uploaded and cannot be recovered afterwards. Only do this if the server has refused it (for example, consent does not permit recording) and your research lead agrees."
        confirmLabel="Delete recording"
        variant="danger"
        onConfirm={async () => {
          await remove(r.id);
          setConfirmDelete(false);
        }}
      />
    </li>
  );
}
