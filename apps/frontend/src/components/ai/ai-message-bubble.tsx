'use client';

import { Bot, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiCitationCard } from './ai-citation-card';
import type { AiMessage } from '@/types/ai';

interface AiMessageBubbleProps {
  message: AiMessage;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8 ? 'bg-success/10 text-success' :
    confidence >= 0.5 ? 'bg-warning/10 text-warning' :
    'bg-error/10 text-error';

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' :
          isSystem ? 'bg-muted text-muted-foreground' :
          'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : isSystem ? <Shield className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser ? 'bg-primary text-primary-foreground' :
            'bg-muted text-foreground'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.metadata && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            {message.metadata.confidence !== undefined && (
              <ConfidenceBadge confidence={message.metadata.confidence} />
            )}
            {message.metadata.requires_review && (
              <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Requires review
              </span>
            )}
          </div>
        )}
        {message.metadata?.citations && message.metadata.citations.length > 0 && (
          <div className="mt-1 space-y-1 px-1">
            {message.metadata.citations.map((citation, i) => (
              <AiCitationCard key={i} text={citation.text} source={citation.source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
