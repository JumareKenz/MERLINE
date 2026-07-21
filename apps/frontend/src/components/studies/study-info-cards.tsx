'use client';

import { CalendarDays, Users, MapPin, FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { Study } from '@/types/study';

interface StudyInfoCardsProps {
  study?: Study;
  isLoading?: boolean;
}

export function StudyInfoCards({ study, isLoading }: StudyInfoCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-24" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!study) return null;

  const infoItems = [
    { icon: <CalendarDays className="h-4 w-4" />, label: 'Timeline', value: `${formatDate(study.start_date || '')} - ${formatDate(study.end_date || '')}` },
    { icon: <Users className="h-4 w-4" />, label: 'Sample Size', value: study.sample_size ? String(study.sample_size) : 'Not set' },
    { icon: <MapPin className="h-4 w-4" />, label: 'Location', value: study.location || 'Not specified' },
    { icon: <FlaskConical className="h-4 w-4" />, label: 'Methodology', value: (study.methodology || '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {infoItems.map((item, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-foreground-secondary mb-1">
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </div>
            <p className="text-sm font-medium capitalize">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
