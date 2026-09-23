export type TranscriptStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranscriptSegment {
  id: string;
  index: number;
  startMs: number;
  endMs: number;
  speakerLabel?: string | null;
  /** The machine transcript; never overwritten. */
  text: string;
  /** 0–1 from the model. Low values are worth checking by ear. */
  confidence?: number | null;
  /** A human correction, shown in place of `text` when present. */
  editedText?: string | null;
  editedAt?: string | null;
  editedBy?: { id: string; firstName: string; lastName: string } | null;
  translatedText?: string | null;
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
  /** The language hint it was transcribed with, if any. */
  requestedLanguage?: string | null;
  model?: string | null;
  text?: string | null;
  durationMs?: number | null;
  processingMs?: number | null;
  attempts?: number;
  /** When set on a PENDING transcript, an automatic retry is scheduled. */
  nextAttemptAt?: string | null;
  translationLanguage?: string | null;
  translationStatus?: TranscriptStatus | null;
  translationModel?: string | null;
  translationError?: string | null;
  translatedAt?: string | null;
  organizationId: string;
  interviewId: string;
  mediaId: string;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  segments?: TranscriptSegment[];
  /** GET /transcripts/:id only. */
  media?: { id: string; originalName: string; mimeType: string; size: number; metadata?: { durationMs?: number } | null };
  interview?: {
    id: string;
    projectId?: string | null;
    language?: string | null;
    participant?: { id: string; displayName: string };
    consent?: { allowAiAnalysis: boolean; allowQuotation: boolean; withdrawnAt?: string | null };
  };
  _count?: { segments: number };
}

/** The text to read and quote: the correction when there is one. */
export function segmentText(segment: Pick<TranscriptSegment, 'text' | 'editedText'>): string {
  return segment.editedText ?? segment.text;
}

export type TranscriptList = Transcript[];

/** GET /transcripts (no interviewId): organization-wide list with context. */
export type TranscriptSummary = Transcript;

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
