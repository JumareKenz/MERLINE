import {
  buildInterviewReport,
  buildProjectEvidence,
  buildProjectReport,
} from './report-builders';
import {
  evidenceStrength,
  triangulationTable,
  strengthBasis,
} from './evidence';
import type { ReportDocument } from './report-document';

function interviewDoc(
  ref: string,
  type: string,
  location: string,
  lines: { text: string; flagged?: boolean; speaker?: string | null }[],
): ReportDocument {
  const { doc } = buildInterviewReport(
    {
      title: `Interview ${ref}`,
      executiveSummary: ['Summary'],
      keyThemes: [
        {
          theme: 'Water',
          analysis: ['Analysis'],
          quotes: lines.map((_, i) => ({
            segmentIndex: i,
            excerpt: lines[i].text,
          })),
        },
      ],
    },
    {
      interviewId: `iv-${ref}`,
      transcriptId: `t-${ref}`,
      sourceLabel: `Interview ${ref} · ${type}`,
      interviewType: type,
      location,
      revisionId: `rev-${ref}`,
      facts: [],
      qualityNotes: [],
      allowQuotes: true,
      segments: lines.map((l, i) => ({
        id: `seg-${ref}-${i}`,
        index: i,
        startMs: i * 1000,
        text: l.text,
        speakerLabel: 'S1',
        editedSpeakerLabel: l.speaker,
        flagged: l.flagged,
      })),
    },
  );
  return doc;
}

const types = [
  { ref: 'I1', type: 'KII', typeLabel: 'KII', location: 'Kano' },
  { ref: 'I2', type: 'KII', typeLabel: 'KII', location: 'Kano' },
  { ref: 'I3', type: 'FGD', typeLabel: 'FGD', location: 'Jigawa' },
  { ref: 'I4', type: 'FGD', typeLabel: 'FGD', location: 'Jigawa' },
];

function project(payload: Record<string, unknown>, docs?: ReportDocument[]) {
  const d =
    docs ??
    types.map((t) =>
      interviewDoc(t.ref, t.type, t.location, [
        { text: `The borehole is broken (${t.ref}).` },
      ]),
    );
  const evidence = buildProjectEvidence(
    types.slice(0, d.length).map((t, i) => ({
      ref: t.ref,
      label: `Interview ${t.ref} · ${t.type}`,
      meta: t.type,
      report: d[i],
    })),
  );
  const doc = buildProjectReport(
    payload,
    {
      projectName: 'Water',
      facts: [],
      methodology: ['m'],
      interviewTable: { columns: ['No.'], rows: [] },
      limitations: [],
      interviewSummaries: [],
      refLabels: Object.fromEntries(
        types.map((t) => [t.ref, `Interview ${t.ref}`]),
      ),
      interviews: types.slice(0, d.length),
      sources: [],
    },
    evidence.pool,
  );
  return { doc, pool: evidence.pool };
}

const text = (v: unknown) => JSON.stringify(v);

describe('evidence strength', () => {
  it('is computed from verified support, never from the model', () => {
    expect(
      evidenceStrength({
        quotedInterviews: 3,
        quotedTypes: 2,
        claimedInterviews: 3,
        contrary: 0,
      }),
    ).toBe('Strong');
    // three interviews of a single type is not "strong": no triangulation
    expect(
      evidenceStrength({
        quotedInterviews: 3,
        quotedTypes: 1,
        claimedInterviews: 3,
        contrary: 0,
      }),
    ).toBe('Moderate');
    expect(
      evidenceStrength({
        quotedInterviews: 1,
        quotedTypes: 1,
        claimedInterviews: 1,
        contrary: 0,
      }),
    ).toBe('Limited');
    expect(
      evidenceStrength({
        quotedInterviews: 0,
        quotedTypes: 0,
        claimedInterviews: 1,
        contrary: 0,
      }),
    ).toBe('Insufficient');
    // contradiction matching the support caps it
    expect(
      evidenceStrength({
        quotedInterviews: 3,
        quotedTypes: 2,
        claimedInterviews: 3,
        contrary: 3,
      }),
    ).toBe('Limited');
  });

  it('says the rating is not validation', () => {
    const basis = strengthBasis(
      'Strong',
      {
        quotedInterviews: 3,
        quotedTypes: 2,
        claimedInterviews: 3,
        contrary: 0,
      },
      '2 KII, 1 FGD',
    );
    expect(basis).toMatch(/not show the finding is true or validated/);
  });
});

describe('triangulation across interview types', () => {
  it('counts supporting interviews per type and names single-type findings', () => {
    const t = triangulationTable({
      interviews: types,
      findings: [
        { title: 'Across', refs: ['I1', 'I3'], strength: 'Moderate' },
        { title: 'Only KII', refs: ['I1', 'I2'], strength: 'Moderate' },
        { title: 'One', refs: ['I4'], strength: 'Limited' },
      ],
    });
    expect(t.columns).toEqual([
      'Finding',
      'KII (of 2)',
      'FGD (of 2)',
      'Reading',
      'Locations',
      'Evidence',
    ]);
    expect(t.rows[0].slice(1, 4)).toEqual([
      '1',
      '1',
      'Across 2 interview types',
    ]);
    expect(t.rows[1].slice(1, 4)).toEqual(['2', '0', 'One type only (KII)']);
    expect(t.rows[2][3]).toBe('Single interview');
    expect(t.rows[0][4]).toBe('Kano; Jigawa');
  });
});

