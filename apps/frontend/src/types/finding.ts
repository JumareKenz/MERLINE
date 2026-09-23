import type { TranscriptSegment } from './transcript';

export type FindingStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED' | 'PUBLISHED';
export type FindingSource = 'HUMAN' | 'AI';

export interface Quotation {
  id: string;
  excerpt: string;
  findingId: string;
  transcriptSegmentId: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  transcriptSegment?: TranscriptSegment;
}

export interface Finding {
  id: string;
  title: string;
  interpretation: string;
  theme?: string | null;
  status: FindingStatus;
  source: FindingSource;
  aiProvider?: string | null;
  aiModel?: string | null;
  aiPromptVersion?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  organizationId: string;
  projectId?: string | null;
  createdById: string;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  quotations?: Quotation[];
  _count?: { quotations: number };
}

export interface CreateFindingDto {
  title: string;
  interpretation: string;
  theme?: string;
  projectId?: string;
}

export interface AddQuotationDto {
  transcriptSegmentId: string;
  excerpt: string;
}

export type FindingList = Finding[];

/** POST /findings/ai-draft: one DRAFT finding per theme in the interview. */
export interface AiDraftResult {
  transcriptId: string;
  findings: (Finding & { quotationCount: number })[];
  /** Quotations the model produced that were not verbatim, so were not saved. */
  discardedQuotations: number;
}
