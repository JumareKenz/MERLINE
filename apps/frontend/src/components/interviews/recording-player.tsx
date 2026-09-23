'use client';

import { AudioPlayer } from '@/components/interviews/audio-player';
import type { Recording } from '@/types/interview';
import { formatDuration } from '@/lib/utils';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** A recording's name and facts, with the admin player (seek, speed, download). */
export function RecordingPlayer({ interviewId, recording }: { interviewId: string; recording: Recording }) {
  const duration = recording.metadata?.durationMs;

  return (
    <div className="space-y-2">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-foreground">{recording.originalName}</p>
        <p className="text-[13px] text-foreground-tertiary">
          {[duration ? formatDuration(duration) : null, formatBytes(recording.size), recording.metadata?.source === 'field-recorder' ? 'Field app' : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <AudioPlayer interviewId={interviewId} mediaId={recording.id} label={recording.originalName} durationMs={duration} />
    </div>
  );
}
