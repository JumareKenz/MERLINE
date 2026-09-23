'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Transcript } from '@/types/transcript';

/** Transcription runs in the background; poll only while something is in flight. */
const POLL_MS = 5000;

function inFlight(t: Pick<Transcript, 'status' | 'translationStatus'>) {
  return (
    t.status === 'PENDING' ||
    t.status === 'PROCESSING' ||
    t.translationStatus === 'PENDING' ||
    t.translationStatus === 'PROCESSING'
  );
}

export function useTranscriptsForInterview(interviewId: string) {
  return useQuery({
    queryKey: ['transcripts', 'interview', interviewId],
    queryFn: () => API.transcripts.listForInterview(interviewId),
    enabled: !!interviewId,
    refetchInterval: (query) => ((query.state.data?.data?.data ?? []).some(inFlight) ? POLL_MS : false),
  });
}

export function useTranscript(id: string) {
  return useQuery({
    queryKey: ['transcripts', 'detail', id],
    queryFn: () => API.transcripts.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const t = query.state.data?.data?.data;
      return t && inFlight(t) ? POLL_MS : false;
    },
  });
}

export function useRequestTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { interviewId: string; mediaId: string; language?: string }) => API.transcripts.request(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transcripts', 'interview', variables.interviewId] });
      toast.success('Transcription queued. It usually takes a minute or two.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Transcription could not be started');
    },
  });
}

export function useRetryTranscript() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, language }: { id: string; language?: string }) => API.transcripts.retry(id, language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts'] });
      toast.success('Transcription queued again');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Retry failed');
    },
  });
}

export function useEditSegment(transcriptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ segmentId, text }: { segmentId: string; text: string | null }) =>
      API.transcripts.editSegment(transcriptId, segmentId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts', 'detail', transcriptId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'The correction was not saved');
    },
  });
}

export function useTranslateTranscript(transcriptId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: string) => API.transcripts.translate(transcriptId, language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcripts', 'detail', transcriptId] });
      toast.success('Translation queued');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Translation could not be started');
    },
  });
}

export function useAllTranscripts(enabled = true) {
  return useQuery({
    queryKey: ['transcripts', 'all'],
    queryFn: async () => (await API.transcripts.listAll()).data.data,
    enabled,
    refetchInterval: (query) => ((query.state.data ?? []).some(inFlight) ? POLL_MS : false),
  });
}
