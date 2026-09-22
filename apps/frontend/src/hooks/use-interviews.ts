'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateInterviewDto, InterviewStatus } from '@/types/interview';

export function useInterviews(params?: { participantId?: string; projectId?: string; status?: string }) {
  return useQuery({
    queryKey: ['interviews', 'list', params],
    queryFn: () => API.interviews.list(params),
  });
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: ['interviews', 'detail', id],
    queryFn: () => API.interviews.get(id),
    enabled: !!id,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInterviewDto) => API.interviews.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create interview');
    },
  });
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InterviewStatus }) =>
      API.interviews.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', 'detail', variables.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update interview status');
    },
  });
}

export function useUploadRecording() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, data }: { interviewId: string; data: FormData }) =>
      API.interviews.uploadRecording(interviewId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'recordings', variables.interviewId] });
      toast.success('Recording uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload recording');
    },
  });
}

export function useRecordings(interviewId: string) {
  return useQuery({
    queryKey: ['interviews', 'recordings', interviewId],
    queryFn: () => API.interviews.listRecordings(interviewId),
    enabled: !!interviewId,
  });
}
