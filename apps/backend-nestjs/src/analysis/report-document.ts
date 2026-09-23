/**
 * The rendering-neutral shape every report is stored in. The web view and
 * the Word, Excel and PDF exports all draw from this, so a report reads the
 * same everywhere. Quotations are always verbatim transcript text that was
 * checked against its segment; everything else in a section marked
 * `aiGenerated` is the model's writing and is labelled as such.
 */
export interface ReportQuote {
  /** Stable within the report, e.g. "Q-I2-3". */
  id: string;
  text: string;
  interviewId: string;
  transcriptId: string;
  segmentId: string;
  startMs: number;
  /** e.g. "Interview 2 · KII · Amina (P-014)". */
  source: string;
  speaker?: string | null;
}

export type ReportBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'quote'; quoteId: string; note?: string }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string }
  | { type: 'facts'; items: { label: string; value: string }[] };

export interface ReportSection {
  id: string;
  heading: string;
  /** True when the prose was written by the model (quotes never are). */
  aiGenerated: boolean;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  kind: 'Interview report' | 'Project report' | 'Research brief';
  title: string;
  subtitle?: string;
  /** Cover-page facts: project, dates, interview counts… */
  meta: { label: string; value: string }[];
  sections: ReportSection[];
  quotes: Record<string, ReportQuote>;
  disclosure: string;
  generatedAt: string;
}

export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export const AI_DISCLOSURE =
  'Sections marked "AI analysis" were written by an AI model from the interview transcripts and must be reviewed by a researcher before use. ' +
  "Quotations are verbatim transcript text, each checked word for word against the recording's transcript and shown with its timestamp. " +
  'Machine transcription of some languages (notably Hausa) is approximate unless it has been corrected.';

/** Every quote a document refers to, in order of first use. */
export function quotesInOrder(doc: ReportDocument): ReportQuote[] {
  const seen = new Set<string>();
  const out: ReportQuote[] = [];
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (
        block.type === 'quote' &&
        !seen.has(block.quoteId) &&
        doc.quotes[block.quoteId]
      ) {
        seen.add(block.quoteId);
        out.push(doc.quotes[block.quoteId]);
      }
    }
  }
  return out;
}
