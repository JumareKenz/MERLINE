export type TranscriptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranscriptSegment {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  speakerLabel?: string | null;
  text: string;
  transcriptId: string;
  organizationId: string;
  createdAt: string;
}

export interface Transcript {
  id: string;
  status: TranscriptStatus;
  provider?: string | null;
  language?: string | null;
  errorMessage?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  organizationId: string;
  interviewId: string;
  mediaId: string;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  segments?: TranscriptSegment[];
}

export type TranscriptList = Transcript[];

/** GET /transcripts (no interviewId): organization-wide list with context. */
export interface TranscriptSummary extends Transcript {
  interview?: {
    id: string;
    projectId?: string | null;
    participant?: { id: string; displayName: string };
  };
  _count?: { segments: number };
}

export type TranscriptSummaryList = TranscriptSummary[];

/** POST /transcripts/:id/ask — a grounded, verified answer. */
export interface DialogueCitation {
  segmentId: string;
  segmentIndex: number;
  excerpt: string;
  speakerLabel?: string | null;
  startMs: number;
  endMs: number;
}

export interface DialogueAnswer {
  transcriptId: string;
  question: string;
  answer: string;
  insufficientEvidence: boolean;
  citations: DialogueCitation[];
  provider: string;
  model: string;
  promptVersion: string;
}
