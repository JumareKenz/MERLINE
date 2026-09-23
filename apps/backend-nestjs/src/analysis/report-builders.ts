import { locateExcerpt, segmentText } from '../transcripts/segment-text';
import {
  AI_DISCLOSURE,
  ReportBlock,
  ReportDocument,
  ReportQuote,
  ReportSection,
  formatTimestamp,
} from './report-document';

/* ------------------------------------------------------------------ */
/* Shared                                                             */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : [];
const arr = <T = Record<string, unknown>>(v: unknown): T[] =>
  Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : [];

let sectionSeq = 0;
function section(
  heading: string,
  aiGenerated: boolean,
  blocks: ReportBlock[],
): ReportSection {
  return {
    id: `s${++sectionSeq}`,
    heading,
    aiGenerated,
    blocks: blocks.filter(nonEmpty),
  };
}
function nonEmpty(b: ReportBlock): boolean {
  switch (b.type) {
    case 'paragraph':
    case 'callout':
      return !!b.text;
    case 'bullets':
    case 'numbered':
    case 'facts':
      return b.items.length > 0;
    case 'table':
      return b.rows.length > 0;
    default:
      return true;
  }
}
const paragraphs = (texts: string[]): ReportBlock[] =>
  texts.map((text) => ({ type: 'paragraph', text }));

/** Parses a model reply that should be one JSON object. */
export function parseModelJson(content: string): Record<string, unknown> {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const parsed: unknown = JSON.parse(stripped);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The model did not return a JSON object');
  }
  return parsed as Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Interview report                                                   */
/* ------------------------------------------------------------------ */

export interface InterviewReportSource {
  interviewId: string;
  transcriptId: string;
  /** e.g. "Interview 2 · KII · Amina" (used on every quotation). */
  sourceLabel: string;
  facts: { label: string; value: string }[];
  segments: {
    id: string;
    index: number;
    startMs: number;
    text: string;
    editedText?: string | null;
    speakerLabel?: string | null;
  }[];
  /** Automatic data-quality notes (language, corrections, confidence). */
  qualityNotes: string[];
  /** False when consent does not permit quotation: analysis without verbatim quotes. */
  allowQuotes: boolean;
}

/**
 * Turns the model's interview analysis into a report, keeping only
 * quotations found verbatim in their segment (stored in the transcript's
 * own wording, with timestamps). Returns how many were discarded.
 */
export function buildInterviewReport(
  payload: Record<string, unknown>,
  src: InterviewReportSource,
): { doc: ReportDocument; discarded: number } {
  const byIndex = new Map(src.segments.map((s) => [s.index, s]));
  const quotes: Record<string, ReportQuote> = {};
  const idByKey = new Map<string, string>();
  let discarded = 0;

  const quote = (q: Record<string, unknown>): string | null => {
    if (!src.allowQuotes) return null;
    const segment = byIndex.get(Number(q.segmentIndex));
    const text = segment
      ? locateExcerpt(segmentText(segment), str(q.excerpt))
      : null;
    if (!segment || !text) {
      discarded++;
      return null;
    }
    const key = `${segment.id}:${text}`;
    const existing = idByKey.get(key);
    if (existing) return existing;
    const id = `Q${idByKey.size + 1}`;
    idByKey.set(key, id);
    quotes[id] = {
      id,
      text,
      interviewId: src.interviewId,
      transcriptId: src.transcriptId,
      segmentId: segment.id,
      startMs: segment.startMs,
      source: src.sourceLabel,
      speaker: segment.speakerLabel ?? null,
    };
    return id;
  };

  const sections: ReportSection[] = [];
  sections.push(
    section('At a glance', false, [{ type: 'facts', items: src.facts }]),
  );
  sections.push(
    section(
      'Executive summary',
      true,
      paragraphs(strs(payload.executiveSummary)),
    ),
  );
  sections.push(
    section(
      'Respondent and context',
      true,
      paragraphs(strs(payload.respondentContext)),
    ),
  );

  arr(payload.keyThemes).forEach((t, i) => {
    const blocks: ReportBlock[] = [...paragraphs(strs(t.analysis))];
    for (const q of arr(t.quotes)) {
      const id = quote(q);
      if (id) blocks.push({ type: 'quote', quoteId: id });
    }
    sections.push(
      section(
        `Theme ${i + 1}: ${str(t.theme) || 'Untitled theme'}`,
        true,
        blocks,
      ),
    );
  });

  const notable: ReportBlock[] = [];
  for (const q of arr(payload.notableQuotes)) {
    const id = quote(q);
    if (id)
      notable.push({
        type: 'quote',
        quoteId: id,
        note: str(q.why) || undefined,
      });
  }
  sections.push(section('Notable quotations', false, notable));

  sections.push(
    section('Challenges and concerns', true, [
      { type: 'bullets', items: strs(payload.challenges) },
    ]),
  );
  sections.push(
    section('Opportunities and strengths', true, [
      { type: 'bullets', items: strs(payload.opportunities) },
    ]),
  );
  sections.push(
    section('Recommendations', true, [
      {
        type: 'table',
        columns: ['Recommendation', 'Basis in the interview'],
        rows: arr(payload.recommendations)
          .map((r) => [str(r.recommendation), str(r.basis)])
          .filter((r) => r[0]),
      },
    ]),
  );
  sections.push(
    section('Questions for follow-up', true, [
      { type: 'bullets', items: strs(payload.followUpQuestions) },
    ]),
  );
  sections.push(
    section('Data quality', false, [
      ...src.qualityNotes.map((text) => ({
        type: 'callout' as const,
        tone: 'warning' as const,
        text,
      })),
      { type: 'bullets', items: strs(payload.dataQualityNotes) },
      ...(src.allowQuotes
        ? []
        : [
            {
              type: 'callout' as const,
              tone: 'info' as const,
              text: 'The participant did not consent to being quoted, so this report contains no verbatim quotations.',
            },
          ]),
    ]),
  );

  const doc: ReportDocument = {
    kind: 'Interview report',
    title: str(payload.title) || 'Interview report',
    subtitle: src.sourceLabel,
    meta: src.facts,
    sections: sections.filter((s) => s.blocks.length > 0),
    quotes,
    disclosure: AI_DISCLOSURE,
    generatedAt: new Date().toISOString(),
  };
  return { doc, discarded };
}

