'use client';

import Link from 'next/link';
import { Mic, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useInterviews } from '@/hooks/use-interviews';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

export default function FieldHomePage() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useInterviews();

  const myInterviews = (data?.data?.data || []).filter((i) => i.interviewerId === user?.id);
  const active = myInterviews.filter((i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS');
  const done = myInterviews.filter((i) => i.status === 'COMPLETED' || i.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
          Hi{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">Your interviews and participants.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/field/interviews/new">
          <Button className="w-full h-12 text-[14px]" size="lg">
            <Mic className="h-4 w-4 mr-2" /> New Interview
          </Button>
        </Link>
        <Link href="/field/participants">
          <Button variant="outline" className="w-full h-12 text-[14px]" size="lg">
            <Users className="h-4 w-4 mr-2" /> Participants
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : active.length === 0 && done.length === 0 ? (
        <EmptyState
          title="No interviews yet"
          description="Add a participant, record their consent, then start an interview."
          action={
            <Link href="/field/participants/new">
              <Button size="sm" className="h-8 px-3 text-[13px]">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Participant
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-foreground-tertiary uppercase tracking-wide">In progress</p>
              {active.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/field/interviews/${interview.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-background-hover transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-medium">
                      {interview.scheduledAt ? formatDate(interview.scheduledAt) : 'Unscheduled'}
                    </p>
                    {interview.location && <p className="text-[12px] text-foreground-tertiary">{interview.location}</p>}
                  </div>
                  <StatusBadge status={interview.status} />
                </Link>
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-foreground-tertiary uppercase tracking-wide">Completed</p>
              {done.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/field/interviews/${interview.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-background-hover transition-colors opacity-70"
                >
                  <p className="text-[13px] font-medium">
                    {interview.scheduledAt ? formatDate(interview.scheduledAt) : formatDate(interview.createdAt)}
                  </p>
                  <StatusBadge status={interview.status} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
