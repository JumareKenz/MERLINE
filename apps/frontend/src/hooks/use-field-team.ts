'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import type { CreateFieldWorkerInput } from '@/types/field';

export function useFieldTeam() {
  return useQuery({
    queryKey: ['field-team'],
    queryFn: async () => (await API.fieldTeam.list()).data.data,
  });
}

export function useCreateFieldWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFieldWorkerInput) => (await API.fieldTeam.create(data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['field-team'] }),
    onError: (err) => toast.error(describeError(err, 'The field worker could not be added')),
  });
}

export function useSetFieldWorkerProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, projectIds }: { userId: string; projectIds: string[] }) =>
      (await API.fieldTeam.setProjects(userId, projectIds)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-team'] });
      toast.success('Projects updated');
    },
    onError: (err) => toast.error(describeError(err, 'Projects could not be updated')),
  });
}

export function useIssueAccessCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await API.users.generateFieldAccessCode(userId)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['field-team'] }),
    onError: (err) => toast.error(describeError(err, 'A new code could not be issued')),
  });
}

export function useRevokeAccessCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => API.users.revokeFieldAccessCode(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-team'] });
      toast.success('Access revoked. The code no longer works.');
    },
    onError: (err) => toast.error(describeError(err, 'Access could not be revoked')),
  });
}
