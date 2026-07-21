'use client';

import { BookOpen } from 'lucide-react';

interface AiCitationCardProps {
  text: string;
  source: string;
}

export function AiCitationCard({ text, source }: AiCitationCardProps) {
  return (
    <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 space-y-1">
          <p className="text-foreground">&ldquo;{text}&rdquo;</p>
          <p className="text-xs text-muted-foreground">Source: {source}</p>
        </div>
      </div>
    </div>
  );
}
