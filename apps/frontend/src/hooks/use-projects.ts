'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateProjectDto, UpdateProjectDto, CloneProjectDto, ProjectFilterParams } from '@/types/project';

export function useProjects(params?: ProjectFilterParams) {
  return useQuery({
    queryKey: ['projects', 'list', params],
    queryFn: () => API.projects.list(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => API.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectDto) => API.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      API.projects.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'detail', variables.id] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete project');
    },
  });
}

export function useCloneProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloneProjectDto }) =>
      API.projects.clone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone project');
    },
  });
}

export function useProjectTimeline(id: string) {
  return useQuery({
    queryKey: ['projects', 'timeline', id],
    queryFn: () => API.projects.timeline(id),
    enabled: !!id,
  });
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: ['projects', 'stats', id],
    queryFn: () => API.projects.stats(id),
    enabled: !!id,
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.projects.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project archived');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive project');
    },
  });
}

export function useProjectStudies(projectId: string, params?: import('@/types/api').StudyFilterParams) {
  return useQuery({
    queryKey: ['projects', projectId, 'studies', params],
    queryFn: () => API.projects.studies.list(projectId, params),
    enabled: !!projectId,
  });
}

export function useProjectTeam(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId, 'team'],
    queryFn: () => API.projects.team.list(projectId),
    enabled: !!projectId,
  });
}
