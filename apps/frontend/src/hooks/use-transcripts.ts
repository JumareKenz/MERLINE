'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';

export function useTranscriptsForInterview(interviewId: string) {
  return useQuery({
    queryKey: ['transcripts', 'interview', interviewId],
    queryFn: () => API.transcripts.listForInterview(interviewId),
    enabled: !!interviewId,
  });
}

export function useTranscript(id: string) {
  return useQuery({
    queryKey: ['transcripts', 'detail', id],
    queryFn: () => API.transcripts.get(id),
    enabled: !!id,
  });
}

export function useRequestTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { interviewId: string; mediaId: string }) => API.transcripts.request(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transcripts', 'interview', variables.interviewId] });
      toast.success('Transcript ready');
    },
    onError: (error: Error) => {
      // A 503 here is an expected, honest outcome (no provider configured, or
      // the provider itself failed) — not a bug. Still surfaced to the user
      // since it needs their attention (retry later, or check consent scope).
      toast.error(error.message || 'Transcription failed');
    },
  });
}

export function useRetryTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.transcripts.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
      toast.success('Transcript ready');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Retry failed');
    },
  });
}
