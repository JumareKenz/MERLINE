import type { Prisma, TranscriptReviewStatus } from '@prisma/client';

/**
 * The human-review lifecycle of a transcript (Transcript.reviewStatus).
 * Machine processing (Transcript.status) is separate; a transcript reaches
 * AVAILABLE_FOR_REVIEW only once processing has completed.
 *
 *   RECORDING_SUBMITTED → TRANSCRIPTION_PROCESSING → AVAILABLE_FOR_REVIEW
 *     → ENUMERATOR_EDITING → SUBMITTED_FOR_ADMIN_REVIEW ─┬→ APPROVED → LOCKED
 *                                                        └→ RETURNED_FOR_CORRECTION
 *                                                             → ENUMERATOR_EDITING …
 *
 * Only APPROVED and LOCKED transcripts are evidence: insights, findings,
 * cross-project analysis and reports read nothing else.
 */
export const REVIEW_STATUS_LABELS: Record<TranscriptReviewStatus, string> = {
  RECORDING_SUBMITTED: 'Recording submitted',
  TRANSCRIPTION_PROCESSING: 'Transcription processing',
  AVAILABLE_FOR_REVIEW: 'Available for enumerator review',
  ENUMERATOR_EDITING: 'Enumerator editing',
  SUBMITTED_FOR_ADMIN_REVIEW: 'Submitted for admin review',
  RETURNED_FOR_CORRECTION: 'Returned for correction',
  APPROVED: 'Approved',
  LOCKED: 'Locked',
};

/** What an enumerator may edit. */
export const ENUMERATOR_EDITABLE: readonly TranscriptReviewStatus[] = [
  'AVAILABLE_FOR_REVIEW',
  'ENUMERATOR_EDITING',
  'RETURNED_FOR_CORRECTION',
];

/** What an administrator may edit directly (the rest belongs to the enumerator, or is final). */
export const ADMIN_EDITABLE: readonly TranscriptReviewStatus[] = [
  'AVAILABLE_FOR_REVIEW',
  'SUBMITTED_FOR_ADMIN_REVIEW',
];

/** States from which an enumerator can hand the transcript to the administrator. */
export const ENUMERATOR_SUBMITTABLE = ENUMERATOR_EDITABLE;

/** States an administrator can approve from (see approve() for the enumerator-skip rule). */
export const APPROVABLE: readonly TranscriptReviewStatus[] = [
  'SUBMITTED_FOR_ADMIN_REVIEW',
  'AVAILABLE_FOR_REVIEW',
  'ENUMERATOR_EDITING',
  'RETURNED_FOR_CORRECTION',
];

export const EVIDENCE_STATUSES: readonly TranscriptReviewStatus[] = [
  'APPROVED',
  'LOCKED',
];

export function isEvidence(status: TranscriptReviewStatus): boolean {
  return EVIDENCE_STATUSES.includes(status);
}

/**
 * The one place that says which transcripts may feed analysis. Every
 * query that reads transcript text for insights, findings, dialogue or
 * reports must include this (or check isEvidence) — see the evidence
 * gate spec, which fails if an analysis path stops using it.
 */
export const EVIDENCE_TRANSCRIPT_WHERE = {
  status: 'COMPLETED',
  reviewStatus: { in: [...EVIDENCE_STATUSES] },
} satisfies Prisma.TranscriptWhereInput;

export const NOT_EVIDENCE_MESSAGE =
  'This transcript has not been approved yet. Only an administrator-approved transcript can be used for analysis, findings or reports.';
