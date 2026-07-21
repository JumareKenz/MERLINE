'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateAssignmentDto, BatchAssignDto, AssignmentFilterParams } from '@/types/assignment';

export function useAssignments(params?: AssignmentFilterParams) {
  return useQuery({
    queryKey: ['assignments', 'list', params],
    queryFn: () => API.assignments.list(params),
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: ['assignments', 'detail', id],
    queryFn: () => API.assignments.get(id),
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssignmentDto) => API.assignments.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create assignment');
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssignmentDto> }) =>
      API.assignments.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignments', 'detail', variables.id] });
      toast.success('Assignment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update assignment');
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.assignments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete assignment');
    },
  });
}

export function useBatchAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchAssignDto) => API.assignments.batch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignments created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create assignments');
    },
  });
}

export function useApproveAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.assignments.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve assignment');
    },
  });
}

export function useRejectAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      API.assignments.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Assignment rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject assignment');
    },
  });
}

export function useAssignmentProgress(id: string) {
  return useQuery({
    queryKey: ['assignments', 'progress', id],
    queryFn: () => API.assignments.progress(id),
    enabled: !!id,
  });
}

export function useEnumeratorAssignments(eid: string) {
  return useQuery({
    queryKey: ['enumerator', eid, 'assignments'],
    queryFn: () => API.assignments.enumeratorList(eid),
    enabled: !!eid,
  });
}

export function useEnumeratorLoad(eid: string) {
  return useQuery({
    queryKey: ['enumerator', eid, 'load'],
    queryFn: () => API.assignments.enumeratorLoad(eid),
    enabled: !!eid,
  });
}
