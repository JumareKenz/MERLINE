import ExcelJS from 'exceljs';

export const QUESTION_TYPES = ['OPEN', 'SINGLE', 'MULTIPLE', 'SCALE'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** One question as stored: text, options and probes keyed by language. */
export interface ParsedQuestion {
  order: number;
  section?: string;
  text: Record<string, string>;
  type: QuestionType;
  options: Record<string, string>[];
  scaleMin?: number;
  scaleMax?: number;
  probes: Record<string, string>;
  required: boolean;
}

export interface ImportResult {
  languages: string[];
  questions: ParsedQuestion[];
  /** Row numbers are as the author sees them (header is row 1). */
  errors: { row: number; message: string }[];
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  open: 'OPEN',
  'open-ended': 'OPEN',
  'open ended': 'OPEN',
  text: 'OPEN',
  single: 'SINGLE',
  'single choice': 'SINGLE',
  'single-choice': 'SINGLE',
  radio: 'SINGLE',
  multiple: 'MULTIPLE',
  'multiple choice': 'MULTIPLE',
  'multiple-choice': 'MULTIPLE',
  checkbox: 'MULTIPLE',
  scale: 'SCALE',
  rating: 'SCALE',
  likert: 'SCALE',
};

/** Columns of the template, in order. `_xx` columns repeat per language. */
export const TEMPLATE_COLUMNS = [
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
  'probes_ha',
  'required',
];

const EXAMPLE_ROWS = [
  [
    '1',
    'Introduction',
    'Please tell me about your role in the community.',
    'Don Allah ka gaya mani matsayinka a cikin al’umma.',
    'open',
    '',
    '',
    '',
    '',
    'Ask how long they have held the role.',
    'Tambayi tsawon lokacin da ya riƙe matsayin.',
    'yes',
  ],
  [
    '2',
    'Water access',
    'What is the main source of drinking water for your household?',
    'Mene ne babban tushen ruwan sha na gidanku?',
    'single',
    'Borehole | River | Vendor | Other',
    'Rijiyar burtsatse | Kogi | Mai sayar da ruwa | Wani',
    '',
    '',
    '',
    '',
    'yes',
  ],
  [
    '3',
    'Water access',
    'How satisfied are you with the water supply?',
    'Yaya gamsuwarka da samar da ruwa?',
    'scale',
    '',
    '',
    '1',
    '5',
    '1 = very dissatisfied, 5 = very satisfied',
    '',
    'no',
  ],
];

/* ---------------------------------------------------------------- */

/**
 * RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF, BOM tolerated.
 * The delimiter is taken from the header line: comma, or semicolon/tab as
 * Excel writes in some locales.
 */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '');
  const firstLine = s.split(/\r?\n/, 1)[0] ?? '';
  const delimiter =
    [',', ';', '\t']
      .map((d) => ({ d, n: firstLine.split(d).length - 1 }))
      .sort((a, b) => b.n - a.n)
      .find((x) => x.n > 0)?.d ?? ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  // The questions sheet: named "Questions", else the first sheet.
  const ws = wb.getWorksheet('Questions') ?? wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (r) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      const v = r.getCell(c).value;
      cells.push(cellText(v));
    }
    rows.push(cells);
  });
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  if ('richText' in v) return v.richText.map((t) => t.text).join('');
  if ('text' in v && typeof v.text === 'string') return v.text;
  // A formula: use its computed value.
  if ('result' in v) {
    const r = v.result;
    return r === undefined || r === null
      ? ''
      : r instanceof Date
        ? r.toISOString()
        : typeof r === 'object'
          ? ''
          : String(r);
  }
  return '';
}

/* ---------------------------------------------------------------- */

const truthy = (v: string) =>
  ['yes', 'y', 'true', '1', 'required', 'x'].includes(v.trim().toLowerCase());
const falsy = (v: string) =>
  ['', 'no', 'n', 'false', '0', 'optional'].includes(v.trim().toLowerCase());
const splitOptions = (v: string) =>
  v
    .split(/\s*[|\n]\s*/)
    .map((o) => o.trim())
    .filter(Boolean);

/**
 * Turns uploaded rows into questions, collecting every problem (with the
 * row number the author sees) instead of stopping at the first. Languages
 * come from the `question_xx` columns; English is the reference language
 * and must be present on every question.
 */
