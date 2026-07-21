'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => API.media.upload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload media');
    },
  });
}

export function useMedia(id: string) {
  return useQuery({
    queryKey: ['media', 'detail', id],
    queryFn: () => API.media.get(id),
    enabled: !!id,
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.media.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('Media deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete media');
    },
  });
}

export function useSubmissionMedia(submissionId: string) {
  return useQuery({
    queryKey: ['media', 'submission', submissionId],
    queryFn: () => API.media.submissionMedia(submissionId),
    enabled: !!submissionId,
  });
}
