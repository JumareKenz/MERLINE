'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { AiAgentSelector } from './ai-agent-selector';
import { AiMessageBubble } from './ai-message-bubble';
import { useAiSessions, useAiSession, useAiChat, useDeleteAiSession } from '@/hooks/use-ai';
import { cn } from '@/lib/utils';
import type { AgentId, AiMessage } from '@/types/ai';

interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
  initialAgent?: AgentId;
}

export function AiChatPanel({ open, onClose, initialAgent = 'knowledge' }: AiChatPanelProps) {
  const [agentId, setAgentId] = useState<AgentId>(initialAgent);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessionsData } = useAiSessions({ agent_id: agentId });
  const { data: sessionData, isLoading: sessionLoading, error: sessionError, refetch: refetchSession } = useAiSession(activeSessionId || '');
  const chatMutation = useAiChat();
  const deleteSessionMutation = useDeleteAiSession();

  const sessions = sessionsData?.data?.data || [];
  const messages = activeSessionId && sessionData?.data?.data ? (sessionData.data.data as { messages: AiMessage[] }).messages : localMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: AiMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput('');

    chatMutation.mutate(
      { session_id: activeSessionId || undefined, agent_id: agentId, message: input.trim() },
      {
        onSuccess: (response) => {
          const body = response.data;
          if (!activeSessionId) {
            setActiveSessionId(body.data.session_id);
          }
          setLocalMessages((prev) => [...prev, body.data.message]);
        },
        onError: () => {
          setLocalMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        },
      }
    );
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setLocalMessages([]);
  };

  const handleDeleteSession = (id: string) => {
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setLocalMessages([]);
    }
    deleteSessionMutation.mutate(id);
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[420px] flex-col rounded-lg border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleNewSession}>
            New
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b px-4 py-2">
        <AiAgentSelector value={agentId} onChange={setAgentId} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {sessions.length > 0 && (
          <div className="w-40 overflow-y-auto border-r p-2">
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">Sessions</p>
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setLocalMessages([]);
                }}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                  activeSessionId === session.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                )}
              >
                <p className="truncate">{session.id.slice(0, 8)}...</p>
                <p className="text-[10px] text-muted-foreground">{session.message_count} messages</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sessionLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-20 w-3/4 ml-auto" />
                <Skeleton className="h-16 w-3/4" />
              </div>
            ) : sessionError ? (
              <ErrorState message="Failed to load session" onRetry={() => refetchSession()} />
            ) : messages.length === 0 && !activeSessionId ? (
              <EmptyState
                icon={<Bot className="h-12 w-12" />}
                title="How can I help you?"
                description="Ask me anything about your studies, indicators, questionnaires, or data."
              />
            ) : messages.length === 0 ? (
              <EmptyState
                icon={<Bot className="h-12 w-12" />}
                title="Start a conversation"
                description="Send a message to begin chatting with the AI assistant."
              />
            ) : (
              messages.map((msg) => (
                <AiMessageBubble key={msg.id} message={msg} />
              ))
            )}

            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.2s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type your message..."
                disabled={chatMutation.isPending}
                className="flex-1"
              />
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || chatMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
