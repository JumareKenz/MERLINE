'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  UpsertLogframeDto,
  CreateLogframeRowDto,
  UpdateLogframeRowDto,
  LinkIndicatorDto,
} from '@/types/logframe';

export function useLogframe(projectId: string) {
  return useQuery({
    queryKey: ['logframe', projectId],
    queryFn: () => API.projects.logframe.get(projectId),
    enabled: !!projectId,
    select: (res) => res.data?.data ?? null,
  });
}

export function useUpsertLogframe(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertLogframeDto) =>
      API.projects.logframe.upsert(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save logframe');
    },
  });
}

export function useAddLogframeRow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLogframeRowDto) =>
      API.projects.logframe.addRow(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add row');
    },
  });
}

export function useUpdateLogframeRow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, data }: { rowId: string; data: UpdateLogframeRowDto }) =>
      API.projects.logframe.updateRow(projectId, rowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update row');
    },
  });
}

export function useDeleteLogframeRow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) =>
      API.projects.logframe.deleteRow(projectId, rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
      toast.success('Row deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete row');
    },
  });
}

export function useLinkLogframeIndicator(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, data }: { rowId: string; data: LinkIndicatorDto }) =>
      API.projects.logframe.linkIndicator(projectId, rowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
      toast.success('Indicator linked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link indicator');
    },
  });
}

export function useUnlinkLogframeIndicator(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, indicatorId }: { rowId: string; indicatorId: string }) =>
      API.projects.logframe.unlinkIndicator(projectId, rowId, indicatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logframe', projectId] });
      toast.success('Indicator unlinked');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlink indicator');
    },
  });
}
