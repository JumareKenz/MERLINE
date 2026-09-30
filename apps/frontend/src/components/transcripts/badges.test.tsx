import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CodeBadge } from '@/components/enumerators/code-badge';
import { ReviewStatusBadge } from './review-status-badge';
import { tilesFor } from '@/components/dashboard/review-dashboard';
import { REVIEW_STATUS_LABELS, isEvidenceStatus, type ReviewStatus, type ReviewSummary } from '@/types/review';

describe('status badges say it in words, never colour alone', () => {
  it('shows every review status with its label', () => {
    for (const status of Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]) {
      expect(renderToStaticMarkup(<ReviewStatusBadge status={status} />)).toContain(REVIEW_STATUS_LABELS[status]);
    }
  });

  it('shows every access-code state, and marks shared codes', () => {
    for (const [state, label] of [['NONE', 'No code'], ['UNUSED', 'Not used yet'], ['ACTIVE', 'Active'], ['EXPIRED', 'Expired'], ['REVOKED', 'Revoked']] as const) {
      expect(renderToStaticMarkup(<CodeBadge state={state} />)).toContain(label);
    }
    expect(renderToStaticMarkup(<CodeBadge state="ACTIVE" legacy />)).toContain('Shared code');
  });

  it('renders nothing when a transcript has no review status yet', () => {
    expect(renderToStaticMarkup(<ReviewStatusBadge status={undefined} />)).toBe('');
  });
});

describe('the dashboard counts', () => {
  const zero = Object.fromEntries(Object.keys(REVIEW_STATUS_LABELS).map((k) => [k, 0])) as ReviewSummary['byStatus'];
  const summary = (over: Partial<ReviewSummary['byStatus']>): ReviewSummary => ({ byStatus: { ...zero, ...over }, byType: [] });

  it('groups statuses by whose turn it is', () => {
    const tiles = tilesFor(
      summary({ SUBMITTED_FOR_ADMIN_REVIEW: 3, AVAILABLE_FOR_REVIEW: 2, ENUMERATOR_EDITING: 1, RETURNED_FOR_CORRECTION: 4, RECORDING_SUBMITTED: 5, TRANSCRIPTION_PROCESSING: 1, APPROVED: 7, LOCKED: 2 }),
    );
    const v = Object.fromEntries(tiles.map((t) => [t.key, t.value]));
    expect(v).toEqual({ admin: 3, enumerators: 7, processing: 6, approved: 9 });
  });

  it('counts every transcript exactly once', () => {
    const all = Object.fromEntries(Object.keys(REVIEW_STATUS_LABELS).map((k) => [k, 1])) as ReviewSummary['byStatus'];
    const total = tilesFor({ byStatus: all, byType: [] }).reduce((n, t) => n + t.value, 0);
    expect(total).toBe(Object.keys(REVIEW_STATUS_LABELS).length);
  });

  it('counts as usable only what is approved', () => {
    expect(isEvidenceStatus('APPROVED')).toBe(true);
    expect(isEvidenceStatus('LOCKED')).toBe(true);
    for (const s of ['AVAILABLE_FOR_REVIEW', 'ENUMERATOR_EDITING', 'SUBMITTED_FOR_ADMIN_REVIEW', 'RETURNED_FOR_CORRECTION'] as const) expect(isEvidenceStatus(s)).toBe(false);
  });
});
