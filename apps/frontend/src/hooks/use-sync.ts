'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';

export function useSyncPull() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => API.sync.pull(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Sync pull failed');
    },
  });
}

export function useSyncPush() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => API.sync.push(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Sync push failed');
    },
  });
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync', 'status'],
    queryFn: () => API.sync.status(),
    refetchInterval: 30_000,
  });
}

export function useSyncLog() {
  return useQuery({
    queryKey: ['sync', 'log'],
    queryFn: () => API.sync.log(),
  });
}

export function useFullSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => API.sync.full(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Full sync completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Full sync failed');
    },
  });
}
