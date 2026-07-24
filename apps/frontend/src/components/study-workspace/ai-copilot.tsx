'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Send, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';

interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Suggestion {
  label: string;
  prompt: string;
}

interface AiCopilotProps {
  studyTitle: string;
  studyType?: string;
  currentStep: string;
  context?: Record<string, unknown>;
  onClose?: () => void;
}

const STEP_SUGGESTIONS: Record<string, Suggestion[]> = {
  research: [
    { label: 'Suggest research questions', prompt: 'Based on this study, suggest 5 specific, measurable research questions.' },
    { label: 'Improve my objectives', prompt: 'Review my objectives and suggest improvements using SMART criteria.' },
    { label: 'Check for gaps', prompt: 'What important research questions am I missing for this type of study?' },
  ],
  methodology: [
    { label: 'Recommend methodology', prompt: 'What methodology do you recommend for this study and why?' },
    { label: 'Calculate sample size', prompt: 'Help me determine the appropriate sample size for my study population and objectives.' },
    { label: 'Sampling strategy', prompt: 'What sampling strategy is most appropriate and what are the trade-offs?' },
  ],
  toc: [
    { label: 'Review my theory of change', prompt: 'Review my theory of change and identify any missing causal links or weak assumptions.' },
    { label: 'Suggest assumptions', prompt: 'What key assumptions should I document at each level of the causal chain?' },
    { label: 'Compare to similar studies', prompt: 'How does this theory of change compare to similar interventions in the literature?' },
  ],
  logframe: [
    { label: 'Review logframe completeness', prompt: 'Review my logframe and identify any missing elements or weak indicators.' },
    { label: 'Suggest indicators per level', prompt: 'Suggest 2-3 SMART indicators for each level of my logframe.' },
    { label: 'Check means of verification', prompt: 'Review my means of verification and suggest improvements.' },
  ],
  indicators: [
    { label: 'Recommend indicators', prompt: 'Recommend the most relevant indicators for this study type and objectives, aligned with SDG frameworks.' },
    { label: 'Check SMART criteria', prompt: 'Evaluate my indicators against SMART criteria and suggest improvements.' },
    { label: 'SDG alignment', prompt: 'Which SDG goals and targets do my indicators align with?' },
  ],
  instruments: [
    { label: 'Review questionnaire structure', prompt: 'Review my questionnaire structure and suggest improvements for flow and completeness.' },
    { label: 'Detect missing questions', prompt: 'What important questions am I missing to adequately measure my indicators?' },
    { label: 'Estimate interview time', prompt: 'Estimate the interview duration and suggest if any sections are too long.' },
    { label: 'Check for bias', prompt: 'Identify any leading questions, response bias, or cultural sensitivity issues.' },
  ],
  review: [
    { label: 'Generate study summary', prompt: 'Generate a comprehensive study design summary I can share with stakeholders.' },
    { label: 'Identify risks', prompt: 'What are the main risks and limitations of this study design?' },
    { label: 'Readiness checklist', prompt: 'Generate a readiness checklist for field deployment approval.' },
  ],
};

export function AiCopilot({ studyTitle, studyType, currentStep, context, onClose }: AiCopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: `I'm your research design assistant for **${studyTitle}**. I can help you design rigorous, validated research that meets international standards.\n\nWhat would you like help with?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = STEP_SUGGESTIONS[currentStep] || STEP_SUGGESTIONS.research;

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: CopilotMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await API.ai.chat({
        message: text,
        agent_id: 'research_design',
        context: {
          studyTitle,
          studyType,
          currentStep,
          ...context,
        },
      });
      const reply = res.data?.data?.message?.content ?? 'I encountered an issue. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I could not connect to the AI service. Please check your API configuration in Admin → AI Settings.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `How can I help you with **${studyTitle}**?`,
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-subtle shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold">AI Copilot</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="h-6 w-6 flex items-center justify-center rounded text-foreground-tertiary hover:text-foreground hover:bg-background-hover transition-colors"
            title="Clear conversation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="h-6 w-6 flex items-center justify-center rounded text-foreground-tertiary hover:text-foreground hover:bg-background-hover transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-[12px] leading-relaxed',
                msg.role === 'assistant'
                  ? 'bg-background-subtle border border-border text-foreground'
                  : 'bg-primary text-white ml-auto',
              )}
            >
              {msg.content.split('\n').map((line, li) => (
                <p key={li} className={cn(li > 0 && 'mt-1', line.startsWith('**') && 'font-semibold')}>
                  {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="bg-background-subtle border border-border rounded-lg px-3 py-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      <div className="px-3 pb-2 shrink-0">
        <p className="text-[10px] text-foreground-tertiary uppercase tracking-wide mb-1.5 font-medium">Quick actions</p>
        <div className="space-y-1">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => sendMessage(s.prompt)}
              disabled={isLoading}
              className="w-full text-left text-[12px] px-2.5 py-1.5 rounded-md bg-background-subtle hover:bg-background-hover border border-border/50 text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0 border-t border-border pt-2">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask anything about your study design…"
            rows={2}
            className="text-[12px] resize-none flex-1"
          />
          <Button
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
