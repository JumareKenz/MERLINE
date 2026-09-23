'use client';

import { useId, useRef, useState } from 'react';
import { FileAudio, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadRecording } from '@/hooks/use-interviews';
import { formatBytes } from './recording-player';

/** Matches the audio types MediaService accepts. */
const ACCEPTED_AUDIO = 'audio/webm,audio/ogg,audio/mp4,audio/x-m4a,audio/mpeg,audio/wav,audio/aac,audio/flac';

/**
 * Upload an existing audio file (e.g. from a standalone recorder). The
 * server re-checks consent before storing anything, so a file for an
 * interview whose consent forbids recording is refused there too.
 */
export function RecordingUploader({ interviewId }: { interviewId: string }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadRecording();

  const handleUpload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const ok = await upload.mutateAsync({ interviewId, data: form }).then(() => true).catch(() => false);
    if (ok) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center">
      <FileAudio className="hidden h-5 w-5 shrink-0 text-foreground-tertiary sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="block text-[14px] font-medium text-foreground">
          {file ? file.name : 'Choose an audio file'}
        </label>
        <p className="text-[13px] text-foreground-tertiary">{file ? formatBytes(file.size) : 'WebM, Ogg, M4A, MP3, WAV or FLAC'}</p>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        className="sr-only"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse
        </Button>
        <Button size="sm" disabled={!file} loading={upload.isPending} onClick={handleUpload}>
          {!upload.isPending && <Upload className="h-3.5 w-3.5" aria-hidden />} Upload
        </Button>
      </div>
    </div>
  );
}
