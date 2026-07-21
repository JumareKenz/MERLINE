'use client';

import { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { useAiAssist } from '@/hooks/use-ai';
import { cn } from '@/lib/utils';

interface AiQuestionSuggestionsProps {
  onAdd: (suggestion: string) => void;
  context?: Record<string, unknown>;
  className?: string;
}

export function AiQuestionSuggestions({ onAdd, context, className }: AiQuestionSuggestionsProps) {
  const [text, setText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const assistMutation = useAiAssist('suggestQuestions');

  const handleSuggest = () => {
    if (!text.trim()) return;
    setShowResults(true);
    assistMutation.mutate({ text, context });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the information you want to collect..."
          rows={2}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSuggest}
          disabled={!text.trim() || assistMutation.isPending}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Suggest Questions
        </Button>
      </div>

      {showResults && (
        <div className="rounded-lg border p-3">
          {assistMutation.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : assistMutation.error ? (
            <ErrorState message={assistMutation.error.message} onRetry={handleSuggest} />
          ) : assistMutation.data?.data?.data?.suggestion ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Suggested Questions</p>
              <ul className="space-y-2">
                {assistMutation.data.data.data.suggestion.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-sm">
                    <span className="flex-1">{line}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onAdd(line)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
