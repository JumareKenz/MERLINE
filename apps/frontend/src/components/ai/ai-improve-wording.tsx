'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AiSuggestionPopover } from './ai-suggestion-popover';
import { useAiAssist } from '@/hooks/use-ai';

interface AiImproveWordingProps {
  onApply: (text: string) => void;
  className?: string;
}

export function AiImproveWording({ onApply, className }: AiImproveWordingProps) {
  const [text, setText] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const assistMutation = useAiAssist('improveWording');

  const handleAssist = () => {
    if (!text.trim()) return;
    setShowSuggestion(true);
    assistMutation.mutate({ text });
  };

  const handleApply = () => {
    if (assistMutation.data?.data?.data?.suggestion) {
      onApply(assistMutation.data.data.data.suggestion);
    }
    setShowSuggestion(false);
    setText('');
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to improve..."
          rows={3}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAssist}
          disabled={!text.trim() || assistMutation.isPending}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Improve Wording
        </Button>
      </div>

      <div className="relative">
        <AiSuggestionPopover
          open={showSuggestion}
          onClose={() => setShowSuggestion(false)}
          suggestion={assistMutation.data?.data?.data?.suggestion}
          confidence={assistMutation.data?.data?.data?.confidence}
          explanation={assistMutation.data?.data?.data?.explanation}
          isLoading={assistMutation.isPending}
          error={assistMutation.error?.message || null}
          onRetry={handleAssist}
          onApply={handleApply}
          onDismiss={() => setShowSuggestion(false)}
          title="Improved Wording"
        />
      </div>
    </div>
  );
}
