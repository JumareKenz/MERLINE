export type AgentId = 'research_design' | 'survey_design' | 'indicator' | 'data_quality' | 'reporting' | 'knowledge' | 'qualitative' | 'executive' | 'translation';

export interface AiSession {
  id: string;
  agent_id: AgentId;
  study_id?: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    confidence?: number;
    citations?: { text: string; source: string }[];
    requires_review?: boolean;
  };
  created_at: string;
}

export interface AiInference {
  id: string;
  agent: string;
  model: string;
  latency_ms: number;
  cost: number;
  tokens: number;
  confidence: number;
  status: string;
  created_at: string;
}

export interface AiAssistRequest {
  text: string;
  context?: Record<string, unknown>;
}

export interface AiAssistResponse {
  suggestion: string;
  confidence: number;
  explanation?: string;
}

export interface AiMetrics {
  total_inferences: number;
  total_cost: number;
  avg_latency_ms: number;
  total_tokens: number;
  agent_breakdown: Record<string, { inferences: number; cost: number; tokens: number; avg_latency_ms: number }>;
  daily_usage: { date: string; inferences: number; cost: number; tokens: number }[];
}

export interface AiPrompt {
  id: string;
  agent_id: AgentId;
  version: string;
  content: string;
  model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RagDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface RagSearchRequest {
  query: string;
  agent_id?: AgentId;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface RagSearchResult {
  chunk_id: string;
  text: string;
  source: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface ChatRequest {
  session_id?: string;
  agent_id: AgentId;
  message: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  session_id: string;
  message: AiMessage;
}
