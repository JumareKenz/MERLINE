'use client';

import { FlaskConical, BarChart3, ClipboardList, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectStats } from '@/types/project';

interface StatsCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}

function StatsCard({ icon, value, label }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-foreground-secondary">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectStatsProps {
  stats?: ProjectStats;
  isLoading?: boolean;
}

export function ProjectStats({ stats, isLoading }: ProjectStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard icon={<FlaskConical className="h-5 w-5" />} value={stats.total_studies} label="Total Studies" />
      <StatsCard icon={<BarChart3 className="h-5 w-5" />} value={stats.total_indicators} label="Indicators" />
      <StatsCard icon={<ClipboardList className="h-5 w-5" />} value={stats.total_questionnaires} label="Questionnaires" />
      <StatsCard icon={<Users className="h-5 w-5" />} value={stats.team_members} label="Team Members" />
      <StatsCard icon={<TrendingUp className="h-5 w-5" />} value={`${stats.completion_percentage}%`} label="Completion" />
    </div>
  );
}
