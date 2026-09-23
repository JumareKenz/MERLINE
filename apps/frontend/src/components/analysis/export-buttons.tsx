'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadReport } from '@/hooks/use-analysis-reports';
import type { ExportFormat } from '@/types/analysis-report';
import { toast } from 'sonner';

const ICONS = { pdf: FileDown, docx: FileText, xlsx: FileSpreadsheet } as const;
const LABELS = { pdf: 'PDF', docx: 'Word', xlsx: 'Excel' } as const;

/** Branded exports of one report. Each click builds a fresh file on the server. */
export function ExportButtons({
  reportId,
  name,
  size = 'default',
  onDark = false,
}: {
  reportId: string;
  name?: string;
  size?: 'sm' | 'default';
  /** On a navy surface the primary (navy) button would disappear. */
  onDark?: boolean;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Download report">
      {(['pdf', 'docx', 'xlsx'] as ExportFormat[]).map((f) => {
        const Icon = ICONS[f];
        return (
          <Button
            key={f}
            variant={f === 'pdf' ? (onDark ? 'accent' : 'default') : 'secondary'}
            size={size}
            loading={busy === f}
            disabled={!!busy && busy !== f}
            onClick={async () => {
              setBusy(f);
              try {
                await downloadReport(reportId, f, name);
              } catch (e) {
                toast.error((e as { message?: string })?.message ?? 'The file could not be created');
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy !== f && <Icon className="h-4 w-4" aria-hidden />} {LABELS[f]}
          </Button>
        );
      })}
    </div>
  );
}
