'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { DashboardWidget } from '@/types/dashboard';

export function useExecutiveDashboard(dateRange?: string) {
  return useQuery({
    queryKey: ['dashboard', 'executive', dateRange],
    queryFn: () => API.dashboard.executive({ date_range: dateRange }),
  });
}

export function useStudyDashboard(studyId: string) {
  return useQuery({
    queryKey: ['dashboard', 'study', studyId],
    queryFn: () => API.dashboard.study(studyId),
    enabled: !!studyId,
  });
}

export function useIndicatorDashboard(indicatorId: string) {
  return useQuery({
    queryKey: ['dashboard', 'indicator', indicatorId],
    queryFn: () => API.indicators.trend(indicatorId),
    enabled: !!indicatorId,
  });
}

export function useDashboardAlerts(studyId?: string, severity?: string) {
  return useQuery({
    queryKey: ['dashboard', 'alerts', studyId, severity],
    queryFn: () => API.dashboard.alerts({ study_id: studyId, date_range: severity }),
  });
}

export function useEvaluateAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studyId: string) => API.dashboard.evaluateAlerts(studyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'alerts'] });
      toast.success('Alerts evaluated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to evaluate alerts');
    },
  });
}

export function useSaveDashboardLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (widgets: DashboardWidget[]) => API.dashboard.saveLayout(widgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Layout saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save layout');
    },
  });
}
