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
  /** Interview type key (KII, FGD, …) of the interview this came from. */
  interviewType?: string | null;
  location?: string | null;
  /** The approved transcript revision the wording was checked against. */
  revisionId?: string | null;
}

/** The approved transcript a report was written from, for traceability. */
export interface ReportSourceRef {
  /** The reference used in the text: "I3", or "Interview" for a single-interview report. */
  ref: string;
  label: string;
  interviewId: string;
  transcriptId: string;
  revisionId: string | null;
  interviewType: string | null;
  location: string | null;
  language: string | null;
}

/**
 * What kind of statement a section (or paragraph) is. Quotations are
 * always direct participant words; everything else is the analyst's or the
 * model's own writing and is labelled so a reader never mistakes an
 * interpretation for something a participant said.
 */
export type ClaimType =
  | 'summary'
  | 'interpretation'
  | 'theme'
  | 'recommendation'
  | 'evidence'
  | 'limitation';

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
  /** True when the prose was written by the model (quotes never are). */
  aiGenerated: boolean;
  claimType?: ClaimType;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  kind:
    | 'Interview report'
    | 'Project report'
    | 'Research brief'
    | 'Interview transcript';
  title: string;
  subtitle?: string;
  /** Cover-page facts: project, dates, interview counts… */
  meta: { label: string; value: string }[];
  sections: ReportSection[];
  quotes: Record<string, ReportQuote>;
  /** The approved transcripts (and revisions) the report drew on. Absent on older reports. */
  sources?: ReportSourceRef[];
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
  'This report uses only transcripts that were reviewed by the enumerator and approved by an administrator. ' +
  "Quotations are the participants' own words, checked word for word against the approved transcript and shown with interview, speaker and timestamp. " +
  'Sections marked "AI analysis" were written by an AI model: summaries restate what participants said, interpretations and themes are the analysis\' own reading, and recommendations are proposals. All of them must be reviewed by a researcher before use. ' +
  'How many interviews mention something shows how widely it was raised, not that it is true or validated.';

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
