'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { SubmissionFilterParams } from '@/types/submission';

export function useSubmissions(params?: SubmissionFilterParams) {
  return useQuery({
    queryKey: ['submissions', 'list', params],
    queryFn: () => API.submissions.list(params),
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ['submissions', 'detail', id],
    queryFn: () => API.submissions.get(id),
    enabled: !!id,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => API.submissions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create submission');
    },
  });
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      API.submissions.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update submission');
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.submissions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete submission');
    },
  });
}

export function useSaveAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: string; data: Record<string, unknown> }) =>
      API.submissions.saveAnswer(submissionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'detail', variables.submissionId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save answer');
    },
  });
}

export function useCompleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.submissions.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete submission');
    },
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.submissions.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve submission');
    },
  });
}

export function useRejectSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      API.submissions.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      toast.success('Submission rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject submission');
    },
  });
}

export function useFlagAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, questionId, reason }: { submissionId: string; questionId: string; reason: string }) =>
      API.submissions.flagAnswer(submissionId, questionId, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'detail', variables.submissionId] });
      toast.success('Answer flagged');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to flag answer');
    },
  });
}

export function useSubmissionQuality(id: string) {
  return useQuery({
    queryKey: ['submissions', 'quality', id],
    queryFn: () => API.submissions.quality(id),
    enabled: !!id,
  });
}

export function useExportSubmissions() {
  return useMutation({
    mutationFn: ({ studyId, format }: { studyId: string; format: string }) =>
      API.submissions.export(studyId, format),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export submissions');
    },
  });
}

export function useEnumeratorSubmissions(eid: string) {
  return useQuery({
    queryKey: ['enumerator', eid, 'submissions'],
    queryFn: () => API.submissions.enumeratorList(eid),
    enabled: !!eid,
  });
}

export function useEnumeratorStats(eid: string) {
  return useQuery({
    queryKey: ['enumerator', eid, 'stats'],
    queryFn: () => API.submissions.enumeratorStats(eid),
    enabled: !!eid,
  });
}
