'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from '@/types/workspace';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => API.workspaces.list(),
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => API.workspaces.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkspaceDto) => API.workspaces.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create workspace');
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceDto }) =>
      API.workspaces.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update workspace');
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.workspaces.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete workspace');
    },
  });
}

export function useSetDefaultWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.workspaces.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Default workspace updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set default workspace');
    },
  });
}
