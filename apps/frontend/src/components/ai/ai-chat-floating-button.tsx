'use client';

import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiChatFloatingButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
}

export function AiChatFloatingButton({ isOpen, onToggle, unreadCount }: AiChatFloatingButtonProps) {
  return (
    <Button
      onClick={onToggle}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
        isOpen && 'bg-muted hover:bg-muted text-foreground'
      )}
    >
      {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      {!isOpen && unreadCount && unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-error-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}