/* ------------------------------------------------------------------ */
/* Project evidence (for the project report, briefs and questions)    */
/* ------------------------------------------------------------------ */

export interface ProjectEvidenceInterview {
  ref: string; // "I1"
  label: string;
  meta: string; // one line: type, date, location, language
  report: ReportDocument;
}

export interface ProjectEvidence {
  text: string;
  pool: Record<string, ReportQuote>;
}

/**
 * Compresses each interview report into the synthesis input, and pools
 * their verified quotations under project-wide ids ("Q-I2-3"). The model
 * may only cite from this pool, so project-level quotations are verbatim by
 * construction.
 */
export function buildProjectEvidence(
  interviews: ProjectEvidenceInterview[],
): ProjectEvidence {
  const pool: Record<string, ReportQuote> = {};
  const parts: string[] = [];
  for (const iv of interviews) {
    const lines = [`### ${iv.ref}: ${iv.label}`, iv.meta];
    const summary = iv.report.sections.find(
      (s) => s.heading === 'Executive summary',
    );
    if (summary) {
      lines.push(
        'Summary: ' +
          summary.blocks
            .map((b) => (b.type === 'paragraph' ? b.text : ''))
            .join(' '),
      );
    }
    for (const s of iv.report.sections.filter((x) =>
      x.heading.startsWith('Theme '),
    )) {
      const first = s.blocks.find((b) => b.type === 'paragraph');
      lines.push(
        `- ${s.heading.replace(/^Theme \d+: /, '')}: ${first && first.type === 'paragraph' ? first.text : ''}`,
      );
    }
    for (const s of iv.report.sections.filter(
      (x) =>
        x.heading === 'Challenges and concerns' ||
        x.heading === 'Recommendations',
    )) {
      for (const b of s.blocks) {
        if (b.type === 'bullets')
          lines.push(`${s.heading}: ${b.items.join('; ')}`);
        if (b.type === 'table')
          lines.push(`${s.heading}: ${b.rows.map((r) => r[0]).join('; ')}`);
      }
    }
    const quoteLines: string[] = [];
    let k = 0;
    for (const q of Object.values(iv.report.quotes)) {
      const id = `Q-${iv.ref}-${++k}`;
      pool[id] = { ...q, id, source: iv.label };
      quoteLines.push(`[${id}] (${formatTimestamp(q.startMs)}) "${q.text}"`);
    }
    if (quoteLines.length) lines.push('Quotations:', ...quoteLines);
    parts.push(lines.join('\n'));
  }
  return { text: parts.join('\n\n'), pool };
}

