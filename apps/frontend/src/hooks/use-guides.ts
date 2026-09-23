'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import type { SaveGuideInput } from '@/types/guide';

export function useGuides(params?: { projectId?: string; interviewType?: string }) {
  return useQuery({
    queryKey: ['guides', params ?? {}],
    queryFn: async () => (await API.guides.list(params)).data.data,
  });
}

export function useGuide(id: string) {
  return useQuery({
    queryKey: ['guides', 'detail', id],
    queryFn: async () => (await API.guides.get(id)).data.data,
    enabled: !!id,
  });
}

export function useSaveGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: SaveGuideInput }) =>
      (await (id ? API.guides.save(id, data) : API.guides.create(data))).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guides'] }),
    onError: (e: Error) => toast.error(e.message || 'The guide could not be saved'),
  });
}

export function useGuideAction(action: 'approve' | 'archive' | 'delete') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.guides[action](id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guides'] });
      toast.success(action === 'approve' ? 'Approved: field teams now use this version' : action === 'archive' ? 'Archived' : 'Moved to the Trash');
    },
    onError: (e: Error) => toast.error(e.message || 'That did not work'),
  });
}

export function useInterviewQuestionLog(interviewId: string, enabled = true) {
  return useQuery({
    queryKey: ['interviews', 'question-log', interviewId],
    queryFn: async () => (await API.interviews.questionLog(interviewId)).data.data,
    enabled: enabled && !!interviewId,
  });
}

export async function downloadGuideTemplate(format: 'csv' | 'xlsx') {
  const res = await API.guides.template(format);
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `merline-guide-template.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
