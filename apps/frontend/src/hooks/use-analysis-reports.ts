'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import type { AnalysisReport, ExportFormat, RequestReportInput } from '@/types/analysis-report';

const POLL_MS = 4000;
const busy = (r: Pick<AnalysisReport, 'status'>) => r.status === 'PENDING' || r.status === 'PROCESSING';

export function useAnalysisReports(params: { projectId?: string; interviewId?: string }, enabled = true) {
  return useQuery({
    queryKey: ['analysis-reports', params],
    queryFn: async () => (await API.analysisReports.list(params)).data.data,
    enabled: enabled && !!(params.projectId || params.interviewId),
    refetchInterval: (q) => ((q.state.data ?? []).some(busy) ? POLL_MS : false),
  });
}

export function useAnalysisReport(id: string) {
  return useQuery({
    queryKey: ['analysis-reports', 'detail', id],
    queryFn: async () => (await API.analysisReports.get(id)).data.data,
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && busy(q.state.data) ? POLL_MS : false),
  });
}

export function useRequestReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequestReportInput) => (await API.analysisReports.request(input)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analysis-reports'] });
    },
    onError: (e: Error) => toast.error(e.message || 'The report could not be started'),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.analysisReports.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analysis-reports'] });
      toast.success('Report moved to the Trash');
    },
    onError: (e: Error) => toast.error(e.message || 'The report could not be deleted'),
  });
}

export function useAskProject() {
  return useMutation({
    mutationFn: async (input: { projectId: string; question: string }) => (await API.analysisReports.ask(input)).data.data,
    onError: (e: Error) => toast.error(e.message || 'No answer this time'),
  });
}

/** Downloads a report file with the browser's save dialog. */
export async function downloadReport(id: string, format: ExportFormat, fallbackName = 'report') {
  const res = await API.analysisReports.export(id, format);
  const disposition = String(res.headers['content-disposition'] ?? '');
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${fallbackName}.${format}`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: ({ id, format, name }: { id: string; format: ExportFormat; name?: string }) => downloadReport(id, format, name),
    onError: (e: Error) => toast.error(e.message || 'The file could not be created'),
  });
}

export function useTrash(enabled = true) {
  return useQuery({
    queryKey: ['trash'],
    queryFn: async () => (await API.trash.list()).data.data,
    enabled,
  });
}

export function useRestoreFromTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: Parameters<typeof API.trash.restore>[0]; id: string }) => API.trash.restore(type, id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success('Restored');
    },
    onError: (e: Error) => toast.error(e.message || 'It could not be restored'),
  });
}
