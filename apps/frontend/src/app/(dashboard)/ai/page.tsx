'use client';

import { useState } from 'react';
import { Bot, Sparkles, MessageSquare, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { AiAgentSelector } from '@/components/ai/ai-agent-selector';
import { AiMessageBubble } from '@/components/ai/ai-message-bubble';
import { useAiSessions, useAiSession, useAiChat, useDeleteAiSession } from '@/hooks/use-ai';
import { cn } from '@/lib/utils';
import type { AgentId, AiMessage } from '@/types/ai';

export default function AiChatPage() {
  const [agentId, setAgentId] = useState<AgentId>('knowledge');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<AiMessage[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useAiSessions({ agent_id: agentId });
  const { data: sessionData, isLoading: sessionLoading, error: sessionError, refetch: refetchSession } = useAiSession(activeSessionId || '');
  const chatMutation = useAiChat();
  const deleteSessionMutation = useDeleteAiSession();

  const sessions = sessionsData?.data?.data || [];
  const messages = activeSessionId && sessionData?.data?.data
    ? (sessionData.data.data as { messages: AiMessage[] }).messages
    : localMessages;

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
            refetchSessions();
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

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setLocalMessages([]);
  };

  const handleDeleteSession = (id: string) => {
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setLocalMessages([]);
    }
    deleteSessionMutation.mutate(id);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-lg border">
      {showSidebar && (
        <div className="flex w-72 flex-col border-r bg-muted/20">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Sessions</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewSession}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sessionsLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : sessionsError ? (
              <ErrorState message="Failed to load sessions" onRetry={() => refetchSessions()} />
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No sessions yet</p>
                <p className="text-xs text-muted-foreground">Start a new conversation</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      activeSessionId === session.id
                        ? 'bg-accent font-medium'
                        : 'hover:bg-accent/50'
                    )}
                    onClick={() => handleSelectSession(session.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium capitalize">
                        {session.agent_id.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.message_count} messages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <p className="text-xs text-muted-foreground text-center">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Assistant</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48">
              <AiAgentSelector value={agentId} onChange={setAgentId} />
            </div>
            <Button variant="outline" size="sm" onClick={handleNewSession}>
              <Plus className="mr-1 h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            {sessionLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-24 w-3/4 ml-auto" />
                <Skeleton className="h-20 w-3/4" />
              </div>
            ) : sessionError ? (
              <ErrorState message="Failed to load messages" onRetry={() => refetchSession()} />
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center pt-20">
                <EmptyState
                  icon={<Bot className="h-16 w-16" />}
                  title="How can I help you?"
                  description="Ask me anything about your studies, indicators, questionnaires, or data. I'm here to assist with research design, analysis, and more."
                />
              </div>
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
          </div>
        </div>

        <div className="border-t p-4">
          <div className="mx-auto max-w-3xl flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message..."
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || chatMutation.isPending}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
