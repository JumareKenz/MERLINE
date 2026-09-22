'use client';

import { useRef, useState } from 'react';
import { Mic, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadRecording } from '@/hooks/use-interviews';

/** Matches the mime types MediaService.upload() accepts for audio, browser-recordable subset. */
const ACCEPTED_AUDIO = 'audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/mp3';

export function RecordingUploader({ interviewId }: { interviewId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadRecording = useUploadRecording();

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    await uploadRecording.mutateAsync({ interviewId, data: formData });
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-4">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Mic className="h-4 w-4 text-primary" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">Upload a recording</p>
        <p className="text-[12px] text-foreground-tertiary truncate">
          {selectedFile ? selectedFile.name : 'Only recordings consent permits will be accepted.'}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        className="hidden"
        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
      />
      <Button size="sm" variant="outline" className="h-8 px-3 text-[13px] shrink-0" onClick={() => inputRef.current?.click()}>
        Choose File
      </Button>
      <Button
        size="sm"
        className="h-8 px-3 text-[13px] shrink-0"
        disabled={!selectedFile}
        loading={uploadRecording.isPending}
        onClick={handleUpload}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
      </Button>
    </div>
  );
}
