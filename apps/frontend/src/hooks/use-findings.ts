'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateFindingDto, AddQuotationDto } from '@/types/finding';

export function useFindings(projectId?: string) {
  return useQuery({
    queryKey: ['findings', 'list', projectId],
    queryFn: () => API.findings.list(projectId),
  });
}

export function useFinding(id: string) {
  return useQuery({
    queryKey: ['findings', 'detail', id],
    queryFn: () => API.findings.get(id),
    enabled: !!id,
  });
}

export function useCreateFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFindingDto) => API.findings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      toast.success('Finding created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create finding');
    },
  });
}

export function useAddQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddQuotationDto }) =>
      API.findings.addQuotation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['findings', 'detail', variables.id] });
      toast.success('Quotation added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add quotation');
    },
  });
}

function useFindingTransition(
  fn: (id: string) => ReturnType<typeof API.findings.approve>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['findings', 'detail', id] });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Action failed');
    },
  });
}

export function useApproveFinding() {
  return useFindingTransition(API.findings.approve, 'Finding approved');
}

export function useRejectFinding() {
  return useFindingTransition(API.findings.reject, 'Finding rejected');
}

export function usePublishFinding() {
  return useFindingTransition(API.findings.publish, 'Finding published');
}

export function useArchiveFinding() {
  return useFindingTransition(API.findings.archive, 'Finding archived');
}

export function useAiDraftFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transcriptId: string) => API.findings.aiDraft(transcriptId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      const n = res.data.data.findings.length;
      toast.success(`${n} draft finding${n === 1 ? '' : 's'} created from the whole interview. Review each before approving.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'AI drafting failed');
    },
  });
}
