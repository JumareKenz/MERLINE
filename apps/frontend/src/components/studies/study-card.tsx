'use client';

import Link from 'next/link';
import { CalendarDays, BarChart3, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudyStatusBadge } from './study-status-badge';
import { StudyLifecycleProgress } from './study-lifecycle-progress';
import { formatDate } from '@/lib/utils';
import type { Study } from '@/types/study';

interface StudyCardProps {
  study: Study;
}

export function StudyCard({ study }: StudyCardProps) {
  return (
    <Link href={`/studies/${study.id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{study.title}</CardTitle>
              <p className="text-xs text-foreground-secondary mt-0.5">{study.code}</p>
            </div>
            <StudyStatusBadge status={study.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-foreground-secondary capitalize">{(study.study_type || '').replace(/_/g, ' ')} &middot; {(study.methodology || '').replace(/_/g, ' ')}</p>
          <StudyLifecycleProgress status={study.status} />
          <div className="flex items-center gap-4 text-xs text-foreground-secondary">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(study.start_date || '')}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              {study.indicator_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              {study.questionnaire_count}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
