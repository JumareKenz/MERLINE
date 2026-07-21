'use client';

import { X, Sparkles, Check, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';

interface AiSuggestionPopoverProps {
  open: boolean;
  onClose: () => void;
  suggestion?: string;
  confidence?: number;
  explanation?: string;
  isLoading?: boolean;
  error?: string | null;
  onApply?: () => void;
  onDismiss?: () => void;
  onRetry?: () => void;
  title?: string;
  align?: 'left' | 'right';
}

export function AiSuggestionPopover({
  open,
  onClose,
  suggestion,
  confidence,
  explanation,
  isLoading,
  error,
  onApply,
  onDismiss,
  onRetry,
  title = 'AI Suggestion',
  align = 'left',
}: AiSuggestionPopoverProps) {
  if (!open) return null;

  return (
    <div className="relative z-50">
      <div className={cn(
        'absolute top-2 w-80 rounded-lg border bg-background p-4 shadow-lg',
        align === 'right' ? 'right-0' : 'left-0'
      )}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : suggestion ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">{suggestion}</p>
            {confidence !== undefined && (
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-1.5 flex-1 rounded-full bg-muted overflow-hidden',
                )}>
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      confidence >= 0.8 ? 'bg-success' :
                      confidence >= 0.5 ? 'bg-warning' :
                      'bg-error'
                    )}
                    style={{ width: `${Math.round(confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(confidence * 100)}%</span>
              </div>
            )}
            {explanation && (
              <p className="text-xs text-muted-foreground">{explanation}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              {onApply && (
                <Button size="sm" onClick={onApply}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Apply
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
              {onRetry && (
                <Button variant="ghost" size="sm" onClick={onRetry}>
                  <RotateCw className="mr-1 h-3.5 w-3.5" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
