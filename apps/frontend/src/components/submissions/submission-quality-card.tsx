'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface SubmissionQualityCardProps {
  completionRate?: number;
  avgTimeSeconds?: number;
  flagRate?: number;
  totalFlags?: number;
  totalSubmissions?: number;
}

export function SubmissionQualityCard({
  completionRate = 0,
  avgTimeSeconds = 0,
  flagRate = 0,
  totalFlags = 0,
  totalSubmissions = 0,
}: SubmissionQualityCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Completion Rate</span>
          </div>
          <p className="text-2xl font-bold">{completionRate}%</p>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold">
            {avgTimeSeconds > 0 ? `${Math.floor(avgTimeSeconds / 60)}m` : '—'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Flag Rate</span>
          </div>
          <p className="text-2xl font-bold">{flagRate}%</p>
          <p className="text-xs text-foreground-secondary">{totalFlags} flags in {totalSubmissions} submissions</p>
        </CardContent>
      </Card>
    </div>
  );
}
