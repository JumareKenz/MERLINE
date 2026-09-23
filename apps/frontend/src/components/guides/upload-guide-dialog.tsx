'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { downloadGuideTemplate } from '@/hooks/use-guides';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { API } from '@/lib/api-client';
import type { ImportProblem } from '@/types/guide';
import { INTERVIEW_TYPE_LABELS } from '@/types/research-project';

/**
 * Bulk upload: a CSV or Excel file in the template's columns becomes a
 * draft guide. Problems are listed by row and nothing is imported until
 * the file is clean.
 */
export function UploadGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: projectPage } = useResearchProjects();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('KII');
  const [projectId, setProjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [problems, setProblems] = useState<ImportProblem[]>([]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true);
    setMessage(null);
    setProblems([]);
    const data = new FormData();
    data.append('file', file);
    data.append('title', title.trim());
    data.append('interviewType', type);
    if (projectId) data.append('projectId', projectId);
    try {
      const res = await API.guides.import(data);
      qc.invalidateQueries({ queryKey: ['guides'] });
      onOpenChange(false);
      router.push(`/guides/${res.data.data.id}`);
    } catch (err) {
      const e2 = err as { message?: string; details?: unknown };
      setMessage(e2.message ?? 'The file could not be imported');
      setProblems(Array.isArray(e2.details) ? (e2.details as ImportProblem[]) : []);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a guide</DialogTitle>
          <DialogDescription>
            A CSV or Excel file with one question per row. It becomes a draft you can check and edit before approving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background-surface px-3 py-2.5 text-[13px] text-foreground-secondary">
            <FileSpreadsheet className="h-4 w-4" aria-hidden /> Template with examples in English and Hausa:
            <button type="button" className="font-medium text-foreground-link hover:underline" onClick={() => downloadGuideTemplate('xlsx')}>
              Excel
            </button>
            ·
            <button type="button" className="font-medium text-foreground-link hover:underline" onClick={() => downloadGuideTemplate('csv')}>
              CSV
            </button>
          </div>
          <Field id="u-title" label="Title">
            <Input id="u-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="u-type" label="Interview type">
              <NativeSelect id="u-type" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="u-project" label="Project">
              <NativeSelect id="u-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">All projects</option>
                {(projectPage?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="u-file" label="File">
            <input
              id="u-file"
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[14px] text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-primary-700"
            />
          </Field>

          {message && (
            <div className="rounded-lg bg-error-bg px-4 py-3 text-[14px] text-foreground" role="alert">
              <p className="font-medium">{message}</p>
              {problems.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[13px]">
                  {problems.map((p, i) => (
                    <li key={i}>
                      <span className="font-semibold tabular-nums">Row {p.row}:</span> {p.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!file || title.trim().length < 2}>
              <Upload className="h-4 w-4" aria-hidden /> Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
