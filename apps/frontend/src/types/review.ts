export type ReviewStatus =
  | 'RECORDING_SUBMITTED'
  | 'TRANSCRIPTION_PROCESSING'
  | 'AVAILABLE_FOR_REVIEW'
  | 'ENUMERATOR_EDITING'
  | 'SUBMITTED_FOR_ADMIN_REVIEW'
  | 'RETURNED_FOR_CORRECTION'
  | 'APPROVED'
  | 'LOCKED';

/** Wording used everywhere a review status is shown. */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  RECORDING_SUBMITTED: 'Recording submitted',
  TRANSCRIPTION_PROCESSING: 'Transcription processing',
  AVAILABLE_FOR_REVIEW: 'Ready for enumerator review',
  ENUMERATOR_EDITING: 'Enumerator editing',
  SUBMITTED_FOR_ADMIN_REVIEW: 'Submitted for admin review',
  RETURNED_FOR_CORRECTION: 'Returned for correction',
  APPROVED: 'Approved',
  LOCKED: 'Locked',
};

/** What is expected of the enumerator next, if anything. */
export const NEEDS_ENUMERATOR: readonly ReviewStatus[] = ['AVAILABLE_FOR_REVIEW', 'ENUMERATOR_EDITING', 'RETURNED_FOR_CORRECTION'];

export function isEvidenceStatus(s: ReviewStatus): boolean {
  return s === 'APPROVED' || s === 'LOCKED';
}

/** One passage as a reviewer sees it: machine text and reviewed text side by side. */
export interface ReviewSegment {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  machineText: string;
  text: string;
  edited: boolean;
  machineSpeaker: string | null;
  speaker: string | null;
  /** 0–1 from the model; low values deserve a listen. */
  confidence: number | null;
  flagged: boolean;
  flagReason: string | null;
  note: string | null;
  editedById: string | null;
  editedAt: string | null;
}

export interface ReviewInterviewContext {
  id: string;
  type: string | null;
  typeMetadata?: Record<string, unknown> | null;
  language: string | null;
  location: string | null;
  enumeratorName: string | null;
  project: { id: string; name: string } | null;
  participant: { id: string; displayName: string };
}

export interface ReviewDetail {
  id: string;
  status: string;
  reviewStatus: ReviewStatus;
  reviewStatusLabel: string;
  reviewNote: string | null;
  language: string | null;
  provider: string | null;
  durationMs: number | null;
  approvedAt: string | null;
  approvedById: string | null;
  approvedRevisionId: string | null;
  reviewSubmittedAt: string | null;
  interview: ReviewInterviewContext;
  media: { id: string; originalName: string; mimeType: string; size: number };
  segments: ReviewSegment[];
}

/** GET /field/transcripts/:id. */
export interface FieldReviewDetail extends ReviewDetail {
  canEdit: boolean;
  history: { action: string; toStatus: ReviewStatus; note: string | null; at: string; by: string | null }[];
}

export interface ReviewEvent {
  id: string;
  action: string;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus;
  note: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
}

export type RevisionKind = 'MACHINE' | 'ENUMERATOR' | 'ADMIN' | 'APPROVED';

export interface RevisionSummary {
  id: string;
  number: number;
  kind: RevisionKind;
  note: string | null;
  createdAt: string;
  segmentCount: number;
  author: { id: string; firstName: string; lastName: string } | null;
}

export interface AdminReviewDetail extends ReviewDetail {
  events: ReviewEvent[];
  revisions: RevisionSummary[];
}

export interface SegmentSnapshot {
  index: number;
  startMs: number;
  endMs: number;
  speaker: string | null;
  text: string;
  confidence: number | null;
  flagged: boolean;
  flagReason: string | null;
  note: string | null;
}

export interface SegmentDiff {
  index: number;
  startMs: number;
  endMs: number;
  before: SegmentSnapshot | null;
  after: SegmentSnapshot | null;
  changed: ('text' | 'speaker' | 'flag' | 'note')[];
}

export interface RevisionComparison {
  from: { number: number; kind: RevisionKind; createdAt: string };
  to: { number: number; kind: RevisionKind; createdAt: string };
  changedSegments: number;
  diffs: SegmentDiff[];
}

/** GET /field/transcripts. */
export interface FieldReviewListItem {
  id: string;
  reviewStatus: ReviewStatus;
  reviewStatusLabel: string;
  reviewNote: string | null;
  language: string | null;
  durationMs: number | null;
  segmentCount: number;
  completedAt: string | null;
  updatedAt: string;
  interview: {
    id: string;
    type: string | null;
    startedAt: string | null;
    project: { id: string; name: string } | null;
    participant: { displayName: string };
  };
}

export interface ReviewSegmentPatch {
  text?: string | null;
  speakerLabel?: string | null;
  flagged?: boolean;
  flagReason?: string | null;
  note?: string | null;
}

export interface ReviewSummary {
  byStatus: Record<ReviewStatus, number>;
  byType: { type: string; total: number; approved: number }[];
}

/** Interview types of a project (GET /projects/:id/interview-types). */
export interface TypeField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  required?: boolean;
  options?: string[];
}

export interface InterviewTypeDef {
  key: string;
  label: string;
  description: string | null;
  fields: TypeField[];
  custom?: boolean;
}

export interface ProjectInterviewTypes {
  configured: boolean;
  types: InterviewTypeDef[];
}
