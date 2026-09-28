'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import type { UpdateRespondentLinkInput } from '@/types/respondent-link';

export function useRespondentLinks(params?: { projectId?: string }) {
  return useQuery({
    queryKey: ['respondent-links', params ?? {}],
    queryFn: async () => (await API.respondentLinks.list(params)).data.data,
  });
}

export function useRespondentLinkResponses(id: string, enabled = true) {
  return useQuery({
    queryKey: ['respondent-links', 'responses', id],
    queryFn: async () => (await API.respondentLinks.responses(id)).data.data,
    enabled: enabled && !!id,
  });
}

const DONE: Record<string, string> = {
  close: 'Link closed: no new respondents can start',
  reopen: 'Link reopened',
  regenerate: 'New link made: the old one no longer works',
  delete: 'Link moved to the Trash',
};

export function useRespondentLinkAction(action: 'close' | 'reopen' | 'regenerate' | 'delete') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.respondentLinks[action](id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['respondent-links'] });
      toast.success(DONE[action]);
    },
    onError: (e: Error) => toast.error(e.message || 'That did not work'),
  });
}

export function useUpdateRespondentLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRespondentLinkInput }) =>
      (await API.respondentLinks.update(id, data)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['respondent-links'] });
      toast.success('Link updated');
    },
    onError: (e: Error) => toast.error(e.message || 'The link could not be updated'),
  });
}

/** The address a respondent opens. Links live on the main web app. */
export function respondentUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/r/${token}`;
}
