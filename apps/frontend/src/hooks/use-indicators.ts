'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateIndicatorDto, UpdateIndicatorDto, RecordIndicatorValueDto, SetIndicatorTargetDto, IndicatorFilterParams } from '@/types/indicator';

export function useIndicators(params?: IndicatorFilterParams) {
  return useQuery({
    queryKey: ['indicators', 'library', params],
    queryFn: () => API.indicators.library(params),
  });
}

export function useIndicator(id: string) {
  return useQuery({
    queryKey: ['indicators', 'detail', id],
    queryFn: () => API.indicators.get(id),
    enabled: !!id,
  });
}

export function useCreateIndicator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateIndicatorDto) => API.indicators.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicator created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create indicator');
    },
  });
}

export function useUpdateIndicator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIndicatorDto }) =>
      API.indicators.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      queryClient.invalidateQueries({ queryKey: ['indicators', 'detail', variables.id] });
      toast.success('Indicator updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update indicator');
    },
  });
}

export function useDeleteIndicator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.indicators.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicator deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete indicator');
    },
  });
}

export function useApproveIndicator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.indicators.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicator approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve indicator');
    },
  });
}

export function useSupersedeIndicator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newIndicatorId }: { id: string; newIndicatorId: string }) =>
      API.indicators.supersede(id, newIndicatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indicators'] });
      toast.success('Indicator superseded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to supersede indicator');
    },
  });
}

export function useIndicatorValues(indicatorId: string, dateRange?: { date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ['indicators', indicatorId, 'values', dateRange],
    queryFn: () => API.indicators.values.list(indicatorId, dateRange),
    enabled: !!indicatorId,
  });
}

export function useRecordIndicatorValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indicatorId, data }: { indicatorId: string; data: RecordIndicatorValueDto }) =>
      API.indicators.values.create(indicatorId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['indicators', variables.indicatorId] });
      toast.success('Value recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record value');
    },
  });
}

export function useSetIndicatorTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ indicatorId, data }: { indicatorId: string; data: SetIndicatorTargetDto }) =>
      API.indicators.targets.set(indicatorId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['indicators', variables.indicatorId] });
      toast.success('Target set successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set target');
    },
  });
}

export function useIndicatorTrend(indicatorId: string) {
  return useQuery({
    queryKey: ['indicators', indicatorId, 'trend'],
    queryFn: () => API.indicators.trend(indicatorId),
    enabled: !!indicatorId,
  });
}

export function useStudyIndicators(studyId: string) {
  return useQuery({
    queryKey: ['studies', studyId, 'indicators'],
    queryFn: () => API.indicators.study.list(studyId),
    enabled: !!studyId,
  });
}
