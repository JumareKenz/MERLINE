'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api-client';
import type { Recording } from '@/types/interview';
import { formatDuration } from '@/lib/utils';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/**
 * Loads audio only when asked: the API mints a short-lived signed URL after
 * its own tenant check, so nothing is fetched (or exposed) until a reviewer
 * actually presses play.
 */
export function RecordingPlayer({ interviewId, recording }: { interviewId: string; recording: Recording }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duration = recording.metadata?.durationMs;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.interviews.getRecordingDownloadUrl(interviewId, recording.id);
      setUrl(res.data.data.url);
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'The recording could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-foreground">{recording.originalName}</p>
          <p className="text-[13px] text-foreground-tertiary">
            {[duration ? formatDuration(duration) : null, formatBytes(recording.size), recording.metadata?.source === 'field-recorder' ? 'Field app' : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {!url && (
          <Button variant="secondary" size="sm" onClick={load} loading={loading} aria-label={`Play ${recording.originalName}`}>
            {!loading && <Play className="h-3.5 w-3.5" aria-hidden />} Play
          </Button>
        )}
      </div>
      {url && <audio controls autoPlay src={url} className="h-10 w-full" aria-label={`Recording ${recording.originalName}`} />}
      {error && <p className="text-[13px] text-foreground-error">{error}</p>}
    </div>
  );
}
