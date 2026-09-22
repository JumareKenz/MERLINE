'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateConsentDto } from '@/types/consent';

export function useConsentsForParticipant(participantId: string) {
  return useQuery({
    queryKey: ['consents', 'participant', participantId],
    queryFn: () => API.consents.listForParticipant(participantId),
    enabled: !!participantId,
  });
}

export function useConsent(id: string) {
  return useQuery({
    queryKey: ['consents', 'detail', id],
    queryFn: () => API.consents.get(id),
    enabled: !!id,
  });
}

export function useRecordConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConsentDto) => API.consents.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consents', 'participant', variables.participantId] });
      toast.success('Consent recorded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record consent');
    },
  });
}

export function useWithdrawConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.consents.withdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      toast.success('Consent withdrawn');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to withdraw consent');
    },
  });
}