export function rowsToQuestions(rows: string[][]): ImportResult {
  const errors: ImportResult['errors'] = [];
  if (rows.length === 0) {
    return {
      languages: [],
      questions: [],
      errors: [{ row: 1, message: 'The file is empty' }],
    };
  }
  const header = rows[0].map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, '_'),
  );
  const col = (name: string) => header.indexOf(name);
  // "question" alone means English.
  const questionCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h === 'question' || /^question_[a-z]{2}$/.test(h))
    .map(({ h, i }) => ({ lang: h === 'question' ? 'en' : h.slice(9), i }));
  const languages = [...new Set(questionCols.map((q) => q.lang))];
  if (!languages.includes('en')) {
    errors.push({
      row: 1,
      message: 'Missing the question_en column (the English question text)',
    });
    return { languages, questions: [], errors };
  }
  const langCol = (prefix: string, lang: string) => {
    const i = col(`${prefix}_${lang}`);
    return i >= 0 ? i : lang === 'en' ? col(prefix) : -1;
  };

  const questions: ParsedQuestion[] = [];
  rows.slice(1).forEach((r, k) => {
    const rowNo = k + 2;
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
    const text: Record<string, string> = {};
    for (const { lang, i } of questionCols) if (get(i)) text[lang] = get(i);
    if (!text.en) {
      errors.push({
        row: rowNo,
        message: 'Question text (question_en) is empty',
      });
      return;
    }

    const rawType = get(col('type')).toLowerCase();
    const type = rawType
      ? (TYPE_ALIASES[rawType] ??
        (QUESTION_TYPES.includes(rawType.toUpperCase() as QuestionType)
          ? (rawType.toUpperCase() as QuestionType)
          : undefined))
      : 'OPEN';
    if (!type) {
      errors.push({
        row: rowNo,
        message: `Unknown type "${get(col('type'))}" (use open, single, multiple or scale)`,
      });
      return;
    }

    const optionsBy: Record<string, string[]> = {};
    for (const lang of languages) {
      const v = get(langCol('options', lang));
      if (v) optionsBy[lang] = splitOptions(v);
    }
    let options: Record<string, string>[] = [];
    if (type === 'SINGLE' || type === 'MULTIPLE') {
      const en = optionsBy.en ?? [];
      if (en.length < 2) {
        errors.push({
          row: rowNo,
          message:
            'Choice questions need at least two options in options_en, separated by |',
        });
        return;
      }
      for (const [lang, list] of Object.entries(optionsBy)) {
        if (lang !== 'en' && list.length !== en.length) {
          errors.push({
            row: rowNo,
            message: `options_${lang} has ${list.length} options but options_en has ${en.length}`,
          });
          return;
        }
      }
      options = en.map((_, i) =>
        Object.fromEntries(
          Object.entries(optionsBy).map(([lang, list]) => [lang, list[i]]),
        ),
      );
    }

    let scaleMin: number | undefined;
    let scaleMax: number | undefined;
    if (type === 'SCALE') {
      scaleMin =
        get(col('scale_min')) === '' ? 1 : Number(get(col('scale_min')));
      scaleMax =
        get(col('scale_max')) === '' ? 5 : Number(get(col('scale_max')));
      if (
        !Number.isInteger(scaleMin) ||
        !Number.isInteger(scaleMax) ||
        scaleMin >= scaleMax
      ) {
        errors.push({
          row: rowNo,
          message: 'Scale needs whole numbers with scale_min below scale_max',
        });
        return;
      }
    }

    const req = get(col('required'));
    if (!truthy(req) && !falsy(req)) {
      errors.push({
        row: rowNo,
        message: `required must be yes or no, not "${req}"`,
      });
      return;
    }

    const probes: Record<string, string> = {};
    for (const lang of languages) {
      const v = get(langCol('probes', lang));
      if (v) probes[lang] = v;
    }

    const orderRaw = get(col('order'));
    const order = orderRaw === '' ? rowNo - 1 : Number(orderRaw);
    if (!Number.isFinite(order)) {
      errors.push({
        row: rowNo,
        message: `order must be a number, not "${orderRaw}"`,
      });
      return;
    }

    questions.push({
      order,
      section: get(col('section')) || undefined,
      text,
      type,
      options,
      scaleMin,
      scaleMax,
      probes,
      required: truthy(req),
    });
  });

  if (questions.length === 0 && errors.length === 0) {
    errors.push({ row: 2, message: 'No questions found below the header row' });
  }
  // Renumber 1..n in the author's order.
  questions
    .sort((a, b) => a.order - b.order)
    .forEach((q, i) => (q.order = i + 1));
  return { languages, questions, errors };
}

export async function parseGuideFile(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.xlsx')) return rowsToQuestions(await parseXlsx(buffer));
  if (
    lower.endsWith('.csv') ||
    lower.endsWith('.tsv') ||
    lower.endsWith('.txt')
  ) {
    return rowsToQuestions(parseCsv(buffer.toString('utf8')));
  }
  return {
    languages: [],
    questions: [],
    errors: [{ row: 0, message: 'Upload a .csv or .xlsx file' }],
  };
}

/* ---------------------------------------------------------------- */

export function templateCsv(): string {
  const esc = (v: string) =>
    /[",\n|]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  return (
    '﻿' +
    [TEMPLATE_COLUMNS, ...EXAMPLE_ROWS]
      .map((r) => r.map(esc).join(','))
      .join('\r\n') +
    '\r\n'
  );
}

export async function templateXlsx(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Merline';
  const ws = wb.addWorksheet('Questions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({
    header: c,
    width: c.startsWith('question')
      ? 48
      : c.startsWith('options') || c.startsWith('probes')
        ? 36
        : 12,
  }));
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF012C76' },
    };
  });
  for (const r of EXAMPLE_ROWS)
    ws.addRow(r).eachCell(
      (c) => (c.alignment = { wrapText: true, vertical: 'top' }),
    );
  ws.getColumn(5).eachCell((c, n) => {
    if (n > 1)
      c.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"open,single,multiple,scale"'],
      };
  });
  const help = wb.addWorksheet('How to fill this in');
  help.columns = [{ width: 16 }, { width: 90 }];
  [
    [
      'order',
      'Position of the question (1, 2, 3…). Leave empty to keep row order.',
    ],
    ['section', 'Optional heading that groups questions, e.g. "Water access".'],
    ['question_en', 'Required. The question in English.'],
    [
      'question_ha',
      'The question in Hausa. Add question_xx columns for other languages (two-letter code).',
    ],
    ['type', 'open, single (one answer), multiple (several answers) or scale.'],
    [
      'options_en',
      'For single/multiple: answers separated by |, e.g. Yes | No | Not sure.',
    ],
    ['options_ha', 'The same answers in Hausa, in the same order and number.'],
    ['scale_min / scale_max', 'For scale questions, e.g. 1 and 5 (defaults).'],
    [
      'probes_en / probes_ha',
      'Optional notes for the interviewer: follow-up prompts.',
    ],
    ['required', 'yes or no.'],
  ].forEach((r) =>
    help
      .addRow(r)
      .eachCell((c) => (c.alignment = { wrapText: true, vertical: 'top' })),
  );
  help.getColumn(1).font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
