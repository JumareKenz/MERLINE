import {
  parseCsv,
  parseGuideFile,
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
      'type',
      'options_en',
      'options_ha',
      'scale_min',
      'scale_max',
      'probes_en',
      'required',
    ];

    it('builds questions with languages, options, scales, probes and order', () => {
      const result = rowsToQuestions([
        header,
        [
          '2',
          'Water',
          'Main source?',
          'Babban tushe?',
          'single',
          'Borehole | River',
          'Burtsatse | Kogi',
          '',
          '',
          '',
          'yes',
        ],
        ['1', '', 'Your role?', '', '', '', '', '', '', 'Ask how long', 'no'],
        ['3', '', 'Satisfaction?', '', 'Likert', '', '', '0', '10', '', ''],
      ]);
      expect(result.errors).toEqual([]);
      expect(result.languages).toEqual(['en', 'ha']);
      expect(result.questions.map((q) => [q.order, q.text.en, q.type])).toEqual(
        [
          [1, 'Your role?', 'OPEN'],
          [2, 'Main source?', 'SINGLE'],
          [3, 'Satisfaction?', 'SCALE'],
        ],
      );
      expect(result.questions[1].options).toEqual([
        { en: 'Borehole', ha: 'Burtsatse' },
        { en: 'River', ha: 'Kogi' },
      ]);
      expect(result.questions[1].required).toBe(true);
      expect(result.questions[0].probes).toEqual({ en: 'Ask how long' });
      expect([
        result.questions[2].scaleMin,
        result.questions[2].scaleMax,
      ]).toEqual([0, 10]);
    });

    it('reports every problem with the row number the author sees', () => {
      const result = rowsToQuestions([
        header,
        ['1', '', '', 'Tambaya', 'open', '', '', '', '', '', ''],
        ['2', '', 'Pick one', '', 'single', 'Only one', '', '', '', '', ''],
        ['3', '', 'Pick', '', 'single', 'A | B', 'A', '', '', '', ''],
        ['4', '', 'Rate', '', 'scale', '', '', '5', '1', '', ''],
        ['5', '', 'Why', '', 'essay', '', '', '', '', '', ''],
        ['6', '', 'Ok', '', 'open', '', '', '', '', '', 'maybe'],
      ]);
      expect(result.questions).toHaveLength(0);
      expect(result.errors.map((e) => e.row)).toEqual([2, 3, 4, 5, 6, 7]);
      expect(result.errors[1].message).toMatch(/at least two options/);
      expect(result.errors[2].message).toMatch(
        /options_ha has 1 options but options_en has 2/,
      );
      expect(result.errors[4].message).toMatch(/Unknown type "essay"/);
    });

    it('requires English question text', () => {
      const result = rowsToQuestions([['question_ha'], ['Tambaya']]);
      expect(result.errors[0].message).toMatch(/question_en/);
    });
  });

  it('parses its own CSV and Excel templates without errors', async () => {
    for (const [buf, name] of [
      [Buffer.from(templateCsv()), 'template.csv'],
      [await templateXlsx(), 'template.xlsx'],
    ] as const) {
      const result = await parseGuideFile(buf, name);
      expect(result.errors).toEqual([]);
      expect(result.questions).toHaveLength(3);
      expect(result.questions[1].options[0]).toEqual({
        en: 'Borehole',
        ha: 'Rijiyar burtsatse',
      });
    }
  });

  it('refuses other file types', async () => {
    const result = await parseGuideFile(Buffer.from('x'), 'guide.pdf');
    expect(result.errors[0].message).toMatch(/\.csv or \.xlsx/);
  });
});
