'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import type { ResearchProjectInput } from '@/types/research-project';

export function useResearchProjects(params?: { search?: string; status?: string }) {
  return useQuery({
    queryKey: ['research-projects', 'list', params],
    queryFn: async () => (await API.researchProjects.list(params)).data.data,
  });
}

export function useResearchProject(id: string) {
  return useQuery({
    queryKey: ['research-projects', 'detail', id],
    queryFn: async () => (await API.researchProjects.get(id)).data.data,
    enabled: !!id,
  });
}

export function useCreateResearchProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ResearchProjectInput) => (await API.researchProjects.create(data)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Project created');
    },
    onError: (error: Error) => toast.error(error.message || 'The project could not be created'),
  });
}

export function useUpdateResearchProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ResearchProjectInput>) => (await API.researchProjects.update(id, data)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Project saved');
    },
    onError: (error: Error) => toast.error(error.message || 'The project could not be saved'),
  });
}

export function useArchiveResearchProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.researchProjects.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Project archived');
    },
    onError: (error: Error) => toast.error(error.message || 'The project could not be archived'),
  });
}
