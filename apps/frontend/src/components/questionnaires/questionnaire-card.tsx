'use client';

import Link from 'next/link';
import { FileText, Layers, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { Questionnaire } from '@/types/questionnaire';

const STATUS_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  under_review: 'warning',
  approved: 'success',
  published: 'primary',
  archived: 'info',
};

interface QuestionnaireCardProps {
  questionnaire: Questionnaire;
}

export function QuestionnaireCard({ questionnaire }: QuestionnaireCardProps) {
  return (
    <Card className="hover:shadow-2 transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base truncate">{questionnaire.title}</CardTitle>
          <StatusBadge status={questionnaire.status} variant={STATUS_MAP[questionnaire.status] || 'default'} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-foreground-secondary">
          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> v{questionnaire.version}</span>
          <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {questionnaire.question_count} questions</span>
          <span className="flex items-center gap-1"><Edit3 className="h-3.5 w-3.5" /> {formatDate(questionnaire.updated_at)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" asChild className="flex-1">
            <Link href={`/questionnaires/${questionnaire.id}/edit`}>Edit</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="flex-1">
            <Link href={`/questionnaires/${questionnaire.id}/preview`}>Preview</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
