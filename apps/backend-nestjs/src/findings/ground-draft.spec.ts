import { groundDraftFindings, locateExcerpt } from './findings.service';

const segments = new Map([
  [
    0,
    {
      id: 's0',
      text: 'The clinic was closed on market days.',
      editedText: null,
    },
  ],
  [
    1,
    { id: 's1', text: 'Wuya ruwa', editedText: 'Ruwan sha ya yi mana wuya.' },
  ],
  [
    7,
    { id: 's7', text: 'We walk two hours to the borehole.', editedText: null },
  ],
]);

describe('groundDraftFindings', () => {
  it('keeps every finding with a verbatim quotation, from anywhere in the interview', () => {
    const { findings, discardedQuotations } = groundDraftFindings(
      {
        findings: [
          {
            title: 'Clinic access is irregular',
            interpretation: 'Closed on market days.',
            theme: 'Health access',
            quotations: [{ segmentIndex: 0, excerpt: 'clinic was closed' }],
          },
          {
            title: 'Water is far away',
            interpretation: 'Long walks for water.',
            quotations: [
              { segmentIndex: 7, excerpt: 'two hours to the borehole' },
              // Checked against the correction, not the machine text.
              { segmentIndex: 1, excerpt: 'Ruwan sha' },
            ],
          },
        ],
      },
      segments,
    );
    expect(discardedQuotations).toBe(0);
    expect(
      findings.map((f) => [f.title, f.quotations.map((q) => q.segmentId)]),
    ).toEqual([
      ['Clinic access is irregular', ['s0']],
      ['Water is far away', ['s7', 's1']],
    ]);
  });

  it('discards invented or paraphrased quotations, and findings left with none', () => {
    const { findings, discardedQuotations } = groundDraftFindings(
      {
        findings: [
          {
            title: 'Mixed',
            interpretation: 'x',
            quotations: [
              { segmentIndex: 0, excerpt: 'The clinic is always shut' }, // paraphrase
              { segmentIndex: 0, excerpt: 'closed on market days' },
              { segmentIndex: 99, excerpt: 'anything' }, // no such segment
            ],
          },
          {
            title: 'Unsupported',
            interpretation: 'y',
            quotations: [{ segmentIndex: 1, excerpt: 'Wuya ruwa' }], // replaced by the correction
          },
        ],
      },
      segments,
    );
    expect(discardedQuotations).toBe(3);
    expect(findings).toHaveLength(1);
    expect(findings[0].quotations).toEqual([
      { segmentId: 's0', excerpt: 'closed on market days' },
    ]);
  });
});

describe('locateExcerpt', () => {
  const text =
    'Initially, Point One will start from Africa - and eventually   go global.';

  it('returns exact matches as they are', () => {
    expect(locateExcerpt(text, 'start from Africa')).toBe('start from Africa');
  });

  it("tolerates re-casing and re-punctuation, returning the transcript's own wording", () => {
    expect(locateExcerpt(text, 'initially point one will start')).toBe(
      'Initially, Point One will start',
    );
    expect(locateExcerpt(text, 'Africa, and eventually go global')).toBe(
      'Africa - and eventually   go global',
    );
  });

  it('refuses words that are not there', () => {
    expect(locateExcerpt(text, 'start from Asia')).toBeNull();
    expect(locateExcerpt(text, '')).toBeNull();
  });
});
