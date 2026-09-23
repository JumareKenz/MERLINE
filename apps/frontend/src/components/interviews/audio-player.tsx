'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api-client';
import { cn, formatDuration } from '@/lib/utils';

export interface AudioPlayerHandle {
  /** Jump to a moment (and start playing, by default). Loads the audio if needed. */
  seekTo(ms: number, play?: boolean): void;
}

interface AudioPlayerProps {
  interviewId: string;
  mediaId: string;
  label: string;
  /** Known length, shown before the audio has loaded. */
  durationMs?: number;
  /** Current position, reported while playing (for following along a transcript). */
  onTimeChange?: (ms: number) => void;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/**
 * Plays one interview recording through a short-lived signed URL. Nothing
 * is fetched until someone presses play (the API checks access before it
 * signs), and an expired link is renewed transparently, keeping the
 * position — so a long listening session does not break at the 15-minute
 * mark.
 */
export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer(
  { interviewId, mediaId, label, durationMs, onTimeChange, className },
  ref,
) {
  const audio = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState((durationMs ?? 0) / 1000);
  const [speed, setSpeed] = useState(1);
  const pending = useRef<{ at: number; play: boolean } | null>(null);
  const renewed = useRef(false);

  const signedUrl = useCallback(async () => {
    const res = await API.interviews.getRecordingDownloadUrl(interviewId, mediaId);
    return res.data.data.url;
  }, [interviewId, mediaId]);

  const load = useCallback(
    async (at: number, play: boolean) => {
      setLoading(true);
      setError(null);
      try {
        pending.current = { at, play };
        setSrc(await signedUrl());
      } catch (e) {
        setError((e as { message?: string })?.message ?? 'The recording could not be loaded.');
      } finally {
        setLoading(false);
      }
    },
    [signedUrl],
  );

  const seekTo = useCallback(
    (ms: number, play = true) => {
      const el = audio.current;
      const at = Math.max(0, ms / 1000);
      if (!src || !el) {
        void load(at, play);
        return;
      }
      el.currentTime = at;
      setTime(at);
      if (play) void el.play().catch(() => undefined);
    },
    [src, load],
  );

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed, src]);

  const toggle = () => {
    const el = audio.current;
    if (!src || !el) return void load(time, true);
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  const skip = (seconds: number) => seekTo((time + seconds) * 1000, playing);

  const download = async () => {
    try {
      // A fresh link each time: the stored one may have expired.
      window.location.href = await signedUrl();
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'The recording could not be downloaded.');
    }
  };

  const shownDuration = duration || (durationMs ?? 0) / 1000;

  return (
    <div className={cn('rounded-xl bg-background-surface px-3 py-3 sm:px-4', className)}>
      <audio
        ref={audio}
        src={src ?? undefined}
        preload="metadata"
        aria-label={label}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration)) setDuration(el.duration);
          el.playbackRate = speed;
          const want = pending.current;
          pending.current = null;
          if (want) {
            el.currentTime = want.at;
            if (want.play) void el.play().catch(() => undefined);
          }
          renewed.current = false;
        }}
        onDurationChange={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          onTimeChange?.(Math.round(t * 1000));
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={(e) => {
          if (!src) return;
          // Most likely the signed link expired: renew it once, same position.
          if (!renewed.current) {
            renewed.current = true;
            void load(e.currentTarget.currentTime || time, playing);
          } else {
            setError('The recording could not be played. Try downloading it instead.');
          }
        }}
        className="hidden"
      />

      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          size="icon"
          onClick={toggle}
          loading={loading}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
          className="h-10 w-10 shrink-0 rounded-full"
        >
          {!loading && (playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />)}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(-10)} aria-label="Back 10 seconds" disabled={!src} className="hidden shrink-0 sm:inline-flex">
          <RotateCcw className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(10)} aria-label="Forward 10 seconds" disabled={!src} className="hidden shrink-0 sm:inline-flex">
          <RotateCw className="h-4 w-4" aria-hidden />
        </Button>

        <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-foreground-secondary">{formatDuration(time * 1000)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(shownDuration, 0.1)}
          step={0.1}
          value={Math.min(time, shownDuration || time)}
          disabled={!src}
          onChange={(e) => seekTo(Number(e.target.value) * 1000, playing)}
          aria-label="Position"
          aria-valuetext={`${formatDuration(time * 1000)} of ${formatDuration(shownDuration * 1000)}`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--brand-navy))] disabled:cursor-default disabled:opacity-50"
        />
        <span className="w-12 shrink-0 text-[13px] tabular-nums text-foreground-tertiary">{formatDuration(shownDuration * 1000)}</span>

        <label className="sr-only" htmlFor={`speed-${mediaId}`}>
          Playback speed
        </label>
        <select
          id={`speed-${mediaId}`}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="h-8 shrink-0 rounded-md border border-border-subtle bg-background-elevated px-1.5 text-[13px] tabular-nums text-foreground"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
        <Button variant="ghost" size="icon" onClick={download} aria-label={`Download ${label}`} className="shrink-0">
          <Download className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-[13px] text-foreground-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
