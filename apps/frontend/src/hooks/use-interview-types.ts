'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import type { TypeField } from '@/types/review';

export function useProjectInterviewTypes(projectId: string) {
  return useQuery({
    queryKey: ['interview-types', projectId],
    queryFn: async () => (await API.interviewTypes.list(projectId)).data.data,
    enabled: !!projectId,
  });
}

export function useSetInterviewTypes(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (types: { key: string; label: string; description?: string; fields?: TypeField[] }[]) =>
      (await API.interviewTypes.replace(projectId, types)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interview-types', projectId] });
      toast.success('Interview types saved');
    },
    onError: (err) => toast.error(describeError(err, 'The interview types could not be saved')),
  });
}
