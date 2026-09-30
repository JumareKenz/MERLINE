'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import type { CreateEnumeratorInput, EnumeratorFilters, UpdateEnumeratorInput } from '@/types/enumerator';

const KEY = ['enumerators'] as const;

export function useEnumerators(filters: EnumeratorFilters) {
  return useQuery({
    queryKey: [...KEY, 'list', filters],
    queryFn: async () => (await API.enumerators.list(filters)).data.data,
    placeholderData: keepPreviousData,
  });
}

export function useEnumerator(id: string) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: async () => (await API.enumerators.get(id)).data.data,
    enabled: !!id,
  });
}

export function useEnumeratorSubmissions(id: string, params?: { type?: string; projectId?: string }) {
  return useQuery({
    queryKey: [...KEY, 'submissions', id, params],
    queryFn: async () => (await API.enumerators.submissions(id, params)).data.data,
    enabled: !!id,
  });
}

/** Every mutation refreshes the list and the detail it may have changed. */
function useEnumeratorMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  opts: { success?: string; failure: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      if (opts.success) toast.success(opts.success);
    },
    onError: (err) => toast.error(describeError(err, opts.failure)),
  });
}

export function useCreateEnumerator() {
  return useEnumeratorMutation(async (data: CreateEnumeratorInput) => (await API.enumerators.create(data)).data.data, {
    failure: 'The enumerator could not be created',
  });
}

export function useUpdateEnumerator(id: string) {
  return useEnumeratorMutation(async (data: UpdateEnumeratorInput) => (await API.enumerators.update(id, data)).data.data, {
    success: 'Details saved',
    failure: 'The details could not be saved',
  });
}

export function useSetEnumeratorActive(id: string) {
  return useEnumeratorMutation(async (isActive: boolean) => (await API.enumerators.setActive(id, isActive)).data.data, {
    failure: 'The account status could not be changed',
  });
}

export function useAssignProject(id: string) {
  return useEnumeratorMutation(async (projectId: string) => (await API.enumerators.assignProject(id, projectId)).data.data, {
    success: 'Project assigned',
    failure: 'The project could not be assigned',
  });
}

export function useRemoveProject(id: string) {
  return useEnumeratorMutation(async (projectId: string) => (await API.enumerators.removeProject(id, projectId)).data.data, {
    success: 'Project removed. The enumerator can no longer start interviews in it.',
    failure: 'The project could not be removed',
  });
}

/** Issue or regenerate: the previous code stops working at once. */
export function useIssueCode(id: string) {
  return useEnumeratorMutation(async (validDays?: number) => (await API.enumerators.issueCode(id, validDays)).data.data, {
    failure: 'A new code could not be issued',
  });
}

export function useRevokeCode(id: string) {
  return useEnumeratorMutation(async (reason?: string) => (await API.enumerators.revokeCode(id, reason)).data.data, {
    success: 'Code revoked. It no longer works, and phones using it are signed out.',
    failure: 'The code could not be revoked',
  });
}

/** Assign any enumerator to a project (from the project page). */
export function useAssignEnumeratorToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enumeratorId, projectId }: { enumeratorId: string; projectId: string }) =>
      (await API.enumerators.assignProject(enumeratorId, projectId)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Enumerator assigned');
    },
    onError: (err) => toast.error(describeError(err, 'The enumerator could not be assigned')),
  });
}
