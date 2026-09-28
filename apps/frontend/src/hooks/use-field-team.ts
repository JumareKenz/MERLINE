'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import type { CreateAccessCodeInput } from '@/types/field';

export function useFieldTeam() {
  return useQuery({
    queryKey: ['field-team'],
    queryFn: async () => (await API.fieldTeam.list()).data.data,
  });
}

export function useCreateAccessCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAccessCodeInput) => (await API.fieldTeam.create(data)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['field-team'] }),
    onError: (err) => toast.error(describeError(err, 'The access code could not be created')),
  });
}

export function useRenameAccessCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => (await API.fieldTeam.rename(userId, name)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-team'] });
      toast.success('Name updated');
    },
    onError: (err) => toast.error(describeError(err, 'The name could not be changed')),
  });
}

/** Reads a code back for an administrator to pass on. */
export async function fetchAccessCode(userId: string): Promise<string | null> {
  return (await API.fieldTeam.code(userId)).data.data.code;
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
      toast.success('Code revoked. It no longer works, and phones using it are signed out.');
    },
    onError: (err) => toast.error(describeError(err, 'Access could not be revoked')),
  });
}
