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
