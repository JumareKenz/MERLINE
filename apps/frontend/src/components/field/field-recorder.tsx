'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileAudio, Mic, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RECORDING_BITRATE, queueAudioFile, useFieldRecorder } from '@/hooks/use-field-recorder';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { formatBytes } from '@/components/interviews/recording-player';
import { cn, formatDuration } from '@/lib/utils';

interface Props {
  userId: string;
  interviewId: string;
  participantName?: string;
  /** Called once, the first time capture actually starts. */
  onFirstStart?: () => void;
  /** The recording in progress (id and position), or null when not recording. */
  onLive?: (live: { recordingId: string; elapsedMs: number } | null) => void;
  onSaved?: () => void;
}

/** A calm, legible input meter: five bars, no waveform theatre. */
function LevelBars({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {[0.15, 0.35, 0.55, 0.75, 0.9].map((threshold, i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 rounded-full transition-[height,background-color] duration-100',
            active && level >= threshold ? 'bg-lemon' : 'bg-white/25',
          )}
          style={{ height: `${10 + i * 5}px` }}
        />
      ))}
    </div>
  );
}

function FilePicker({ userId, interviewId, participantName, onSaved }: Omit<Props, 'onFirstStart'>) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useFieldOutbox((s) => s.refresh);
  const kick = useFieldOutbox((s) => s.kick);

  return (
    <div className="rounded-2xl border border-dashed border-field-line bg-field-card p-4">
      <label htmlFor={id} className="flex items-center gap-3 text-[15px] font-medium text-foreground">
        <FileAudio className="h-5 w-5 text-foreground-tertiary" aria-hidden />
        Add an audio file from this phone
      </label>
      <input
        id={id}
        ref={ref}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            await queueAudioFile(file, { userId, interviewId, participantName });
            await refresh();
            void kick();
            setMessage(`${file.name} saved on this phone and queued for upload.`);
            onSaved?.();
          } catch {
            setMessage('The file could not be saved on this phone. Check free storage.');
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = '';
          }
        }}
      />
      <Button variant="secondary" size="lg" className="mt-3 w-full" loading={busy} onClick={() => ref.current?.click()}>
        Choose file
      </Button>
      {message && (
        <p className="mt-2 text-[14px] text-foreground-secondary" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * The recording surface. Audio is written to this phone every few seconds
 * while recording, so nothing here depends on a connection, and closing
 * the app loses at most the last few seconds.
 */
export function FieldRecorder({ userId, interviewId, participantName, onFirstStart, onLive, onSaved }: Props) {
  const rec = useFieldRecorder({ userId, interviewId, participantName });

  useEffect(() => {
    onLive?.(rec.recordingId ? { recordingId: rec.recordingId, elapsedMs: rec.elapsedMs } : null);
  }, [rec.recordingId, rec.elapsedMs, onLive]);
  const startedOnce = useRef(false);
  const live = rec.phase === 'recording' || rec.phase === 'paused';

  useEffect(() => {
    if (rec.phase === 'recording' && !startedOnce.current) {
      startedOnce.current = true;
      onFirstStart?.();
    }
    if (rec.phase === 'saved') onSaved?.();
  }, [rec.phase, onFirstStart, onSaved]);

  // Warn before a reload or tab close mid-recording. Audio so far is kept
  // either way; this just avoids stopping by accident.
  useEffect(() => {
    if (!live) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [live]);

  if (rec.phase === 'unsupported' || rec.phase === 'denied') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-warning-bg px-4 py-3.5 text-[15px] leading-relaxed text-foreground" role="alert">
          {rec.phase === 'denied'
            ? 'Microphone access is blocked. Allow the microphone for this site in your browser settings, or add a recording made with another app.'
            : 'This browser cannot record here. Add a recording made with another app instead.'}
        </div>
        <FilePicker userId={userId} interviewId={interviewId} participantName={participantName} onSaved={onSaved} />
      </div>
    );
  }

  if (rec.phase === 'saved' && rec.savedRecording) {
    const r = rec.savedRecording;
    return (
      <div className="rounded-2xl bg-field-card p-5 ring-1 ring-field-line animate-rise-in">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-[18px] font-semibold text-foreground">Saved on this phone</p>
            <p className="mt-1 text-[15px] text-foreground-secondary">
              {formatDuration(r.durationMs)} · {formatBytes(r.size)}. It uploads automatically in small parts whenever there’s a connection.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={rec.reset}>
            <Mic className="h-5 w-5" aria-hidden /> Record more
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/field/history?view=pending">View pending</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl px-5 pb-6 pt-5 text-white transition-colors duration-slow',
          live ? 'bg-navy-deep' : 'bg-navy',
        )}
      >
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.08em]" role="status" aria-live="polite">
            {rec.phase === 'recording' && (
              <span className="relative flex h-3 w-3" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-recording-halo rounded-full bg-recording" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-recording" />
              </span>
            )}
            {rec.phase === 'recording' ? 'Recording' : rec.phase === 'paused' ? 'Paused' : rec.phase === 'saving' ? 'Saving' : rec.phase === 'requesting' ? 'Starting microphone' : 'Ready to record'}
          </p>
          <LevelBars level={rec.level} active={rec.phase === 'recording'} />
        </div>

        <p className="mt-6 text-center font-display text-[56px] font-semibold leading-none tabular-nums tracking-[-0.02em]" aria-label={`Elapsed ${formatDuration(rec.elapsedMs)}`}>
          {formatDuration(rec.elapsedMs)}
        </p>
        <p className="mt-3 text-center text-[14px] text-white/80">
          {live
            ? `Saved on this phone · ${formatBytes(rec.bytes)}`
            : `Speech-quality audio, about ${Math.round((RECORDING_BITRATE / 8) * 3600 / 1024 / 1024)} MB per hour`}
        </p>

        <div className="mt-7 flex items-center justify-center gap-6">
          {!live ? (
            <button
              type="button"
              onClick={rec.start}
              disabled={rec.phase === 'requesting' || rec.phase === 'saving'}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-lemon text-lemon-foreground shadow-[0_0_0_8px_hsl(var(--brand-lemon)/0.18)] transition-transform active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
              aria-label="Start recording"
            >
              <Mic className="h-10 w-10" aria-hidden />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={rec.phase === 'recording' ? rec.pause : rec.resume}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lemon"
                aria-label={rec.phase === 'recording' ? 'Pause recording' : 'Resume recording'}
              >
                {rec.phase === 'recording' ? <Pause className="h-7 w-7" aria-hidden /> : <Play className="h-7 w-7" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={rec.stop}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-recording transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lemon"
                aria-label="Stop and save recording"
              >
                <Square className="h-9 w-9" fill="currentColor" aria-hidden />
              </button>
            </>
          )}
        </div>
        {live && <p className="mt-4 text-center text-[13px] text-white/75">Stop saves the recording. Leaving this screen also stops and saves it.</p>}
      </div>

      {rec.error && (
        <p className="rounded-2xl bg-warning-bg px-4 py-3 text-[15px] text-foreground" role="alert">
          {rec.error}
        </p>
      )}

      {!live && rec.phase !== 'saving' && (
        <details className="rounded-2xl bg-field-card px-4 py-3 ring-1 ring-field-line">
          <summary className="cursor-pointer text-[15px] font-medium text-foreground-secondary">Use an existing audio file instead</summary>
          <div className="mt-3">
            <FilePicker userId={userId} interviewId={interviewId} participantName={participantName} onSaved={onSaved} />
          </div>
        </details>
      )}
    </div>
  );
}
