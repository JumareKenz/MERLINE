import {
  TEMPLATE_COLUMNS,
  parseCsv,
  parseGuideFile,
  parseXlsx,
  rowsToQuestions,
  templateCsv,
  templateXlsx,
} from './guide-import';

describe('guide import', () => {
  describe('parseCsv', () => {
    it('handles quotes, embedded commas and newlines, doubled quotes and a BOM', () => {
      const csv =
        '﻿order,question_en\r\n1,"Where, exactly?"\r\n2,"He said ""no""\nthen left"\r\n';
      expect(parseCsv(csv)).toEqual([
        ['order', 'question_en'],
        ['1', 'Where, exactly?'],
        ['2', 'He said "no"\nthen left'],
      ]);
    });

    it('reads semicolon-separated files (Excel in some locales)', () => {
      expect(parseCsv('order;question_en\n1;Hello, there')).toEqual([
        ['order', 'question_en'],
        ['1', 'Hello, there'],
      ]);
    });
  });

  describe('rowsToQuestions', () => {
    const header = [
      'order',
      'section',
      'question_en',
      'question_ha',
      'probes_en',
      'required',
    ];
    /** The columns an older template had: files made from it still arrive. */
    const legacyHeader = [
      'order',
      'section',
      'question_en',
      'question_ha',
      'type',
      'options_en',
      'options_ha',
      'scale_min',
      'scale_max',
      'probes_en',
      'required',
    ];

    it('builds open questions with languages, probes and order', () => {
      const result = rowsToQuestions([
        header,
        ['2', 'Water', 'Main source?', 'Babban tushe?', '', 'yes'],
        ['1', '', 'Your role?', '', 'Ask how long', 'no'],
      ]);
      expect(result.errors).toEqual([]);
      expect(result.languages).toEqual(['en', 'ha']);
      expect(result.questions.map((q) => [q.order, q.text.en, q.type])).toEqual(
        [
          [1, 'Your role?', 'OPEN'],
          [2, 'Main source?', 'OPEN'],
        ],
      );
      expect(result.questions[1].required).toBe(true);
      expect(result.questions[0].probes).toEqual({ en: 'Ask how long' });
      // Nothing about choices or scales exists on a parsed question.
      expect(Object.keys(result.questions[0]).sort()).toEqual(
        ['order', 'probes', 'required', 'section', 'text', 'type'].sort(),
      );
    });

    it('accepts an older-template file whose type says open and whose options are empty', () => {
      const result = rowsToQuestions([
        legacyHeader,
        ['1', '', 'Your role?', '', 'open', '', '', '', '', '', 'no'],
        ['2', '', 'Why?', '', '', '', '', '', '', '', 'no'],
        ['3', '', 'How?', '', 'Text', '', '', '', '', '', 'no'],
      ]);
      expect(result.errors).toEqual([]);
      expect(result.questions.map((q) => q.type)).toEqual([
        'OPEN',
        'OPEN',
        'OPEN',
      ]);
    });

    it('refuses choice, checkbox and rating questions, with the row and what to do', () => {
      const result = rowsToQuestions([
        legacyHeader,
        ['1', '', 'Fine', '', 'open', '', '', '', '', '', 'no'],
        ['2', '', 'Main source?', '', 'single', 'A | B', '', '', '', '', ''],
        ['3', '', 'Which?', '', 'Multiple choice', '', '', '', '', '', ''],
        ['4', '', 'Rate it', '', 'scale', '', '', '1', '5', '', ''],
        ['5', '', 'Rate it', '', 'Likert', '', '', '', '', '', ''],
        ['6', '', 'Why', '', 'essay', '', '', '', '', '', ''],
      ]);
      // The valid row parses; the import as a whole is refused because
      // errors exist (see GuidesService.import), so nothing is saved.
      expect(result.questions.map((q) => q.text.en)).toEqual(['Fine']);
      expect(result.errors.map((e) => e.row)).toEqual([3, 4, 5, 6, 7]);
      for (const e of result.errors.slice(0, 4)) {
        expect(e.message).toMatch(/Merline guides are open-ended/);
        expect(e.message).toMatch(/set the type to open/);
      }
      expect(result.errors[0].message).toMatch(/"Main source\?"/);
      expect(result.errors[4].message).toMatch(/Unknown type "essay"/);
    });

    it('refuses answer options and scale values even when the type says open', () => {
      const result = rowsToQuestions([
        legacyHeader,
        ['1', '', 'Why?', '', 'open', 'Yes | No', '', '', '', '', ''],
        ['2', '', 'Why?', '', 'open', '', 'Eh | A’a', '', '', '', ''],
        ['3', '', 'Why?', '', '', '', '', '1', '5', '', ''],
      ]);
      expect(result.questions).toHaveLength(0);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].message).toMatch(
        /options_ columns must be empty/,
      );
      expect(result.errors[2].message).toMatch(/scale_min and scale_max/);
    });

    it('still reports the other problems by row', () => {
      const result = rowsToQuestions([
        header,
        ['1', '', '', 'Tambaya', '', ''],
        ['2', '', 'Ok', '', '', 'maybe'],
        ['x', '', 'Ok', '', '', ''],
      ]);
      expect(result.errors.map((e) => e.row)).toEqual([2, 3, 4]);
      expect(result.errors[0].message).toMatch(/question_en/);
      expect(result.errors[1].message).toMatch(/required must be yes or no/);
    });

    it('requires English question text', () => {
      const result = rowsToQuestions([['question_ha'], ['Tambaya']]);
      expect(result.errors[0].message).toMatch(/question_en/);
    });
  });

  it('parses its own CSV and Excel templates without errors, and they hold only open questions', async () => {
    for (const [buf, name] of [
      [Buffer.from(templateCsv()), 'template.csv'],
      [await templateXlsx(), 'template.xlsx'],
    ] as const) {
      const result = await parseGuideFile(buf, name);
      expect(result.errors).toEqual([]);
      expect(result.questions).toHaveLength(3);
      expect(result.questions.every((q) => q.type === 'OPEN')).toBe(true);
    }
    const csv = templateCsv().toLowerCase();
    for (const word of [
      'single',
      'multiple',
      'scale',
      'options_',
      'borehole |',
    ]) {
      expect(csv).not.toContain(word);
    }
    const xlsx = await templateXlsx();
    const rows = await parseXlsx(xlsx);
    expect(rows[0]).toEqual(TEMPLATE_COLUMNS);
    expect(TEMPLATE_COLUMNS.join(',')).not.toMatch(/type|options|scale/);
  });

  it('refuses other file types', async () => {
    const result = await parseGuideFile(Buffer.from('x'), 'guide.pdf');
    expect(result.errors[0].message).toMatch(/\.csv or \.xlsx/);
  });
});
