'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateReportDto, UpdateReportDto, CreateReportScheduleDto, UpdateReportScheduleDto } from '@/types/report';

export function useReports(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['reports', 'list', params],
    queryFn: () => API.reports.list(params as import('@/types/api').FilterParams),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: ['reports', 'detail', id],
    queryFn: () => API.reports.get(id),
    enabled: !!id,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReportDto) => API.reports.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create report');
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReportDto }) =>
      API.reports.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'detail', variables.id] });
      toast.success('Report updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update report');
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete report');
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.reports.generate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'detail', id] });
      toast.success('Report generation started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate report');
    },
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      API.reports.export(id, format),
    onSuccess: (response) => {
      const disposition = response.headers?.['content-disposition'];
      const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || 'report';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export report');
    },
  });
}

export function useCloneReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.reports.clone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report cloned');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone report');
    },
  });
}

export function useReportTemplates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['report-templates', 'list', params],
    queryFn: () => API.reports.templates.list(params as import('@/types/api').FilterParams),
  });
}

export function useReportTemplate(id: string) {
  return useQuery({
    queryKey: ['report-templates', 'detail', id],
    queryFn: () => API.reports.templates.get(id),
    enabled: !!id,
  });
}

export function useCreateReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: CreateReportScheduleDto }) =>
      API.reports.schedule.create(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Schedule created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create schedule');
    },
  });
}

export function useUpdateReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: UpdateReportScheduleDto }) =>
      API.reports.schedule.update(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Schedule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update schedule');
    },
  });
}

export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => API.reports.schedule.delete(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Schedule removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove schedule');
    },
  });
}
