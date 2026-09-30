'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import type { ReviewSegmentPatch } from '@/types/review';

/* ── Enumerator ───────────────────────────────────────────────────── */

export function useFieldTranscripts() {
  return useQuery({
    queryKey: ['field-transcripts', 'list'],
    queryFn: async () => (await API.fieldTranscripts.list()).data.data,
    refetchOnWindowFocus: true,
  });
}

export function useFieldTranscript(id: string) {
  return useQuery({
    queryKey: ['field-transcripts', 'detail', id],
    queryFn: async () => (await API.fieldTranscripts.get(id)).data.data,
    enabled: !!id,
  });
}

/** A short-lived link to the recording; fetched on demand, refreshed when it lapses. */
export function useFieldAudio(id: string) {
  return useQuery({
    queryKey: ['field-transcripts', 'audio', id],
    queryFn: async () => (await API.fieldTranscripts.audio(id)).data.data,
    enabled: !!id,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useFieldEditSegment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ segmentId, patch }: { segmentId: string; patch: ReviewSegmentPatch }) =>
      (await API.fieldTranscripts.editSegment(id, segmentId, patch)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['field-transcripts'] }),
    onError: (err) => toast.error(describeError(err, 'Your change was not saved')),
  });
}

export function useFieldRenameSpeaker(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => (await API.fieldTranscripts.renameSpeaker(id, from, to)).data.data,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['field-transcripts'] });
      toast.success(`Renamed in ${r.renamed} passage${r.renamed === 1 ? '' : 's'}`);
    },
    onError: (err) => toast.error(describeError(err, 'The speaker could not be renamed')),
  });
}

export function useFieldSubmitReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) => (await API.fieldTranscripts.submit(id, note)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['field-transcripts'] });
      toast.success('Submitted for admin review');
    },
    onError: (err) => toast.error(describeError(err, 'The transcript could not be submitted')),
  });
}

/* ── Administrator ────────────────────────────────────────────────── */

export function useReviewSummary(projectId?: string) {
  return useQuery({
    queryKey: ['transcripts', 'review-summary', projectId ?? null],
    queryFn: async () => (await API.transcripts.reviewSummary(projectId)).data.data,
  });
}

export function useAdminReview(id: string) {
  return useQuery({
    queryKey: ['transcripts', 'review', id],
    queryFn: async () => (await API.transcripts.review(id)).data.data,
    enabled: !!id,
  });
}

export function useRevisionComparison(id: string, from: number | undefined, to: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['transcripts', 'compare', id, from, to],
    queryFn: async () => (await API.transcripts.compare(id, from, to)).data.data,
    enabled: enabled && !!id,
  });
}

function useAdminAction<TVars>(
  id: string,
  fn: (vars: TVars) => Promise<unknown>,
  opts: { success: string; failure: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transcripts'] });
      toast.success(opts.success);
    },
    onError: (err) => toast.error(describeError(err, opts.failure)),
  });
}

export function useAdminEditSegment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ segmentId, patch }: { segmentId: string; patch: ReviewSegmentPatch }) =>
      (await API.transcripts.reviewEdit(id, segmentId, patch)).data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transcripts'] }),
    onError: (err) => toast.error(describeError(err, 'Your change was not saved')),
  });
}

export const useApproveTranscript = (id: string) =>
  useAdminAction(
    id,
    (data: { note?: string; acknowledgeFlags?: boolean; skipEnumeratorReview?: boolean }) => API.transcripts.approve(id, data),
    { success: 'Transcript approved. It can now be used for analysis and reports.', failure: 'The transcript could not be approved' },
  );

export const useReturnTranscript = (id: string) =>
  useAdminAction(id, (note: string) => API.transcripts.returnForCorrection(id, note), {
    success: 'Returned to the enumerator with your feedback',
    failure: 'The transcript could not be returned',
  });

export const useReopenTranscript = (id: string) =>
  useAdminAction(id, (note: string) => API.transcripts.reopen(id, note), {
    success: 'Reopened for correction. It is no longer used for analysis until approved again.',
    failure: 'The transcript could not be reopened',
  });

export const useLockTranscript = (id: string) =>
  useAdminAction<void>(id, () => API.transcripts.lock(id), {
    success: 'Transcript locked',
    failure: 'The transcript could not be locked',
  });
