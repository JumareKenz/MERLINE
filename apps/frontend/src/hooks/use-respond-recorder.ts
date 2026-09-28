'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORDING_BITRATE, SLICE_MS } from '@/hooks/use-field-recorder';

/**
 * Microphone capture for a respondent answering on their own. Same speech
 * settings as the field app (Opus 24 kbps mono, ~11 MB an hour); each
 * 5-second slice is handed to `onSlice` as it arrives, where it is saved
 * on the device and queued for upload.
 */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];

export type MicPhase = 'idle' | 'requesting' | 'ready' | 'recording' | 'paused' | 'stopped' | 'denied' | 'unsupported' | 'error';

export function micSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

interface Handlers {
  onSlice: (blob: Blob, seq: number) => void;
  onStopped: (info: { durationMs: number }) => void;
}

export function useRespondRecorder(handlers: Handlers) {
  const [phase, setPhase] = useState<MicPhase>(() => (micSupported() ? 'idle' : 'unsupported'));
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/webm');

  const h = useRef(handlers);
  h.current = handlers;
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const seq = useRef(0);
  const runStart = useRef(0);
  const accumulated = useRef(0);
  const tick = useRef<number | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);

  const elapsed = useCallback(() => accumulated.current + (runStart.current ? Date.now() - runStart.current : 0), []);

  const stopMeter = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    ctx.current?.close().catch(() => undefined);
    ctx.current = null;
    setLevel(0);
  };

  const release = useCallback(() => {
    if (tick.current) window.clearInterval(tick.current);
    tick.current = null;
    stopMeter();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    wake.current?.release().catch(() => undefined);
    wake.current = null;
  }, []);

  const lockScreen = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') wake.current = await navigator.wakeLock.request('screen');
    } catch {
      /* the screen may dim; recording continues */
    }
  };

  const startMeter = (s: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const c = new Ctx();
      const analyser = c.createAnalyser();
      analyser.fftSize = 512;
      c.createMediaStreamSource(s).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let last = 0;
      const loop = (t: number) => {
        if (t - last > 80) {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
          setLevel(Math.min(1, peak / 64));
          last = t;
        }
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      ctx.current = c;
    } catch {
      /* the meter is a nicety */
    }
  };

  /** Asks for the microphone and shows its level, without recording yet. */
  const prepare = useCallback(async () => {
    if (!micSupported()) {
      setPhase('unsupported');
      return false;
    }
    if (stream.current) {
      setPhase('ready');
      return true;
    }
    setError(null);
    setPhase('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.current = s;
      startMeter(s);
      setPhase('ready');
      return true;
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setPhase('denied');
      else {
        setPhase('error');
        setError(name === 'NotFoundError' ? 'No microphone was found on this device.' : 'The microphone could not be started.');
      }
      return false;
    }
  }, []);

  /** Starts recording; resolves to the container actually used, or null. */
  const start = useCallback(async (): Promise<string | null> => {
    if (!stream.current && !(await prepare())) return null;
    const s = stream.current!;
    const mime = pickMime();
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(s, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: RECORDING_BITRATE });
    } catch {
      setPhase('error');
      setError('This browser cannot record audio.');
      return null;
    }
    const actual = r.mimeType || mime || 'audio/webm';
    setMimeType(actual);
    seq.current = 0;
    accumulated.current = 0;
    r.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) h.current.onSlice(e.data, seq.current++);
    };
    r.onstop = () => {
      const durationMs = elapsed();
      runStart.current = 0;
      accumulated.current = durationMs;
      release();
      recorder.current = null;
      setElapsedMs(durationMs);
      setPhase('stopped');
      // ondataavailable for the last slice fires before onstop.
      h.current.onStopped({ durationMs });
    };
    r.onerror = () => {
      setError('Recording stopped unexpectedly. What you said so far is saved.');
      try {
        r.stop();
      } catch {
        /* already stopped */
      }
    };
    s.getAudioTracks().forEach((t) => {
      t.onended = () => {
        if (r.state !== 'inactive') {
          setError('Another app took the microphone. What you said so far is saved.');
          r.stop();
        }
      };
    });
    recorder.current = r;
    r.start(SLICE_MS);
    runStart.current = Date.now();
    if (tick.current) window.clearInterval(tick.current);
    tick.current = window.setInterval(() => setElapsedMs(elapsed()), 250);
    void lockScreen();
    setPhase('recording');
    return actual;
  }, [elapsed, prepare, release]);

  const pause = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== 'recording') return;
    r.pause();
    try {
      r.requestData();
    } catch {
      /* not everywhere */
    }
    accumulated.current = elapsed();
    runStart.current = 0;
    setElapsedMs(accumulated.current);
    setPhase('paused');
  }, [elapsed]);

  const resume = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== 'paused') return;
    r.resume();
    runStart.current = Date.now();
    setPhase('recording');
  }, []);

  const stop = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state === 'inactive') return;
    r.stop();
  }, []);

  /** Releases the microphone without recording (e.g. leaving the mic check). */
  const releaseMic = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') return;
    release();
    setPhase(micSupported() ? 'idle' : 'unsupported');
  }, [release]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && recorder.current?.state === 'recording') void lockScreen();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(
    () => () => {
      const r = recorder.current;
      if (r && r.state !== 'inactive') {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      release();
    },
    [release],
  );

  return { phase, level, elapsedMs, error, mimeType, elapsed, prepare, start, pause, resume, stop, releaseMic };
}
