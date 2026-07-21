'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateStudyDto, UpdateStudyDto, StudyTransitionDto, StudyCloneDto, StudyFilterParams } from '@/types/study';

export function useStudies(params?: StudyFilterParams) {
  return useQuery({
    queryKey: ['studies', 'list', params],
    queryFn: () => API.studies.list(params),
  });
}

export function useStudy(id: string) {
  return useQuery({
    queryKey: ['studies', 'detail', id],
    queryFn: () => API.studies.get(id),
    enabled: !!id,
  });
}

export function useCreateStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateStudyDto }) =>
      API.studies.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Study created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create study');
    },
  });
}

export function useUpdateStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudyDto }) =>
      API.studies.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      queryClient.invalidateQueries({ queryKey: ['studies', 'detail', variables.id] });
      toast.success('Study updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update study');
    },
  });
}

export function useDeleteStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.studies.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete study');
    },
  });
}

export function useTransitionStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudyTransitionDto }) =>
      API.studies.transition(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studies', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update study status');
    },
  });
}

export function useStudyTransitions(id: string) {
  return useQuery({
    queryKey: ['studies', id, 'transitions'],
    queryFn: () => API.studies.transition(id, {} as StudyTransitionDto),
    enabled: false,
  });
}

export function useCloneStudy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudyCloneDto }) =>
      API.studies.clone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      toast.success('Study cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone study');
    },
  });
}

export function useStudyLifecycle(id: string) {
  return useQuery({
    queryKey: ['studies', id, 'lifecycle'],
    queryFn: () => API.studies.lifecycle(id),
    enabled: !!id,
  });
}

export function useStudyTimeline(id: string) {
  return useQuery({
    queryKey: ['studies', id, 'timeline'],
    queryFn: () => API.studies.timeline(id),
    enabled: !!id,
  });
}
