'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  AgentId,
  AiAssistRequest,
  ChatRequest,
  RagSearchRequest,
} from '@/types/ai';

export function useAiChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChatRequest) => API.ai.chat(data),
    onSuccess: (_, variables) => {
      if (variables.session_id) {
        queryClient.invalidateQueries({ queryKey: ['ai', 'session', variables.session_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['ai', 'sessions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useAiSessions(params?: { agent_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['ai', 'sessions', params],
    queryFn: () => API.ai.sessions.list(params),
  });
}

export function useAiSession(id: string) {
  return useQuery({
    queryKey: ['ai', 'session', id],
    queryFn: () => API.ai.sessions.get(id),
    enabled: !!id,
  });
}

export function useDeleteAiSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.ai.sessions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'sessions'] });
      toast.success('Session closed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete session');
    },
  });
}

export function useAiAgent(agentId: AgentId) {
  const agentMap: Record<AgentId, (data: { text: string; context?: Record<string, unknown>; target_language?: string }) => Promise<unknown>> = {
    research_design: (data) => API.ai.agents.researchDesign(data),
    survey_design: (data) => API.ai.agents.surveyDesign(data),
    indicator: (data) => API.ai.agents.indicator(data),
    reporting: (data) => API.ai.agents.reporting(data),
    data_quality: (data) => API.ai.agents.dataQuality(data),
    qualitative: (data) => API.ai.agents.qualitative(data),
    executive: (data) => API.ai.agents.executive(data),
    knowledge: (data) => API.ai.agents.knowledge(data),
    translation: (data) => API.ai.agents.translation(data as { text: string; target_language: string; context?: Record<string, unknown> }),
  };

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; context?: Record<string, unknown> }) =>
      agentMap[agentId](data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'metrics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Agent request failed');
    },
  });
}

export function useAiAssist(action: keyof typeof API.ai.assist) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AiAssistRequest) => {
      const actionFn = API.ai.assist[action];
      return actionFn(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'metrics'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'AI assist request failed');
    },
  });
}

export function useRagSearch() {
  return useMutation({
    mutationFn: (data: RagSearchRequest) => API.ai.rag.search(data),
    onError: (error: Error) => {
      toast.error(error.message || 'Search failed');
    },
  });
}

export function useRagDocuments(params?: { status?: string }) {
  return useQuery({
    queryKey: ['ai', 'rag', 'documents', params],
    queryFn: () => API.ai.rag.documents.list(params),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => API.ai.rag.ingest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'rag', 'documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Upload failed');
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.ai.rag.documents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'rag', 'documents'] });
      toast.success('Document removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove document');
    },
  });
}

export function useAiInferences(params?: { agent?: string; date_from?: string; date_to?: string; page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['ai', 'inferences', params],
    queryFn: () => API.ai.metrics.inferences(params),
  });
}

export function useAiMetrics() {
  return useQuery({
    queryKey: ['ai', 'metrics'],
    queryFn: () => API.ai.metrics.stats(),
  });
}
