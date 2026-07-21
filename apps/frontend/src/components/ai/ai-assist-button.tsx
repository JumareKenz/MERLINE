'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiAssistButtonProps {
  onClick: () => void;
  label?: string;
  size?: 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function AiAssistButton({ onClick, label = 'AI Assist', size = 'sm', className, disabled }: AiAssistButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn('gap-1.5', className)}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span>{label}</span>
    </Button>
  );
}
