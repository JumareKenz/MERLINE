'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useProject, useProjectStudies, useProjectStats, useUpdateProject } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { Calendar, FolderKanban, Users, BarChart3, Plus, Loader2, FlaskConical, Network } from 'lucide-react';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData, isLoading, isError, error, refetch } = useProject(projectId);
  const { data: studiesData } = useProjectStudies(projectId);
  const { data: statsData } = useProjectStats(projectId);
  const updateProject = useUpdateProject();

  const project = projectData?.data?.data;
  const studies = studiesData?.data?.data || [];
  const stats = statsData?.data?.data;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setStatus(project.status);
    }
  }, [project?.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  if (!project) return <ErrorState message="Project not found" />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StatusBadge status={project.status} />
            <span className="text-[13px] text-foreground-secondary font-mono">{project.code}</span>
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-[13px] text-foreground-tertiary mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/projects/${projectId}/logframe`}>
            <Button size="sm" variant="outline" className="h-8 px-3 text-[13px]">
              <Network className="h-3.5 w-3.5 mr-1.5" />
              Logframe
            </Button>
          </Link>
          <Link href={`/studies/new?project_id=${projectId}`}>
            <Button size="sm" className="h-8 px-3 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Study
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xl font-semibold">{studies.length}</p>
              <p className="text-xs text-foreground-tertiary">Studies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xl font-semibold">{stats?.total_indicators ?? '—'}</p>
              <p className="text-xs text-foreground-tertiary">Indicators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xl font-semibold">{stats?.team_members ?? project.team_count ?? '—'}</p>
              <p className="text-xs text-foreground-tertiary">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-[15px] w-[15px] text-primary" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold">{formatDate(project.start_date)}</p>
              <p className="text-xs text-foreground-tertiary">to {formatDate(project.end_date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-medium">Overall Progress</p>
              <span className="text-[13px] font-semibold tabular-nums">{stats.completion_percentage ?? 0}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(stats.completion_percentage ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-6 mt-3 text-[12px] text-foreground-tertiary">
              <span>{stats.active_studies} active {stats.active_studies === 1 ? 'study' : 'studies'}</span>
              <span>{stats.total_questionnaires} questionnaires</span>
              <span>{stats.total_indicators} indicators</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="studies">Studies ({studies.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4 space-y-4">
          {(project.donor || project.grant_ref || project.country || project.sector) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Project Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {project.donor && (
                    <div>
                      <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">Donor</p>
                      <p className="text-[13px] font-medium">{project.donor}</p>
                    </div>
                  )}
                  {project.grant_ref && (
                    <div>
                      <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">Grant Reference</p>
                      <p className="text-[13px] font-medium">{project.grant_ref}</p>
                    </div>
                  )}
                  {project.country && (
                    <div>
                      <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">Country</p>
                      <p className="text-[13px] font-medium">{project.country}</p>
                    </div>
                  )}
                  {project.sector && (
                    <div>
                      <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">Sector</p>
                      <p className="text-[13px] font-medium">{project.sector}</p>
                    </div>
                  )}
                  {project.budget && (
                    <div>
                      <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">Budget</p>
                      <p className="text-[13px] font-medium">
                        {project.currency} {project.budget.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {studies.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Studies</CardTitle>
                  <Link href={`/studies/new?project_id=${projectId}`}>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px]">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {studies.slice(0, 5).map((study) => (
                    <Link
                      key={study.id}
                      href={`/studies/${study.id}`}
                      className="flex items-center justify-between py-2.5 hover:bg-background-hover -mx-5 px-5 transition-colors first:rounded-t-sm"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{study.title}</p>
                        <p className="text-[12px] text-foreground-tertiary">
                          {(study.study_type || study.type || '').replace(/_/g, ' ')}
                          {study.methodology ? ` · ${study.methodology.replace(/_/g, ' ')}` : ''}
                        </p>
                      </div>
                      <StatusBadge status={study.status} />
                    </Link>
                  ))}
                </div>
                {studies.length > 5 && (
                  <p className="text-[12px] text-foreground-tertiary mt-3">
                    +{studies.length - 5} more studies
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-10 text-center">
                <FlaskConical className="h-8 w-8 text-foreground-tertiary mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-medium mb-1">No studies yet</p>
                <p className="text-[12px] text-foreground-tertiary mb-4">
                  Create a baseline, endline, or other study to start designing your research.
                </p>
                <Link href={`/studies/new?project_id=${projectId}`}>
                  <Button size="sm" className="h-8 px-3 text-[13px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Study
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="studies" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">All Studies</CardTitle>
                <Link href={`/studies/new?project_id=${projectId}`}>
                  <Button size="sm" className="h-8 px-3 text-[13px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Study
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {studies.length === 0 ? (
                <p className="text-[13px] text-foreground-tertiary py-8 text-center">No studies in this project yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {studies.map((study) => (
                    <Link
                      key={study.id}
                      href={`/studies/${study.id}`}
                      className="flex items-center justify-between py-3 hover:bg-background-hover -mx-5 px-5 transition-colors"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{study.title}</p>
                        <p className="text-[12px] text-foreground-tertiary mt-0.5">
                          <span className="font-mono">{study.code}</span>
                          {study.study_type || study.type
                            ? ` · ${(study.study_type || study.type || '').replace(/_/g, ' ')}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-foreground-tertiary hidden sm:block">
                          {formatDate(study.start_date ?? '')}
                        </span>
                        <StatusBadge status={study.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Project Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-name" className="text-[13px]">Project Name</Label>
                  <Input
                    id="proj-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Project Code</Label>
                  <Input value={project.code} disabled className="h-8 text-[13px] bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc" className="text-[13px]">Description</Label>
                <Textarea
                  id="proj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-[13px] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-[13px] w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft" className="text-[13px]">Draft</SelectItem>
                    <SelectItem value="active" className="text-[13px]">Active</SelectItem>
                    <SelectItem value="completed" className="text-[13px]">Completed</SelectItem>
                    <SelectItem value="archived" className="text-[13px]">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[13px]"
                  onClick={() => {
                    setName(project.name);
                    setDescription(project.description ?? '');
                    setStatus(project.status);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-[13px]"
                  disabled={updateProject.isPending}
                  onClick={() =>
                    updateProject.mutate({
                      id: projectId,
                      data: { name, description, status: status as any },
                    })
                  }
                >
                  {updateProject.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
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