/** Keeps only pool ids; returns quote blocks for them. */
function poolQuotes(
  ids: unknown,
  pool: Record<string, ReportQuote>,
  used: Record<string, ReportQuote>,
): ReportBlock[] {
  const out: ReportBlock[] = [];
  for (const id of strs(ids)) {
    if (pool[id] && !out.some((b) => b.type === 'quote' && b.quoteId === id)) {
      used[id] = pool[id];
      out.push({ type: 'quote', quoteId: id });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Project report                                                     */
/* ------------------------------------------------------------------ */

export interface ProjectReportSource {
  projectName: string;
  facts: { label: string; value: string }[];
  methodology: string[];
  interviewTable: { columns: string[]; rows: string[][] };
  limitations: string[];
  interviewSummaries: { label: string; summary: string }[];
  refLabels: Record<string, string>;
}

export function buildProjectReport(
  payload: Record<string, unknown>,
  src: ProjectReportSource,
  pool: Record<string, ReportQuote>,
): ReportDocument {
  const used: Record<string, ReportQuote> = {};
  const sections: ReportSection[] = [];

  sections.push(
    section('At a glance', false, [{ type: 'facts', items: src.facts }]),
  );
  sections.push(
    section(
      'Executive summary',
      true,
      paragraphs(strs(payload.executiveSummary)),
    ),
  );
  sections.push(
    section('Methodology', false, [
      ...paragraphs(src.methodology),
      {
        type: 'table',
        columns: src.interviewTable.columns,
        rows: src.interviewTable.rows,
      },
    ]),
  );

  arr(payload.keyFindings).forEach((f, i) => {
    const refs = strs(f.interviews).filter((r) => src.refLabels[r]);
    sections.push(
      section(
        `Finding ${i + 1}: ${str(f.finding) || 'Untitled finding'}`,
        true,
        [
          ...(str(f.prevalence)
            ? [
                {
                  type: 'callout' as const,
                  tone: 'info' as const,
                  text: `Prevalence: ${str(f.prevalence)}`,
                },
              ]
            : []),
          ...paragraphs(strs(f.narrative)),
          ...poolQuotes(f.quoteIds, pool, used),
          ...(refs.length
            ? [
                {
                  type: 'paragraph' as const,
                  text: `Evidence from: ${refs.map((r) => `${r} (${src.refLabels[r]})`).join('; ')}.`,
                },
              ]
            : []),
        ],
      ),
    );
  });

  const themes = arr(payload.crossCuttingThemes);
  if (themes.length) {
    sections.push(
      section(
        'Cross-cutting themes',
        true,
        themes.flatMap((t) => [
          {
            type: 'paragraph' as const,
            text: `${str(t.theme)}. ${str(t.analysis)}`.trim(),
          },
        ]),
      ),
    );
  }
  sections.push(
    section('Divergent views', true, [
      {
        type: 'table',
        columns: ['Topic', 'How views differed'],
        rows: arr(payload.divergentViews)
          .map((d) => [str(d.topic), str(d.views)])
          .filter((r) => r[0]),
      },
    ]),
  );
  const order = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
  sections.push(
    section('Recommendations', true, [
      {
        type: 'table',
        columns: ['Priority', 'Recommendation', 'Rationale', 'For'],
        rows: arr(payload.recommendations)
          .map((r) => [
            str(r.priority) || 'Medium',
            str(r.recommendation),
            str(r.rationale),
            str(r.audience),
          ])
          .filter((r) => r[1])
          .sort((a, b) => (order[a[0]] ?? 1) - (order[b[0]] ?? 1)),
      },
    ]),
  );
  sections.push(
    section('Limitations', false, [
      {
        type: 'bullets',
        items: [...src.limitations, ...strs(payload.limitations)],
      },
    ]),
  );
  sections.push(
    section('Conclusion', true, paragraphs(strs(payload.conclusion))),
  );
  sections.push(
    section('Next steps', true, [
      { type: 'bullets', items: strs(payload.nextSteps) },
    ]),
  );
  sections.push(
    section(
      'Appendix: interview summaries',
      true,
      src.interviewSummaries.flatMap((s) => [
        { type: 'paragraph' as const, text: `${s.label}. ${s.summary}` },
      ]),
    ),
  );

  return {
    kind: 'Project report',
    title: str(payload.title) || `${src.projectName}: findings report`,
    subtitle: src.projectName,
    meta: src.facts,
    sections: sections.filter((s) => s.blocks.length > 0),
    quotes: used,
    disclosure: AI_DISCLOSURE,
    generatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Research brief (custom, from plain-language instructions)          */
/* ------------------------------------------------------------------ */

export function buildCustomReport(
  payload: Record<string, unknown>,
  projectName: string,
  facts: { label: string; value: string }[],
  pool: Record<string, ReportQuote>,
): ReportDocument {
  const used: Record<string, ReportQuote> = {};
  const sections = arr(payload.sections).map((s) => {
    const table =
      s.table && typeof s.table === 'object'
        ? (s.table as Record<string, unknown>)
        : null;
    const columns = table ? strs(table.columns) : [];
    const rows =
      table && Array.isArray(table.rows)
        ? (table.rows as unknown[]).map((r) => strs(r))
        : [];
    return section(str(s.heading) || 'Section', true, [
      ...paragraphs(strs(s.paragraphs)),
      { type: 'bullets', items: strs(s.bullets) },
      ...(columns.length
        ? [
            {
              type: 'table' as const,
              columns,
              rows: rows.filter((r) => r.length),
            },
          ]
        : []),
      // A brief stays readable: at most three quotations per section.
      ...poolQuotes(s.quoteIds, pool, used).slice(0, 3),
    ]);
  });
  return {
    kind: 'Research brief',
    title: str(payload.title) || `${projectName}: research brief`,
    subtitle: str(payload.subtitle) || projectName,
    meta: facts,
    sections: sections.filter((s) => s.blocks.length > 0),
    quotes: used,
    disclosure: AI_DISCLOSURE,
    generatedAt: new Date().toISOString(),
  };
}
