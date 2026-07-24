'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStudy } from '@/hooks/use-studies';
import { useAssignments, useUpdateAssignment } from '@/hooks/use-assignments';
import { useSubmissions, useUpdateSubmission } from '@/hooks/use-submissions';
import { useSyncStatus } from '@/hooks/use-sync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Plus, RefreshCw, CheckCircle2, XCircle, Clock, Wifi, WifiOff,
  ArrowLeft, Users, FileCheck, AlertTriangle, Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  completed: 'bg-success/10 text-success',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  COMPLETED: 'bg-success/10 text-success',
  APPROVED: 'bg-success/10 text-success',
  REJECTED: 'bg-error/10 text-error',
};

function KpiTile({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={cn('rounded-lg p-4 flex items-center gap-3', color)}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[22px] font-semibold tracking-tight leading-none">{value}</p>
        <p className="text-[12px] mt-0.5 opacity-80">{label}</p>
      </div>
    </div>
  );
}

export default function CollectPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: studyData, isLoading: studyLoading } = useStudy(studyId);
  const { data: assignmentsData, isLoading: assignmentsLoading, refetch: refetchAssignments } = useAssignments({ study_id: studyId });
  const { data: submissionsData, isLoading: submissionsLoading, refetch: refetchSubmissions } = useSubmissions({ study_id: studyId, per_page: 50 });
  const { data: syncData, isLoading: syncLoading, refetch: refetchSync } = useSyncStatus();
  const updateSubmission = useUpdateSubmission();

  const study = studyData?.data?.data;
  const assignments = assignmentsData?.data?.data || [];
  const submissions = submissionsData?.data?.data || [];
  const syncDevices = syncData?.data?.data || [];

  const pendingSubmissions = submissions.filter((s: any) =>
    ['completed', 'synced', 'COMPLETED', 'SYNCED'].includes(s.status)
  );
  const approvedSubmissions = submissions.filter((s: any) =>
    ['approved', 'APPROVED'].includes(s.status)
  );
  const flaggedSubmissions = submissions.filter((s: any) => s.flagged);
  const syncedDevices = syncDevices.filter((d: any) => d.status === 'synced' || d.last_sync_at);
  const offlineDevices = syncDevices.filter((d: any) => !d.last_sync_at || d.status === 'offline');

  const approveSubmission = async (submissionId: string) => {
    setApprovingId(submissionId);
    try {
      await updateSubmission.mutateAsync({ id: submissionId, data: { status: 'APPROVED' as any } });
      refetchSubmissions();
      toast.success('Submission approved');
    } catch {
      toast.error('Failed to approve submission');
    } finally {
      setApprovingId(null);
    }
  };

  const rejectSubmission = async (submissionId: string) => {
    setRejectingId(submissionId);
    try {
      await updateSubmission.mutateAsync({ id: submissionId, data: { status: 'REJECTED' as any } });
      refetchSubmissions();
      toast.success('Submission rejected');
    } catch {
      toast.error('Failed to reject submission');
    } finally {
      setRejectingId(null);
    }
  };

  const refreshAll = () => {
    refetchAssignments();
    refetchSubmissions();
    refetchSync();
  };

  if (studyLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!study) return <ErrorState message="Study not found" />;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/studies/${studyId}`} className="text-foreground-tertiary hover:text-foreground text-[12px] flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {study.title}
            </Link>
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight">Collection Hub</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            Supervisor view — monitor field progress and review submissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={refreshAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href={`/assignments/new?study_id=${studyId}`}>
            <Button size="sm" className="h-8 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Assignment
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Active Assignments"
          value={assignments.filter((a: any) => ['ASSIGNED','assigned','IN_PROGRESS','in_progress'].includes(a.status)).length}
          icon={<Layers className="h-5 w-5 opacity-70" />}
          color="bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
        />
        <KpiTile
          label="Submissions Received"
          value={submissions.length}
          icon={<FileCheck className="h-5 w-5 opacity-70" />}
          color="bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
        />
        <KpiTile
          label="Awaiting Review"
          value={pendingSubmissions.length}
          icon={<Clock className="h-5 w-5 opacity-70" />}
          color="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
        />
        <KpiTile
          label="Flagged"
          value={flaggedSubmissions.length}
          icon={<AlertTriangle className="h-5 w-5 opacity-70" />}
          color={flaggedSubmissions.length > 0 ? 'bg-error/10 text-error' : 'bg-background-subtle text-foreground-tertiary'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Assignments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Assignments table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  Field Assignments
                </CardTitle>
                <span className="text-[12px] text-foreground-tertiary">{assignments.length} total</span>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-foreground-tertiary mb-3">No assignments yet</p>
                  <Link href={`/assignments/new?study_id=${studyId}`}>
                    <Button size="sm" className="h-8 text-[13px]">
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Create First Assignment
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assignments.map((a: any) => {
                    const progress = a.submission_count != null && a.target_count
                      ? Math.round((a.submission_count / a.target_count) * 100)
                      : null;
                    return (
                      <Link key={a.id} href={`/assignments/${a.id}`} className="flex items-center gap-3 py-3 hover:bg-background-hover -mx-4 px-4 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">
                            {a.enumerator?.name ?? a.enumerator_id ?? 'Unassigned'}
                          </p>
                          <p className="text-[11px] text-foreground-tertiary mt-0.5 truncate">
                            {a.questionnaire?.title ?? 'Questionnaire'} · {formatDate(a.due_date ?? a.end_date ?? '')}
                          </p>
                        </div>
                        {progress != null && (
                          <div className="w-24 shrink-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-foreground-tertiary tabular-nums">{a.submission_count}/{a.target_count}</span>
                              <span className="text-[11px] font-medium tabular-nums">{progress}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', STATUS_COLOR[a.status] ?? 'bg-background-subtle text-foreground-tertiary')}>
                          {(a.status ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission approval queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" strokeWidth={1.75} />
                  Review Queue
                </CardTitle>
                <span className="text-[12px] text-foreground-tertiary">{pendingSubmissions.length} pending</span>
              </div>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-[13px] text-foreground-secondary">All submissions reviewed</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingSubmissions.slice(0, 10).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium font-mono truncate">
                          #{s.id.slice(0, 8)}…
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-foreground-tertiary">
                            {s.enumerator?.name ?? 'Unknown enumerator'}
                          </span>
                          {s.quality_score != null && (
                            <span className={cn(
                              'text-[11px] font-medium',
                              s.quality_score >= 80 ? 'text-success' : s.quality_score >= 60 ? 'text-warning' : 'text-error',
                            )}>
                              Q: {s.quality_score}%
                            </span>
                          )}
                          {s.flagged && (
                            <span className="text-[11px] text-error flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" /> Flagged
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={`/submissions/${s.id}`}>
                          <Button size="xs" variant="ghost" className="h-7 px-2 text-[11px]">View</Button>
                        </Link>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-success hover:bg-success/10"
                          disabled={approvingId === s.id}
                          onClick={() => approveSubmission(s.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-7 px-2 text-[11px] text-error hover:bg-error/10"
                          disabled={rejectingId === s.id}
                          onClick={() => rejectSubmission(s.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingSubmissions.length > 10 && (
                    <Link href={`/submissions?study_id=${studyId}`} className="block text-center text-[12px] text-primary py-3 hover:underline">
                      View all {pendingSubmissions.length} pending submissions →
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Sync + Summary */}
        <div className="space-y-4">
          {/* Sync status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Device Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncLoading ? (
                <div className="space-y-2">{[1,2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : syncDevices.length === 0 ? (
                <p className="text-[12px] text-foreground-tertiary text-center py-4">No devices registered</p>
              ) : (
                <div className="space-y-2">
                  {syncDevices.slice(0, 8).map((d: any) => (
                    <div key={d.id ?? d.device_id} className="flex items-center gap-2.5">
                      {d.status === 'offline' || !d.last_sync_at ? (
                        <WifiOff className="h-3.5 w-3.5 text-foreground-tertiary shrink-0" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5 text-success shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate">{d.device_id ?? d.id ?? 'Device'}</p>
                        {d.last_sync_at && (
                          <p className="text-[11px] text-foreground-tertiary">Synced {formatDateTime(d.last_sync_at)}</p>
                        )}
                      </div>
                      {d.pending_count != null && d.pending_count > 0 && (
                        <span className="text-[11px] text-amber-600 font-medium shrink-0">{d.pending_count} pending</span>
                      )}
                    </div>
                  ))}
                  <Link href="/data-collection/sync" className="block text-center text-[12px] text-primary pt-2 hover:underline">
                    Full sync monitor →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collection summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Collection Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total Submissions', value: submissions.length, color: 'text-foreground' },
                { label: 'Approved', value: approvedSubmissions.length, color: 'text-success' },
                { label: 'Pending Review', value: pendingSubmissions.length, color: 'text-amber-600' },
                { label: 'Flagged', value: flaggedSubmissions.length, color: flaggedSubmissions.length > 0 ? 'text-error' : 'text-foreground-tertiary' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] text-foreground-tertiary">{label}</span>
                  <span className={cn('text-[14px] font-semibold tabular-nums', color)}>{value}</span>
                </div>
              ))}

              {submissions.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] text-foreground-tertiary">Approval rate</span>
                    <span className="text-[12px] font-semibold">
                      {submissions.length > 0 ? Math.round((approvedSubmissions.length / submissions.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${submissions.length > 0 ? (approvedSubmissions.length / submissions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <Link href={`/submissions?study_id=${studyId}`}>
                <Button size="sm" variant="outline" className="w-full h-8 text-[12px] mt-2">
                  View All Submissions
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Create Assignment', href: `/assignments/new?study_id=${studyId}`, icon: '📋' },
                { label: 'View Enumerators', href: '/data-collection/enumerators', icon: '👥' },
                { label: 'Sync Monitor', href: '/data-collection/sync', icon: '🔄' },
                { label: 'All Submissions', href: `/submissions?study_id=${studyId}`, icon: '📊' },
              ].map(({ label, href, icon }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" className="w-full justify-start h-8 text-[13px] gap-2">
                    <span>{icon}</span> {label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
