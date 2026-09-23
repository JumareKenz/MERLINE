'use client';

import { useMemo } from 'react';
import { useFieldInterviews } from '@/hooks/use-field-interviews';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import type { CachedInterview, LocalRecording, PendingInterview } from '@/lib/field/types';

export type WorkState = 'booked' | 'draft' | 'submitted' | 'cancelled';

export interface WorkItem {
  interview: CachedInterview;
  projectName?: string;
  state: WorkState;
  /** When it happened, for sorting and display. */
  date?: string | null;
  /** Recordings for this interview still on the phone (not yet confirmed by the server). */
  unsentRecordings: LocalRecording[];
  /** Started on the phone and not yet created on the server. */
  notSynced: boolean;
  /** The server refused it (interview or a recording); needs a person. */
  needsAttention: boolean;
  /** Anything about it is still only on this phone. */
  pending: boolean;
}

function fromPending(p: PendingInterview): CachedInterview {
  return {
    id: p.id,
    status: 'IN_PROGRESS',
    participantId: p.participantId,
    participantName: p.participant.displayName,
    projectId: p.projectId,
    location: p.location,
    createdAt: p.createdAt,
    startedAt: p.consent.capturedAt,
    consent: { id: p.consentId, method: p.consent.method, allowRecording: p.consent.allowRecording },
  };
}

/**
 * Everything the field worker has done or has to do, in one list: the
 * server's view of their interviews merged with what exists only on this
 * phone (interviews started offline, recordings not yet uploaded).
 *   booked     assigned in advance, not started
 *   draft      started, not yet submitted
 *   submitted  finished and submitted
 * `pending` flags anything still only on the phone.
 */
export function useFieldWork() {
  const base = useFieldInterviews();
  const { pending: pendingInterviews, recordings } = useFieldOutbox();

  const items = useMemo<WorkItem[]>(() => {
    const projectName = new Map(base.projects.map((p) => [p.id, p.name]));
    const server = base.interviews;
    const localOnly = pendingInterviews.filter((p) => !server.some((i) => i.id === p.id)).map(fromPending);

    return [...localOnly, ...server]
      .map((interview) => {
        const pendingRow = pendingInterviews.find((p) => p.id === interview.id);
        const unsentRecordings = recordings.filter((r) => r.interviewId === interview.id && r.status !== 'uploaded');
        const notSynced = !!pendingRow && pendingRow.status !== 'synced';
        const needsAttention = pendingRow?.status === 'blocked' || unsentRecordings.some((r) => r.status === 'blocked');
        const state: WorkState =
          interview.status === 'COMPLETED'
            ? 'submitted'
            : interview.status === 'CANCELLED'
              ? 'cancelled'
              : interview.status === 'SCHEDULED' && unsentRecordings.length === 0
                ? 'booked'
                : 'draft';
        return {
          interview,
          projectName: (interview.projectId && projectName.get(interview.projectId)) || pendingRow?.projectName,
          state,
          date: interview.endedAt ?? interview.startedAt ?? interview.scheduledAt ?? interview.createdAt,
          unsentRecordings,
          notSynced,
          needsAttention,
          pending: notSynced || unsentRecordings.length > 0,
        };
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [base.interviews, base.projects, pendingInterviews, recordings]);

  return { ...base, items };
}
