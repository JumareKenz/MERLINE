'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { isIndexedDbAvailable, loadSnapshot, saveSnapshot } from '@/lib/field/idb';
import type { CachedInterview } from '@/lib/field/types';
import type { Interview } from '@/types/interview';
import { useAuthStore } from '@/stores/auth-store';

function toCached(i: Interview): CachedInterview {
  return {
    id: i.id,
    status: i.status,
    scheduledAt: i.scheduledAt,
    location: i.location,
    notes: i.notes,
    participantId: i.participantId,
    participantName: i.participant?.displayName,
    projectId: i.projectId,
    consent: i.consent
      ? {
          id: i.consent.id,
          method: i.consent.method,
          allowRecording: i.consent.allowRecording,
          withdrawnAt: i.consent.withdrawnAt,
          expiresAt: i.consent.expiresAt,
        }
      : null,
    recordingCount: i._count?.recordings,
  };
}

/** True when consent on file (as last seen) permits recording right now. */
export function consentPermitsRecording(consent: CachedInterview['consent']): boolean {
  if (!consent?.allowRecording) return false;
  if (consent.withdrawnAt) return false;
  if (consent.expiresAt && Date.parse(consent.expiresAt) < Date.now()) return false;
  return true;
}

/**
 * The signed-in field worker's interviews. The API already scopes the list
 * to them; every successful load is also saved on the device so the app
 * still knows today's work — and whether consent permits recording — with
 * no connection. Cached data is always labelled as such in the UI, with the
 * time it was saved: it is never presented as live.
 */
export function useFieldInterviews() {
  const userId = useAuthStore((s) => s.user?.id);
  const [cached, setCached] = useState<{ items: CachedInterview[]; savedAt: string } | null>(null);

  const query = useQuery({
    queryKey: ['field', 'interviews', userId],
    queryFn: async () => (await API.interviews.list()).data.data,
    enabled: !!userId,
    retry: 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId || !isIndexedDbAvailable()) return;
    loadSnapshot(userId)
      .then((s) => s && setCached({ items: s.items, savedAt: s.savedAt }))
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    if (!userId || !query.data || !isIndexedDbAvailable()) return;
    const snapshot = { userId, savedAt: new Date().toISOString(), items: query.data.map(toCached) };
    saveSnapshot(snapshot)
      .then(() => setCached({ items: snapshot.items, savedAt: snapshot.savedAt }))
      .catch(() => undefined);
  }, [query.data, userId]);

  const live = query.data ? query.data.map(toCached) : null;

  return {
    interviews: live ?? cached?.items ?? [],
    source: live ? ('live' as const) : cached ? ('cached' as const) : ('none' as const),
    savedAt: cached?.savedAt ?? null,
    isLoading: query.isLoading && !cached,
    isError: query.isError && !cached,
    error: query.error as { message?: string } | null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
