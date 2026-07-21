'use client';

import { useParams } from 'next/navigation';
import { useProject, useProjectStudies } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Calendar, FolderKanban, Users, BarChart3 } from 'lucide-react';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData, isLoading, isError, error, refetch } = useProject(projectId);
  const { data: studiesData } = useProjectStudies(projectId);

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

  const project = projectData?.data?.data;
  if (!project) return <ErrorState message="Project not found" />;

  const studies = studiesData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <StatusBadge status={project.status} />
          <span className="text-sm text-foreground-secondary font-mono">{project.code}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
        {project.description && (
          <p className="text-foreground-secondary mt-2 max-w-2xl">{project.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{studies.length}</p>
              <p className="text-xs text-foreground-secondary">Studies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{project.study_count || 0}</p>
              <p className="text-xs text-foreground-secondary">Indicators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-foreground-secondary">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{formatDate(project.start_date)} - {formatDate(project.end_date)}</p>
              <p className="text-xs text-foreground-secondary">Project Timeline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="studies">Studies</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          {project.donor && (
            <Card>
              <CardHeader>
                <CardTitle>Project Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {project.donor && <div><p className="text-sm text-foreground-secondary">Donor</p><p className="font-medium">{project.donor}</p></div>}
                  {project.grant_ref && <div><p className="text-sm text-foreground-secondary">Grant Ref</p><p className="font-medium">{project.grant_ref}</p></div>}
                  {project.country && <div><p className="text-sm text-foreground-secondary">Country</p><p className="font-medium">{project.country}</p></div>}
                  {project.sector && <div><p className="text-sm text-foreground-secondary">Sector</p><p className="font-medium">{project.sector}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}
          {studies.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Studies ({studies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {studies.map((study) => (
                    <div key={study.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{study.title}</p>
                        <p className="text-xs text-foreground-secondary">{study.study_type} · {study.methodology}</p>
                      </div>
                      <StatusBadge status={study.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground-secondary">Project settings will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