describe('project report evidence rules', () => {
  const findings = {
    title: 'T',
    executiveSummary: ['s'],
    keyFindings: [
      {
        finding: 'Boreholes are broken',
        whatParticipantsSaid: ['They said so.'],
        interpretation: ['We read this as neglect.'],
        interviews: ['I1', 'I3'],
        quoteIds: ['Q-I1-1', 'Q-I3-1'],
        contraryEvidence: [
          {
            summary: 'One FGD said the borehole works.',
            interviews: ['I4'],
            quoteIds: ['Q-I4-1'],
          },
        ],
      },
    ],
  };

  it('computes prevalence, types and strength itself and labels claim types', () => {
    const { doc } = project(findings);
    const f = doc.sections.find((s) => s.heading.startsWith('Finding 1'))!;
    const facts = f.blocks.find((b) => b.type === 'facts');
    const raised = facts && facts.type === 'facts' ? facts.items[0].value : '';
    expect(raised).toBe('2 of 4 interviews (1 KII, 1 FGD)');
    expect(text(f)).toMatch(/Evidence strength/);
    expect(text(f)).toMatch(/Summary of what participants said/);
    expect(text(f)).toMatch(/"label":"Interpretation"/);
    expect(f.claimType).toBe('interpretation');
  });

  it('preserves contradictory evidence, quoted verbatim, beside the finding', () => {
    const { doc } = project(findings);
    const f = doc.sections.find((s) => s.heading.startsWith('Finding 1'))!;
    expect(text(f)).toMatch(/Contrary or qualifying evidence/);
    const quoted = f.blocks
      .filter((b) => b.type === 'quote')
      .map((b) => (b.type === 'quote' ? b.quoteId : ''));
    expect(quoted).toEqual(
      expect.arrayContaining(['Q-I1-1', 'Q-I3-1', 'Q-I4-1']),
    );
  });

  it('triangulates across KII and FGD and lists the approved sources', () => {
    const { doc } = project(findings);
    const tri = doc.sections.find((s) =>
      s.heading.startsWith('Triangulation'),
    )!;
    const table = tri.blocks.find((b) => b.type === 'table');
    expect(table && table.type === 'table' && table.columns).toContain(
      'FGD (of 2)',
    );
    expect(text(tri)).toMatch(/not validation/);
  });

  it('withholds a finding that no interview or verified quotation supports, and says so', () => {
    const { doc } = project({
      ...findings,
      keyFindings: [
        ...findings.keyFindings,
        {
          finding: 'Invented claim',
          interviews: ['I9'],
          quoteIds: ['Q-FAKE'],
        },
      ],
    });
    expect(text(doc)).not.toContain('Invented claim');
    const lim = doc.sections.find((s) => s.heading === 'Limitations')!;
    expect(text(lim)).toMatch(
      /1 candidate finding proposed by the analysis was withheld/,
    );
  });

  it('never presents a quotation the pool does not hold', () => {
    const { doc } = project({
      ...findings,
      keyFindings: [
        { ...findings.keyFindings[0], quoteIds: ['Q-I1-1', 'Q-NOPE'] },
      ],
    });
    expect(Object.keys(doc.quotes)).not.toContain('Q-NOPE');
    for (const q of Object.values(doc.quotes)) {
      expect(q.interviewType).toBeTruthy();
      expect(q.revisionId).toMatch(/^rev-/);
    }
  });

  it('keeps minority views and states insufficient evidence explicitly', () => {
    const { doc } = project({
      ...findings,
      minorityViews: [
        {
          view: 'One elder prefers hand pumps.',
          interviews: ['I2'],
          quoteIds: ['Q-I2-1'],
        },
      ],
      insufficientEvidence: ['Cost of water vendors: only one passing mention'],
    });
    expect(text(doc)).toMatch(/Minority views and negative cases/);
    expect(text(doc)).toMatch(/Where the evidence is insufficient/);
    expect(text(doc)).toMatch(/Cost of water vendors/);
  });

  it('warns that evidence is limited when only one approved interview exists', () => {
    const one = [
      interviewDoc('I1', 'KII', 'Kano', [
        { text: 'The borehole is broken (I1).' },
      ]),
    ];
    const { doc } = project(
      { title: 'T', executiveSummary: ['s'], keyFindings: [] },
      one,
    );
    const summary = doc.sections.find(
      (s) => s.heading === 'Executive summary',
    )!;
    expect(text(summary)).toMatch(
      /Evidence is limited: this report draws on 1 approved interview/,
    );
  });
});

describe('interview report quotations', () => {
  it('does not quote flagged passages or bracketed cues, and credits the corrected speaker', () => {
    const doc = interviewDoc('I1', 'KII', 'Kano', [
      { text: 'We have no clean water.', speaker: 'Respondent' },
      { text: 'The chief said it was fine.', flagged: true },
      { text: 'We [laughs] cope somehow.' },
    ]);
    const quoted = Object.values(doc.quotes);
    expect(quoted.map((q) => q.text)).toEqual(['We have no clean water.']);
    expect(quoted[0].speaker).toBe('Respondent');
    expect(text(doc)).toMatch(/flagged as uncertain or inaudible/);
    expect(doc.sources?.[0]).toMatchObject({
      transcriptId: 't-I1',
      revisionId: 'rev-I1',
    });
  });
});
