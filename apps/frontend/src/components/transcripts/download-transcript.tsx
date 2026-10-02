'use client';

import { useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';

type Format = 'docx' | 'pdf';

/** Saves the file the API returns, under the name the API chose. */
export async function downloadTranscript(id: string, format: Format) {
  const res = await API.transcripts.export(id, format);
  const disposition = String(res.headers['content-disposition'] ?? '');
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `transcript.${format}`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Word and PDF downloads of one transcript, branded, for administrators. */
export function DownloadTranscript({ transcriptId, size = 'default' }: { transcriptId: string; size?: 'sm' | 'default' }) {
  const [busy, setBusy] = useState<Format | null>(null);
  const run = async (format: Format) => {
    setBusy(format);
    try {
      await downloadTranscript(transcriptId, format);
    } catch (err) {
      // A blob error body has no readable message, so say what to try.
      toast.error(describeError(err, `The ${format === 'pdf' ? 'PDF' : 'Word'} file could not be created. Try again in a moment.`));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Download transcript">
      <Button variant="secondary" size={size} loading={busy === 'docx'} disabled={!!busy && busy !== 'docx'} onClick={() => run('docx')}>
        {busy !== 'docx' && <FileText className="h-4 w-4" aria-hidden />} Word
      </Button>
      <Button variant="secondary" size={size} loading={busy === 'pdf'} disabled={!!busy && busy !== 'pdf'} onClick={() => run('pdf')}>
        {busy !== 'pdf' && <FileDown className="h-4 w-4" aria-hidden />} PDF
      </Button>
    </div>
  );
}
