import {
  buildCustomReport,
  buildInterviewReport,
  buildProjectEvidence,
  buildProjectReport,
  parseModelJson,
} from './report-builders';
import { renderReportHtml } from './exporters/html';
import { renderReportDocx } from './exporters/docx';
import { renderReportXlsx } from './exporters/xlsx';

const segments = [
  {
    id: 's0',
    index: 0,
    startMs: 0,
    text: 'Water is our biggest problem here.',
    editedText: null,
  },
  {
    id: 's1',
    index: 1,
    startMs: 14_000,
    text: 'Two boreholes are broken.',
    editedText: 'Two of the three boreholes are broken.',
  },
  {
    id: 's2',
    index: 2,
    startMs: 95_000,
    text: 'Women walk two hours to the river.',
    editedText: null,
  },
];

const source = {
  interviewId: 'iv1',
  transcriptId: 't1',
  sourceLabel: 'Interview 1 · KII · Ward chair',
  facts: [{ label: 'Interview type', value: 'Key informant interview' }],
  segments,
  qualityNotes: [],
  allowQuotes: true,
};

const payload = {
  title: 'Water access in Garun Mallam',
  executiveSummary: ['Boreholes have failed.', 'Women carry the burden.'],
  respondentContext: 'The ward chair.',
  keyThemes: [
    {
      theme: 'Broken infrastructure',
      analysis: ['Most boreholes do not work.'],
      quotes: [
        { segmentIndex: 1, excerpt: 'two of the three boreholes are broken' }, // re-cased: matched
        { segmentIndex: 0, excerpt: 'We have no water at all' }, // invented: dropped
      ],
    },
    {
      theme: 'Gendered burden',
      analysis: ['Long walks.'],
      quotes: [{ segmentIndex: 2, excerpt: 'Women walk two hours' }],
    },
  ],
  notableQuotes: [
    {
      segmentIndex: 0,
      excerpt: 'Water is our biggest problem',
      why: 'Frames the interview',
    },
  ],
  challenges: ['No repair budget'],
  opportunities: [],
  recommendations: [
    { recommendation: 'Train a water committee', basis: 'Repairs are slow' },
  ],
  followUpQuestions: ['Who holds the spare parts?'],
  dataQualityNotes: [],
};

describe('report builders', () => {
  it('builds an interview report keeping only verbatim quotations, with timestamps', () => {
    const { doc, discarded } = buildInterviewReport(payload, source);
    expect(discarded).toBe(1);
    expect(doc.kind).toBe('Interview report');
    const quotes = Object.values(doc.quotes);
    // Stored in the transcript's own (corrected) wording.
    expect(quotes.map((q) => q.text)).toEqual([
      'Two of the three boreholes are broken',
      'Women walk two hours',
      'Water is our biggest problem',
    ]);
    expect(quotes[1].startMs).toBe(95_000);
    const headings = doc.sections.map((s) => s.heading);
    expect(headings).toContain('Theme 1: Broken infrastructure');
    expect(headings).not.toContain('Opportunities and strengths'); // empty sections are dropped
    expect(
      doc.sections.find((s) => s.heading === 'At a glance')?.aiGenerated,
    ).toBe(false);
    expect(
      doc.sections.find((s) => s.heading === 'Executive summary')?.aiGenerated,
    ).toBe(true);
  });

  it('leaves out every quotation when consent does not permit quoting', () => {
    const { doc } = buildInterviewReport(payload, {
      ...source,
      allowQuotes: false,
    });
    expect(Object.keys(doc.quotes)).toHaveLength(0);
    const quality = doc.sections.find((s) => s.heading === 'Data quality');
    expect(JSON.stringify(quality)).toMatch(/did not consent to being quoted/);
  });

  it('pools verified quotations for the project and only lets the model cite from the pool', () => {
    const { doc } = buildInterviewReport(payload, source);
    const evidence = buildProjectEvidence([
      {
        ref: 'I1',
        label: 'Interview 1 · KII · Ward chair',
        meta: 'KII',
        report: doc,
      },
    ]);
    expect(Object.keys(evidence.pool)).toEqual(['Q-I1-1', 'Q-I1-2', 'Q-I1-3']);
    expect(evidence.text).toContain('[Q-I1-2] (1:35) "Women walk two hours"');

    const project = buildProjectReport(
      {
        title: 'Project',
        executiveSummary: ['Summary'],
        keyFindings: [
          {
            finding: 'Boreholes fail',
            narrative: ['Evidence'],
            prevalence: '1 of 1',
            interviews: ['I1', 'I9'],
            quoteIds: ['Q-I1-1', 'Q-FAKE'],
          },
        ],
        recommendations: [
          { recommendation: 'Later', rationale: 'r', priority: 'Low' },
          { recommendation: 'Now', rationale: 'r', priority: 'High' },
        ],
      },
      {
        projectName: 'Water',
        facts: [],
        methodology: ['Method'],
        interviewTable: { columns: ['No.'], rows: [['I1']] },
        limitations: ['Not representative'],
        interviewSummaries: [],
        refLabels: { I1: 'Interview 1' },
      },
      evidence.pool,
    );
    expect(Object.keys(project.quotes)).toEqual(['Q-I1-1']); // invented id dropped
    const recs = project.sections.find((s) => s.heading === 'Recommendations')!
      .blocks[0];
    expect(recs.type === 'table' && recs.rows.map((r) => r[1])).toEqual([
      'Now',
      'Later',
    ]); // by priority
    const finding = project.sections.find((s) =>
      s.heading.startsWith('Finding 1'),
    )!;
    expect(JSON.stringify(finding)).not.toContain('I9'); // unknown interview ref dropped

    const brief = buildCustomReport(
      {
        title: 'Donor brief',
        sections: [
          {
            heading: 'Why it matters',
            paragraphs: ['p'],
            quoteIds: ['Q-I1-3'],
            table: { columns: ['A'], rows: [['1']] },
          },
        ],
      },
      'Water',
      [],
      evidence.pool,
    );
    expect(brief.kind).toBe('Research brief');
    expect(brief.sections[0].blocks.map((b) => b.type)).toEqual([
      'paragraph',
      'table',
      'quote',
    ]);
  });

  it('parses model JSON, tolerating a code fence', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => parseModelJson('[1]')).toThrow();
  });
});

describe('report exports', () => {
  const { doc } = buildInterviewReport(payload, source);

  it('renders branded, escaped HTML for PDF with fonts embedded', () => {
    const html = renderReportHtml({ ...doc, title: 'A <b> & "c"' }, 'Org');
    expect(html).toContain('A &lt;b&gt; &amp; &quot;c&quot;');
    expect(html).toContain("@font-face{font-family:'Inter'");
    expect(html).toContain(
      'Verbatim</span> Interview 1 · KII · Ward chair · 1:35',
    );
    expect(html).toContain('counter(pages)');
  });

  it('renders Word and Excel files', async () => {
    const docx = await renderReportDocx(doc, 'Org');
    const xlsx = await renderReportXlsx(doc, 'Org');
    // Both are zip packages.
    expect(docx.subarray(0, 2).toString()).toBe('PK');
    expect(xlsx.subarray(0, 2).toString()).toBe('PK');
    expect(docx.length).toBeGreaterThan(50_000); // embedded font
  });
});
