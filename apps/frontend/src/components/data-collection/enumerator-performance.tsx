'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, XCircle, Activity, BarChart3 } from 'lucide-react';

interface EnumeratorPerformanceProps {
  totalSubmissions?: number;
  approvedCount?: number;
  rejectedCount?: number;
  qualityScore?: number;
  avgDuration?: number;
  trend?: 'up' | 'down' | 'stable';
}

export function EnumeratorPerformance({
  totalSubmissions = 0,
  approvedCount = 0,
  rejectedCount = 0,
  qualityScore = 0,
  avgDuration = 0,
  trend = 'stable',
}: EnumeratorPerformanceProps) {
  const approvalRate = totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground-secondary">Submissions</span>
          </div>
          <p className="text-2xl font-bold">{totalSubmissions}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm text-foreground-secondary">Approval Rate</span>
          </div>
          <p className="text-2xl font-bold">{approvalRate}%</p>
          <Progress value={approvalRate} className="h-2" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground-secondary">Quality Score</span>
          </div>
          <p className={`text-2xl font-bold ${qualityScore >= 80 ? 'text-success' : qualityScore >= 50 ? 'text-warning' : 'text-error'}`}>
            {qualityScore}%
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground-secondary">Trend</span>
          </div>
          <p className="text-2xl font-bold capitalize">{trend}</p>
        </CardContent>
      </Card>
    </div>
  );
}
