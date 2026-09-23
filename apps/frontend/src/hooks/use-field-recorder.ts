'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { idbRecordingRepo, isIndexedDbAvailable } from '@/lib/field/idb';
import type { LocalRecording } from '@/lib/field/types';
import { setActiveRecordingId, useFieldOutbox } from '@/stores/field-outbox-store';

/**
 * Speech-tuned capture settings. Opus at 24 kbps mono is transparent for
 * interview speech and ~11 MB per hour — a 90-minute interview is ~16 MB to
 * upload instead of 80–170 MB at browser defaults. Safari records AAC in
 * MP4 and treats the bitrate as a hint; its files are larger but still far
 * below the default.
 */
export const RECORDING_BITRATE = 24_000;
/** Each slice is persisted as it arrives: a crash loses at most this much. */
export const SLICE_MS = 5_000;

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm'];

export type RecorderPhase = 'idle' | 'requesting' | 'recording' | 'paused' | 'saving' | 'saved' | 'denied' | 'unsupported' | 'error';

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function extensionFor(mime: string): string {
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}

export function isRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    isIndexedDbAvailable()
  );
}

interface Options {
  userId: string;
  interviewId: string;
  participantName?: string;
}

export function useFieldRecorder({ userId, interviewId, participantName }: Options) {
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedRecording, setSavedRecording] = useState<LocalRecording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef<LocalRecording | null>(null);
  const seqRef = useRef(0);
  const writesRef = useRef<Promise<void>>(Promise.resolve());
  const runStartRef = useRef(0);
  const accumulatedRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const upsertLocal = useFieldOutbox((s) => s.upsertLocal);
  const kick = useFieldOutbox((s) => s.kick);

  useEffect(() => {
    if (!isRecorderSupported()) setPhase('unsupported');
  }, []);

  // Refs only, so these are stable for the lifetime of the hook.
  const currentElapsed = useCallback(
    () => accumulatedRef.current + (runStartRef.current ? Date.now() - runStartRef.current : 0),
    [],
  );
  const startTicking = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => setElapsedMs(currentElapsed()), 250);
  }, [currentElapsed]);
  const stopTicking = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Not critical: capture continues; the screen may simply dim.
    }
  };

  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let last = 0;
      const loop = (t: number) => {
        // ~12 fps is plenty for a calm level indicator and cheap on battery.
        if (t - last > 80) {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
          setLevel(Math.min(1, peak / 64));
          last = t;
        }
        levelRafRef.current = requestAnimationFrame(loop);
      };
      levelRafRef.current = requestAnimationFrame(loop);
      audioCtxRef.current = ctx;
    } catch {
      // Level metering is a nicety; recording does not depend on it.
    }
  };

  const releaseDevices = useCallback(() => {
    stopTicking();
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    setLevel(0);
  }, [stopTicking]);

  // Re-acquire the wake lock when the app comes back to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && recorderRef.current?.state === 'recording') {
        void acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Leaving the page mid-recording: stop capture cleanly. Everything written
  // so far is already on the device and is recovered into the outbox.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
      releaseDevices();
      setActiveRecordingId(undefined);
    };
  }, [releaseDevices]);

  const start = useCallback(async () => {
    setError(null);
    setPhase('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setPhase(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      setError(
        name === 'NotFoundError'
          ? 'No microphone was found on this device.'
          : 'The microphone could not be started.',
      );
      return;
    }

    // Ask the browser not to evict device storage under pressure: this is
    // where unsent interviews live.
    navigator.storage?.persist?.().catch(() => false);

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORDING_BITRATE,
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setPhase('error');
      setError('This browser cannot record audio. Use the file option instead.');
      return;
    }

    const actualMime = recorder.mimeType || mimeType || 'audio/webm';
    const now = new Date().toISOString();
    const recording: LocalRecording = {
      id: crypto.randomUUID(),
      userId,
      interviewId,
      participantName,
      mimeType: actualMime,
      source: 'recorder',
      originalName: `interview-${interviewId.slice(0, 8)}-${now.slice(0, 19).replace(/[:T]/g, '')}.${extensionFor(actualMime)}`,
      createdAt: now,
      updatedAt: now,
      durationMs: 0,
      size: 0,
      sliceCount: 0,
      status: 'recording',
      uploadedParts: [],
      attempts: 0,
    };
    await idbRecordingRepo.put(recording);
    recordingRef.current = recording;
    setActiveRecordingId(recording.id);
    upsertLocal(recording);
    seqRef.current = 0;
    accumulatedRef.current = 0;
    setBytes(0);
    setElapsedMs(0);

    recorder.ondataavailable = (event) => {
      if (!event.data || event.data.size === 0) return;
      const seq = seqRef.current++;
      const blob = event.data;
      // Serialize writes so slices land in order even on a slow device.
      writesRef.current = writesRef.current
        .then(() => idbRecordingRepo.appendSlice(recording.id, seq, blob))
        .then(() => setBytes((b) => b + blob.size))
        .catch(() => {
          setError('Device storage is full or unavailable — free up space. Audio so far is saved.');
        });
    };

    recorder.onstop = async () => {
      const durationMs = currentElapsed();
      runStartRef.current = 0;
      accumulatedRef.current = durationMs;
      releaseDevices();
      setPhase('saving');
      await writesRef.current;
      const stored = await idbRecordingRepo.get(recording.id);
      const finished: LocalRecording = {
        ...(stored ?? recording),
        durationMs,
        status: stored && stored.sliceCount > 0 ? 'queued' : 'failed',
        lastError: stored && stored.sliceCount > 0 ? undefined : 'No audio was captured.',
        updatedAt: new Date().toISOString(),
      };
      await idbRecordingRepo.put(finished);
      setActiveRecordingId(undefined);
      recorderRef.current = null;
      upsertLocal(finished);
      setSavedRecording(finished);
      setElapsedMs(durationMs);
      setPhase('saved');
      void kick();
    };

    recorder.onerror = () => {
      setError('Recording stopped unexpectedly. Audio captured so far is saved.');
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    };

    // The OS can end the microphone track (incoming call, another app):
    // finish cleanly so the audio so far is kept and queued.
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (recorder.state !== 'inactive') {
          setError('The microphone was taken by another app. Audio so far is saved.');
          recorder.stop();
        }
      };
    });

    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start(SLICE_MS);
    runStartRef.current = Date.now();
    startTicking();
    startLevelMeter(stream);
    void acquireWakeLock();
    setPhase('recording');
  }, [interviewId, participantName, userId, upsertLocal, kick, releaseDevices, currentElapsed, startTicking]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    // Flush what we have so a pause is also a save point.
    try {
      recorder.requestData();
    } catch {
      /* not supported everywhere */
    }
    accumulatedRef.current = currentElapsed();
    runStartRef.current = 0;
    stopTicking();
    setElapsedMs(accumulatedRef.current);
    setPhase('paused');
  }, [currentElapsed, stopTicking]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    runStartRef.current = Date.now();
    startTicking();
    setPhase('recording');
  }, [startTicking]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    if (recorder.state === 'recording') {
      accumulatedRef.current = currentElapsed();
    }
    runStartRef.current = 0;
    stopTicking();
    recorder.stop();
  }, [currentElapsed, stopTicking]);

  const reset = useCallback(() => {
    setSavedRecording(null);
    setElapsedMs(0);
    setBytes(0);
    setError(null);
    setPhase(isRecorderSupported() ? 'idle' : 'unsupported');
  }, []);

  // The recording being captured: guide marks stamp their time against it.
  const recordingId = phase === 'recording' || phase === 'paused' ? recordingRef.current?.id : undefined;
  return { phase, elapsedMs, level, bytes, error, savedRecording, recordingId, start, pause, resume, stop, reset };
}

/** Queue a picked audio file through the same resumable outbox. */
export async function queueAudioFile(
  file: File,
  opts: { userId: string; interviewId: string; participantName?: string },
): Promise<LocalRecording> {
  const now = new Date().toISOString();
  const recording: LocalRecording = {
    id: crypto.randomUUID(),
    userId: opts.userId,
    interviewId: opts.interviewId,
    participantName: opts.participantName,
    mimeType: file.type || 'audio/mpeg',
    source: 'file',
    originalName: file.name,
    createdAt: now,
    updatedAt: now,
    durationMs: 0,
    size: 0,
    sliceCount: 0,
    status: 'recording',
    uploadedParts: [],
    attempts: 0,
  };
  await idbRecordingRepo.put(recording);
  await idbRecordingRepo.appendSlice(recording.id, 0, file);
  const stored = (await idbRecordingRepo.get(recording.id)) ?? recording;
  const queued: LocalRecording = { ...stored, status: 'queued', updatedAt: new Date().toISOString() };
  await idbRecordingRepo.put(queued);
  return queued;
}
