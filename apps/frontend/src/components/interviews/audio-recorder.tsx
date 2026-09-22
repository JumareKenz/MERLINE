'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Square, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadRecording } from '@/hooks/use-interviews';
import { formatDuration } from '@/lib/utils';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'denied' | 'unsupported';

/**
 * PHASE 2 — real in-browser recording via MediaRecorder, not a mock. Produces
 * an actual audio Blob and uploads it through the existing, consent-gated
 * /interviews/:id/recordings endpoint — same server-side validation
 * (allowlist, size cap, checksum) as any other upload. Falls back to the
 * plain file picker (RecordingUploader) when getUserMedia/MediaRecorder is
 * unavailable or permission is denied, rather than dead-ending.
 */
export function AudioRecorder({ interviewId }: { interviewId: string }) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const pausedAccumMsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadRecording = useUploadRecording();

  useEffect(() => {
    if (typeof window !== 'undefined' && (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)) {
      setState('unsupported');
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const startTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setElapsedMs(pausedAccumMsRef.current + (Date.now() - startedAtRef.current));
    }, 250);
  };

  const stopTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
  };

  const handleStart = async () => {
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      pausedAccumMsRef.current = 0;
      setElapsedMs(0);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setState('stopped');
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      startTick();
      setState('recording');
    } catch {
      setState('denied');
    }
  };

  const handlePause = () => {
    mediaRecorderRef.current?.pause();
    pausedAccumMsRef.current = elapsedMs;
    stopTick();
    setState('paused');
  };

  const handleResume = () => {
    mediaRecorderRef.current?.resume();
    startedAtRef.current = Date.now();
    startTick();
    setState('recording');
  };

  const handleStop = () => {
    stopTick();
    mediaRecorderRef.current?.stop();
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;
    const extension = recordedBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([recordedBlob], `interview-${Date.now()}.${extension}`, {
      type: recordedBlob.type,
    });
    const formData = new FormData();
    formData.append('file', file);
    await uploadRecording.mutateAsync({ interviewId, data: formData });
    setRecordedBlob(null);
    setState('idle');
    setElapsedMs(0);
  };

  const discard = () => {
    setRecordedBlob(null);
    setState('idle');
    setElapsedMs(0);
  };

  if (state === 'unsupported') {
    return (
      <p className="text-[13px] text-foreground-tertiary py-2 flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        In-browser recording isn&apos;t supported here — use the file upload below instead.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <div className="rounded-xl bg-error-bg text-error px-4 py-3 text-[13px] flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Microphone access was denied.</p>
          <p className="mt-0.5">Allow microphone access in your browser settings, or use the file upload below.</p>
        </div>
      </div>
    );
  }

  if (state === 'stopped' && recordedBlob) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium">Recording ready — {formatDuration(elapsedMs)}</p>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-foreground-tertiary" onClick={discard}>
            Discard
          </Button>
        </div>
        <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full h-9" />
        <Button className="w-full h-11" loading={uploadRecording.isPending} onClick={handleUpload}>
          <Upload className="h-4 w-4 mr-2" /> Upload Recording
        </Button>
      </div>
    );
  }

  const isRecording = state === 'recording';
  const isPaused = state === 'paused';

  return (
    <div className="rounded-xl border border-border p-5 flex flex-col items-center gap-3">
      {(isRecording || isPaused) && (
        <div className="flex items-center gap-2">
          {isRecording && <span className="h-2 w-2 rounded-full bg-error animate-pulse" />}
          <span className="text-[22px] font-semibold tabular-nums tracking-tight text-foreground">
            {formatDuration(elapsedMs)}
          </span>
        </div>
      )}

      {state === 'idle' && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="Start recording"
          className="h-20 w-20 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ backgroundColor: 'hsl(var(--brand-lemon))' }}
        >
          <Mic className="h-8 w-8" style={{ color: 'hsl(var(--lemon-foreground))' }} />
        </button>
      )}

      {state === 'requesting' && (
        <p className="text-[13px] text-foreground-tertiary py-6">Requesting microphone access…</p>
      )}

      {(isRecording || isPaused) && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={isRecording ? handlePause : handleResume}
            aria-label={isRecording ? 'Pause recording' : 'Resume recording'}
            className="h-14 w-14 rounded-full flex items-center justify-center border border-border hover:bg-background-hover"
          >
            {isRecording ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop recording"
            className="h-16 w-16 rounded-full flex items-center justify-center bg-error text-white"
          >
            <Square className="h-5 w-5" fill="currentColor" />
          </button>
        </div>
      )}

      {state === 'idle' && <p className="text-[12px] text-foreground-tertiary">Tap to start recording</p>}
    </div>
  );
}
