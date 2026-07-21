'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignmentTable } from '@/components/assignments/assignment-table';
import { SubmissionTable } from '@/components/submissions/submission-table';
import { EnumeratorPerformance } from './enumerator-performance';
import { SyncMonitor } from './sync-monitor';
import type { Assignment } from '@/types/assignment';
import type { Submission } from '@/types/submission';
import type { SyncStatusData } from '@/types/media';

interface DataCollectionOverviewProps {
  assignments?: Assignment[];
  submissions?: Submission[];
  syncDevices?: SyncStatusData[];
  assignmentsLoading?: boolean;
  submissionsLoading?: boolean;
  syncLoading?: boolean;
  assignmentsError?: Error | null;
  submissionsError?: Error | null;
  syncError?: Error | null;
  onRetryAssignments?: () => void;
  onRetrySubmissions?: () => void;
  onRetrySync?: () => void;
}

export function DataCollectionOverview({
  assignments = [],
  submissions = [],
  syncDevices = [],
  assignmentsLoading,
  submissionsLoading,
  syncLoading,
  assignmentsError,
  submissionsError,
  syncError,
  onRetryAssignments,
  onRetrySubmissions,
  onRetrySync,
}: DataCollectionOverviewProps) {
  return (
    <Tabs defaultValue="assignments">
      <TabsList>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="submissions">Submissions</TabsTrigger>
        <TabsTrigger value="enumerators">Enumerators</TabsTrigger>
        <TabsTrigger value="sync">Sync</TabsTrigger>
      </TabsList>
      <TabsContent value="assignments" className="pt-4">
        <AssignmentTable
          data={assignments}
          isLoading={assignmentsLoading}
          isError={!!assignmentsError}
          error={assignmentsError}
          onRetry={onRetryAssignments}
        />
      </TabsContent>
      <TabsContent value="submissions" className="pt-4">
        <SubmissionTable
          data={submissions}
          isLoading={submissionsLoading}
          isError={!!submissionsError}
          error={submissionsError}
          onRetry={onRetrySubmissions}
        />
      </TabsContent>
      <TabsContent value="enumerators" className="pt-4">
        <EnumeratorPerformance />
        <div className="mt-4">
          <SubmissionTable
            data={submissions}
            isLoading={submissionsLoading}
            isError={!!submissionsError}
            error={submissionsError}
            onRetry={onRetrySubmissions}
          />
        </div>
      </TabsContent>
      <TabsContent value="sync" className="pt-4">
        <SyncMonitor
          devices={syncDevices}
          isLoading={syncLoading}
          isError={!!syncError}
          error={syncError}
          onRetry={onRetrySync}
        />
      </TabsContent>
    </Tabs>
  );
}
