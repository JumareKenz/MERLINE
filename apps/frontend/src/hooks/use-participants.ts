'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateParticipantDto, UpdateParticipantDto } from '@/types/participant';

export function useParticipants(projectId?: string) {
  return useQuery({
    queryKey: ['participants', 'list', projectId],
    queryFn: () => API.participants.list(projectId),
  });
}

export function useParticipant(id: string) {
  return useQuery({
    queryKey: ['participants', 'detail', id],
    queryFn: () => API.participants.get(id),
    enabled: !!id,
  });
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateParticipantDto) => API.participants.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success('Participant added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add participant');
    },
  });
}

export function useUpdateParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateParticipantDto }) =>
      API.participants.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      queryClient.invalidateQueries({ queryKey: ['participants', 'detail', variables.id] });
      toast.success('Participant updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update participant');
    },
  });
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.participants.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      toast.success('Participant removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove participant');
    },
  });
}
