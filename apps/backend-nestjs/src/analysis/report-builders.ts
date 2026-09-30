import { locateExcerpt, segmentText } from '../transcripts/segment-text';
import { spokenText } from '../transcripts/non-verbal-cues';
import {
  AI_DISCLOSURE,
  ClaimType,
  ReportBlock,
  ReportDocument,
  ReportQuote,
  ReportSection,
  ReportSourceRef,
  formatTimestamp,
} from './report-document';
import {
  TypedInterview,
  evidenceStrength,
  plural,
  strengthBasis,
  triangulationTable,
  typeCounts,
} from './evidence';

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
  claimType?: ClaimType,
): ReportSection {
  return {
    id: `s${++sectionSeq}`,
    heading,
    aiGenerated,
    ...(claimType && { claimType }),
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
const paragraphs = (texts: string[], label?: string): ReportBlock[] =>
  texts.map((text) => ({ type: 'paragraph', text, ...(label && { label }) }));

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
  interviewType?: string | null;
  location?: string | null;
  language?: string | null;
  /** The approved revision the transcript text was frozen at. */
  revisionId?: string | null;
  segments: {
    id: string;
    index: number;
    startMs: number;
    text: string;
    editedText?: string | null;
    speakerLabel?: string | null;
    /** A reviewer's corrected speaker label (wins over the machine's). */
    editedSpeakerLabel?: string | null;
    /** Marked uncertain or inaudible: never quoted as evidence. */
    flagged?: boolean;
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
    // Uncertain passages are not verified evidence, and a bracketed cue
    // such as [laughs] is an annotation, not something a participant said.
    const text =
      segment && !segment.flagged
        ? locateExcerpt(spokenText(segmentText(segment)), str(q.excerpt))
        : null;
    if (!segment || !text || /\[[^\]]+\]/.test(text)) {
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
      speaker: segment.editedSpeakerLabel ?? segment.speakerLabel ?? null,
      interviewType: src.interviewType ?? null,
      location: src.location ?? null,
      revisionId: src.revisionId ?? null,
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
      'summary',
    ),
  );
  sections.push(
    section(
      'Respondent and context',
      true,
      paragraphs(strs(payload.respondentContext)),
      'summary',
    ),
  );

  arr(payload.keyThemes).forEach((t, i) => {
    const blocks: ReportBlock[] = [
      ...paragraphs(strs(t.analysis), 'Interpretation'),
    ];
    for (const q of arr(t.quotes)) {
      const id = quote(q);
      if (id) blocks.push({ type: 'quote', quoteId: id });
    }
    sections.push(
      section(
        `Theme ${i + 1}: ${str(t.theme) || 'Untitled theme'}`,
        true,
        blocks,
        'theme',
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
  sections.push(section('Notable quotations', false, notable, 'evidence'));

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
    section(
      'Recommendations',
      true,
      [
        {
          type: 'table',
          columns: ['Recommendation', 'Basis in the interview'],
          rows: arr(payload.recommendations)
            .map((r) => [str(r.recommendation), str(r.basis)])
            .filter((r) => r[0]),
        },
      ],
      'recommendation',
    ),
  );
  sections.push(
    section('Questions for follow-up', true, [
      { type: 'bullets', items: strs(payload.followUpQuestions) },
    ]),
  );
  sections.push(
    section('Data quality', false, [
      ...(src.segments.some((x) => x.flagged)
        ? [
            {
              type: 'callout' as const,
              tone: 'warning' as const,
              text: `${plural(src.segments.filter((x) => x.flagged).length, 'passage')} in this transcript ${src.segments.filter((x) => x.flagged).length === 1 ? 'was' : 'were'} flagged as uncertain or inaudible by reviewers. They are not quoted, and statements drawn from them should be treated as unverified.`,
            },
          ]
        : []),
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
    sources: [
      {
        ref: 'Interview',
        label: src.sourceLabel,
        interviewId: src.interviewId,
        transcriptId: src.transcriptId,
        revisionId: src.revisionId ?? null,
        interviewType: src.interviewType ?? null,
        location: src.location ?? null,
        language: src.language ?? null,
      },
    ],
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
  /** Every approved interview the report draws on, typed, for triangulation. */
  interviews: TypedInterview[];
  sources: ReportSourceRef[];
}

/** "Q-I2-3" → "I2". */
function refOfQuote(quoteId: string): string | null {
  return /^Q-(I\d+)-\d+$/.exec(quoteId)?.[1] ?? null;
}

/**
 * The project report. Everything the model claims is re-derived or checked
 * here before it is shown:
 *  - quotations only from the verified pool;
 *  - which interviews support a finding, and of which types, from the
 *    interviews and quotations that actually exist (not the model's tally);
 *  - evidence strength from evidenceStrength(), never from the model;
 *  - findings with neither a verified quotation nor a real interview are
 *    withheld and counted;
 *  - contrary evidence and minority views are kept and shown.
 */
export function buildProjectReport(
  payload: Record<string, unknown>,
  src: ProjectReportSource,
  pool: Record<string, ReportQuote>,
): ReportDocument {
  const used: Record<string, ReportQuote> = {};
  const sections: ReportSection[] = [];
  const byRef = new Map(src.interviews.map((i) => [i.ref, i]));
  const total = src.interviews.length;
  const triangulated: {
    title: string;
    refs: string[];
    strength: ReturnType<typeof evidenceStrength>;
  }[] = [];
  let withheld = 0;

  const validPool = (ids: unknown) =>
    [...new Set(strs(ids))].filter((id) => pool[id]);

  sections.push(
    section('At a glance', false, [{ type: 'facts', items: src.facts }]),
  );

  const limited: ReportBlock[] =
    total < 2
      ? [
          {
            type: 'callout',
            tone: 'warning',
            text: `Evidence is limited: this report draws on ${plural(total, 'approved interview')}. Findings are indicative only and cannot show patterns across participants.`,
          },
        ]
      : [];
  sections.push(
    section(
      'Executive summary',
      true,
      [...limited, ...paragraphs(strs(payload.executiveSummary))],
      'summary',
    ),
  );
  sections.push(
    section(
      'Methodology',
      false,
      [
        ...paragraphs(src.methodology),
        {
          type: 'table',
          columns: src.interviewTable.columns,
          rows: src.interviewTable.rows,
        },
      ],
      'evidence',
    ),
  );

  let n = 0;
  for (const f of arr(payload.keyFindings)) {
    const claimed = [...new Set(strs(f.interviews))].filter((r) =>
      byRef.has(r),
    );
    const quoteIds = validPool(f.quoteIds);
    const quotedRefs = [
      ...new Set(
        quoteIds
          .map(refOfQuote)
          .filter((r): r is string => !!r && byRef.has(r)),
      ),
    ];
    if (claimed.length === 0 && quotedRefs.length === 0) {
      withheld++; // nothing real supports it
      continue;
    }
    const refs = [...new Set([...claimed, ...quotedRefs])];
    const contraryItems = arr(f.contraryEvidence);
    const contraryIds = contraryItems.flatMap((c) => validPool(c.quoteIds));
    const contraryRefs = [
      ...new Set(contraryIds.map(refOfQuote).filter((r): r is string => !!r)),
    ];
    const quotedTypes = typeCounts(quotedRefs, byRef);
    const strength = evidenceStrength({
      quotedInterviews: quotedRefs.length,
      quotedTypes: quotedTypes.types.length,
      claimedInterviews: refs.length,
      contrary: Math.max(contraryItems.length, contraryRefs.length),
    });
    const all = typeCounts(refs, byRef);
    const title = str(f.finding) || 'Untitled finding';
    n++;
    triangulated.push({ title: `F${n}. ${title}`, refs, strength });

    const contraryBlocks: ReportBlock[] = contraryItems.flatMap((c) => [
      ...(str(c.summary)
        ? [
            {
              type: 'paragraph' as const,
              label: 'Contrary or qualifying evidence',
              text: str(c.summary),
            },
          ]
        : []),
      ...poolQuotes(c.quoteIds, pool, used),
    ]);

    sections.push(
      section(
        `Finding ${n}: ${title}`,
        true,
        [
          {
            type: 'facts',
            items: [
              {
                label: 'Raised in',
                value: `${refs.length} of ${total} interviews${all.summary ? ` (${all.summary})` : ''}`,
              },
              {
                label: 'Evidence strength',
                value: strengthBasis(
                  strength,
                  {
                    quotedInterviews: quotedRefs.length,
                    quotedTypes: quotedTypes.types.length,
                    claimedInterviews: refs.length,
                    contrary: Math.max(
                      contraryItems.length,
                      contraryRefs.length,
                    ),
                  },
                  quotedTypes.summary,
                ),
              },
            ],
          },
          ...paragraphs(
            strs(f.whatParticipantsSaid ?? f.narrative),
            'Summary of what participants said',
          ),
          ...paragraphs(strs(f.interpretation), 'Interpretation'),
          ...poolQuotes(quoteIds, pool, used),
          ...contraryBlocks,
          {
            type: 'paragraph' as const,
            label: 'Sources',
            text: `${refs.map((r) => `${r} (${src.refLabels[r]})`).join('; ')}.`,
          },
        ],
        'interpretation',
      ),
    );
  }

  // Triangulation is deterministic: it comes from which interviews of which
  // type actually support each finding, not from the model.
  if (triangulated.length && src.interviews.length) {
    const tri = triangulationTable({
      findings: triangulated,
      interviews: src.interviews,
    });
    sections.push(
      section(
        'Triangulation across interview types',
        false,
        [
          {
            type: 'paragraph',
            text: 'Each cell counts the interviews of that type that support the finding. A finding supported by more than one interview type is more robust than one that appears in a single source, but repetition across transcripts is not validation: interviewees may share a source, a location or a viewpoint. Findings supported by a single interview type or interview are marked as such and should be read as leads.',
          },
          { type: 'table', columns: tri.columns, rows: tri.rows },
        ],
        'evidence',
      ),
    );
  }

  const themes = arr(payload.crossCuttingThemes);
  if (themes.length) {
    sections.push(
      section(
        'Cross-cutting themes (analyst-generated)',
        true,
        themes.flatMap((t) => [
          {
            type: 'paragraph' as const,
            label: 'Theme',
            text: `${str(t.theme)}. ${str(t.analysis)}`.trim(),
          },
        ]),
        'theme',
      ),
    );
  }

  const divergent = arr(payload.divergentViews)
    .map((d) => [str(d.topic), str(d.views)])
    .filter((r) => r[0]);
  sections.push(
    section(
      'Divergent views and contradictions',
      true,
      [
        {
          type: 'table',
          columns: ['Topic', 'How views differed'],
          rows: divergent,
        },
      ],
      'interpretation',
    ),
  );

  const minority = arr(payload.minorityViews);
  if (minority.length) {
    sections.push(
      section(
        'Minority views and negative cases',
        true,
        minority.flatMap((m) => [
          {
            type: 'paragraph' as const,
            label: 'Minority view',
            text: str(m.view),
          },
          ...poolQuotes(m.quoteIds, pool, used),
        ]),
        'interpretation',
      ),
    );
  }

  const gaps = strs(payload.insufficientEvidence);
  if (gaps.length) {
    sections.push(
      section(
        'Where the evidence is insufficient',
        true,
        [{ type: 'bullets', items: gaps }],
        'limitation',
      ),
    );
  }

  const order = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
  sections.push(
    section(
      'Recommendations',
      true,
      [
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
      ],
      'recommendation',
    ),
  );
  sections.push(
    section(
      'Limitations',
      false,
      [
        {
          type: 'bullets',
          items: [
            ...src.limitations,
            ...(withheld
              ? [
                  `${plural(withheld, 'candidate finding')} proposed by the analysis ${withheld === 1 ? 'was' : 'were'} withheld because no verified quotation or interview supported ${withheld === 1 ? 'it' : 'them'}.`,
                ]
              : []),
            ...strs(payload.limitations),
          ],
        },
      ],
      'limitation',
    ),
  );
  sections.push(
    section(
      'Conclusion',
      true,
      paragraphs(strs(payload.conclusion)),
      'interpretation',
    ),
  );
  sections.push(
    section(
      'Next steps',
      true,
      [{ type: 'bullets', items: strs(payload.nextSteps) }],
      'recommendation',
    ),
  );
  sections.push(
    section(
      'Appendix: interview summaries',
      true,
      src.interviewSummaries.flatMap((s) => [
        { type: 'paragraph' as const, text: `${s.label}. ${s.summary}` },
      ]),
      'summary',
    ),
  );

  return {
    kind: 'Project report',
    title: str(payload.title) || `${src.projectName}: findings report`,
    subtitle: src.projectName,
    meta: src.facts,
    sections: sections.filter((s) => s.blocks.length > 0),
    quotes: used,
    sources: src.sources,
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
  sources: ReportSourceRef[] = [],
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
    sources,
    disclosure: AI_DISCLOSURE,
    generatedAt: new Date().toISOString(),
  };
}
