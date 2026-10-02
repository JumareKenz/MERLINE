/** Mirrors apps/backend-nestjs/src/analysis/report-document.ts. */
export interface ReportQuote {
  id: string;
  text: string;
  interviewId: string;
  transcriptId: string;
  segmentId: string;
  startMs: number;
  source: string;
  speaker?: string | null;
  interviewType?: string | null;
  location?: string | null;
  revisionId?: string | null;
}

/** An approved transcript (at its approved revision) a report was written from. */
export interface ReportSourceRef {
  ref: string;
  label: string;
  interviewId: string;
  transcriptId: string;
  revisionId: string | null;
  interviewType: string | null;
  location: string | null;
  language: string | null;
}

export type ClaimType = 'summary' | 'interpretation' | 'theme' | 'recommendation' | 'evidence' | 'limitation';

export type ReportBlock =
  | { type: 'paragraph'; text: string; label?: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'quote'; quoteId: string; note?: string }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string }
  | { type: 'facts'; items: { label: string; value: string }[] };

export interface ReportSection {
  id: string;
  heading: string;
  aiGenerated: boolean;
  claimType?: ClaimType;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  kind: 'Interview report' | 'Project report' | 'Research brief' | 'Interview transcript';
  title: string;
  subtitle?: string;
  meta: { label: string; value: string }[];
  sections: ReportSection[];
  quotes: Record<string, ReportQuote>;
  /** Approved transcripts the report drew on; absent on reports written before the review workflow. */
  sources?: ReportSourceRef[];
  disclosure: string;
  generatedAt: string;
}

export type ReportScope = 'INTERVIEW' | 'PROJECT' | 'CUSTOM';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ExportFormat = 'docx' | 'pdf' | 'xlsx';

export interface AnalysisReport {
  id: string;
  scope: ReportScope;
  status: ReportStatus;
  title: string;
  instructions?: string | null;
  language: string;
  content?: ReportDocument | null;
  model?: string | null;
  errorMessage?: string | null;
  sourceCount: number;
  projectId?: string | null;
  interviewId?: string | null;
  /** Set when the report covers one interview type only. */
  interviewType?: string | null;
  transcriptId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  requestedBy?: { firstName: string; lastName: string };
  project?: { id: string; name: string } | null;
  interview?: { id: string; participant: { displayName: string } } | null;
}

export type AnalysisReportList = AnalysisReport[];

export interface RequestReportInput {
  scope: ReportScope;
  interviewId?: string;
  projectId?: string;
  instructions?: string;
  /** Limit a project report to one interview type, e.g. FGD. */
  interviewType?: string;
  language?: string;
}

export interface ProjectAnswer {
  projectId: string;
  question: string;
  answer: string[];
  quotes: ReportQuote[];
  insufficientEvidence: boolean;
  coverage: { withReports: number; interviews: number };
}

export interface TrashItem {
  type: 'project' | 'interview' | 'recording' | 'participant' | 'finding' | 'report' | 'user' | 'guide' | 'link';
  id: string;
  name: string;
  context?: string | null;
  deletedAt: string;
}

export type TrashList = TrashItem[];

export const EXPORT_FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: 'pdf', label: 'PDF', hint: 'Print-ready, branded' },
  { value: 'docx', label: 'Word', hint: 'Editable document' },
  { value: 'xlsx', label: 'Excel', hint: 'Tables and quotations' },
];
