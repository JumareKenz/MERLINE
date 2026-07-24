'use client';

import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useStudy, useTransitionStudy, useUpdateStudy, useStudyAllowedTransitions } from '@/hooks/use-studies';
import { useAssignments } from '@/hooks/use-assignments';
import { useSubmissions } from '@/hooks/use-submissions';
import { useSyncStatus } from '@/hooks/use-sync';
import { useIndicators } from '@/hooks/use-indicators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { Calendar, ClipboardList, BarChart3, FileText, ArrowRight, Plus, Trash2, Library, Loader2, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { StudyDashboard } from '@/components/dashboard/study-dashboard';
import { useReports } from '@/hooks/use-reports';
import { ReportTable } from '@/components/reports/report-table';
import { DataCollectionOverview } from '@/components/data-collection/data-collection-overview';
import { TheoryOfChangeBuilder } from '@/components/studies/theory-of-change-builder';
import { useState, useEffect } from 'react';

export default function StudyDetailPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = searchParams.get('tab') || 'overview';
  const { data, isLoading, isError, error, refetch } = useStudy(studyId);
  const { data: allowedTransitionsData } = useStudyAllowedTransitions(studyId);
  const transitionMutation = useTransitionStudy();
  const updateStudyMutation = useUpdateStudy();
  const { data: indicatorsData } = useIndicators({ study_id: studyId });
  const { data: reportsData, isLoading: reportsLoading, isError: reportsIsError, error: reportsError, refetch: refetchReports } = useReports({ study_id: studyId });
  const { data: assignmentsData, isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = useAssignments({ study_id: studyId });
  const { data: submissionsData, isLoading: submissionsLoading, error: submissionsError, refetch: refetchSubmissions } = useSubmissions({ study_id: studyId });
  const { data: syncData, isLoading: syncLoading, error: syncError, refetch: refetchSync } = useSyncStatus();

  const study = data?.data?.data;
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsType, setSettingsType] = useState('');
  const [settingsLocked, setSettingsLocked] = useState(false);

  useEffect(() => {
    if (study) {
      setSettingsTitle(study.title);
      setSettingsType(study.study_type || study.type || '');
      setSettingsLocked(false);
    }
  }, [study?.id]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-96" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  if (!study) return <ErrorState message="Study not found" />;

  const allowedTransitions = allowedTransitionsData ?? [];
  const indicators = indicatorsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StatusBadge status={study.status} />
            <span className="text-sm text-foreground-secondary font-mono">{study.code}</span>
            {study.project && (
              <Link href={`/projects/${study.project.id}`} className="text-sm text-foreground-link hover:underline">
                {study.project.name}
              </Link>
            )}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{study.title}</h1>
          {study.purpose && (
            <p className="text-[13px] text-foreground-tertiary mt-1 max-w-2xl">{study.purpose}</p>
          )}
        </div>
        <Link href={`/studies/${studyId}/design`} className="shrink-0">
          <Button size="sm" className="h-8 px-3 text-[13px]">
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            Design Workspace
          </Button>
        </Link>
      </div>

      {allowedTransitions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {allowedTransitions.map((transition) => (
            <Button
              key={transition}
              size="sm"
              variant="secondary"
              disabled={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  id: studyId,
                  data: { status: transition as any },
                })
              }
            >
              {transitionMutation.isPending && transitionMutation.variables?.data?.status === transition ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
              )}
              {transition.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{study.questionnaire_count || 0}</p>
              <p className="text-xs text-foreground-tertiary">Questionnaires</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{study.indicator_count || 0}</p>
              <p className="text-xs text-foreground-tertiary">Indicators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{study.submission_count || 0}</p>
              <p className="text-xs text-foreground-tertiary">Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{formatDate(study.start_date || '')} - {formatDate(study.end_date || '')}</p>
              <p className="text-xs text-foreground-secondary">Timeline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="design">Theory of Change</TabsTrigger>
          <TabsTrigger value="indicators">Indicators</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaires</TabsTrigger>
          <TabsTrigger value="data-collection">Data Collection</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Study Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-foreground-secondary">Type</p>
                  <p className="font-medium capitalize">{study.study_type?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Methodology</p>
                  <p className="font-medium capitalize">{study.methodology?.replace(/_/g, ' ') || '—'}</p>
                </div>
                {study.population && (
                  <div>
                    <p className="text-sm text-foreground-secondary">Population</p>
                    <p className="font-medium">{study.population}</p>
                  </div>
                )}
                {study.sample_size && (
                  <div>
                    <p className="text-sm text-foreground-secondary">Sample Size</p>
                    <p className="font-medium">{study.sample_size.toLocaleString()}</p>
                  </div>
                )}
                {study.location && (
                  <div>
                    <p className="text-sm text-foreground-secondary">Location</p>
                    <p className="font-medium">{study.location}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm">Completion</p>
                      <span className="text-sm font-medium">{study.completion_percentage || 0}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(study.completion_percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-neutral-50 dark:bg-neutral-100/10 p-2">
                      <p className="text-base font-semibold">{study.indicator_count || 0}</p>
                      <p className="text-xs text-foreground-tertiary">Indicators</p>
                    </div>
                    <div className="rounded-md bg-neutral-50 dark:bg-neutral-100/10 p-2">
                      <p className="text-base font-semibold">{study.questionnaire_count || 0}</p>
                      <p className="text-xs text-foreground-tertiary">Forms</p>
                    </div>
                    <div className="rounded-md bg-neutral-50 dark:bg-neutral-100/10 p-2">
                      <p className="text-base font-semibold">{study.submission_count || 0}</p>
                      <p className="text-xs text-foreground-tertiary">Submissions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="design" className="pt-4">
          <Card>
            <CardContent className="p-6">
              <TheoryOfChangeBuilder studyId={studyId} studyDesign={study.studyDesign} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicators" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Study Indicators</CardTitle>
                <div className="flex gap-2">
                  <Link href={`/indicators/new?study_id=${studyId}`}>
                    <Button size="sm" variant="secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      New Indicator
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline">
                    <Library className="h-4 w-4 mr-2" />
                    Link from Library
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {indicators.length === 0 ? (
                <p className="text-sm text-foreground-secondary py-8 text-center">
                  No indicators yet. Create a new indicator or link one from the library.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {indicators.map((indicator: any) => (
                    <div key={indicator.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm">{indicator.name}</p>
                        <p className="text-xs text-foreground-secondary">{indicator.type} {indicator.unit ? `(${indicator.unit})` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums font-medium">{indicator.baseline ?? '—'} / {indicator.target ?? '—'}</span>
                        <Button variant="ghost" size="xs"><Trash2 className="h-3.5 w-3.5 text-foreground-tertiary" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questionnaires" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Questionnaires</CardTitle>
                <Link href={`/questionnaires/new?study_id=${studyId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Questionnaire
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {(study.questionnaires || []).length === 0 ? (
                <p className="text-sm text-foreground-secondary py-8 text-center">
                  No questionnaires yet. Create one to begin designing data collection forms.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {(study.questionnaires || []).map((qnr: any) => (
                    <div key={qnr.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link href={`/questionnaires/${qnr.id}`} className="font-medium text-sm text-foreground-link hover:underline">{qnr.title}</Link>
                        <p className="text-xs text-foreground-secondary">{qnr.sections_count || 0} sections | v{qnr.version}</p>
                      </div>
                      <StatusBadge status={qnr.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-collection" className="pt-4">
          <DataCollectionOverview
            assignments={assignmentsData?.data?.data || []}
            submissions={submissionsData?.data?.data || []}
            syncDevices={syncData?.data?.data || []}
            assignmentsLoading={assignmentsLoading}
            submissionsLoading={submissionsLoading}
            syncLoading={syncLoading}
            assignmentsError={assignmentsError}
            submissionsError={submissionsError}
            syncError={syncError}
            onRetryAssignments={() => refetchAssignments()}
            onRetrySubmissions={() => refetchSubmissions()}
            onRetrySync={() => refetchSync()}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="pt-4">
          <StudyDashboard studyId={studyId} />
        </TabsContent>

        <TabsContent value="reports" className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Study Reports</h3>
              <Link href={`/reports/new?study=${studyId}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
            </div>
            <ReportTable
              data={reportsData?.data?.data || []}
              isLoading={reportsLoading}
              isError={reportsIsError}
              error={reportsError}
              onRetry={() => refetchReports()}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Study Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="study-title">Study Title</Label>
                  <Input id="study-title" defaultValue={study.title} onChange={(e) => setSettingsTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study-code">Study Code</Label>
                  <Input id="study-code" defaultValue={study.code || ''} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="study-type">Study Type</Label>
                  <Select defaultValue={study.type || study.study_type} onValueChange={setSettingsType}>
                    <SelectTrigger id="study-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASELINE">Baseline</SelectItem>
                      <SelectItem value="ENDLINE">Endline</SelectItem>
                      <SelectItem value="MIDLINE">Midline</SelectItem>
                      <SelectItem value="KAP">KAP</SelectItem>
                      <SelectItem value="QUALITATIVE">Qualitative</SelectItem>
                      <SelectItem value="CASE_STUDY">Case Study</SelectItem>
                      <SelectItem value="MIXED_METHODS">Mixed Methods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study-status">Status</Label>
                  <Input id="study-status" value={study.status || 'DRAFT'} disabled className="bg-muted" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Lock Study</Label>
                  <p className="text-sm text-foreground-secondary">Prevent further modifications</p>
                </div>
                <Switch checked={settingsLocked} onCheckedChange={setSettingsLocked} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSettingsTitle(study.title);
                    setSettingsType(study.study_type || study.type || '');
                    setSettingsLocked(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={updateStudyMutation.isPending}
                  onClick={() =>
                    updateStudyMutation.mutate({
                      id: studyId,
                      data: { title: settingsTitle, study_type: settingsType as any },
                    })
                  }
                >
                  {updateStudyMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
