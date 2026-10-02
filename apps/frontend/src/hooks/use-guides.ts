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
      toast.success(action === 'approve' ? 'Approved' : action === 'archive' ? 'Archived' : 'Moved to the Trash');
    },
    onError: (e: Error) => toast.error(e.message || 'That did not work'),
  });
}

/** Draft the missing Hausa with a model, or confirm a person has reviewed it. */
export function useGuideTranslation(id: string) {
  const qc = useQueryClient();
  const done = (message: string) => {
    qc.invalidateQueries({ queryKey: ['guides'] });
    toast.success(message);
  };
  const translate = useMutation({
    mutationFn: async () => (await API.guides.translate(id)).data.data,
    onSuccess: () => done('Hausa drafted. Read it, correct it if needed, then mark it reviewed.'),
    onError: (e: { message?: string }) => toast.error(e.message || 'The Hausa could not be drafted'),
  });
  const review = useMutation({
    mutationFn: async () => (await API.guides.reviewTranslation(id)).data.data,
    onSuccess: () => done('Hausa marked as reviewed. You can approve the guide now.'),
    onError: (e: { message?: string }) => toast.error(e.message || 'That did not work'),
  });
  return { translate, review };
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
