import ExcelJS from 'exceljs';

/**
 * Merline is a qualitative platform: every question is answered out loud,
 * in the respondent's own words. Guides have no multiple-choice, checkbox
 * or rating-scale questions, and none may be created or uploaded.
 * (Guides made before this rule may still hold such questions in the
 * database; they are kept as history but always shown and asked as open
 * questions, and editing one turns them into open questions.)
 */
export const QUESTION_TYPES = ['OPEN'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const OPEN_ONLY_MESSAGE =
  'Merline guides are open-ended: questions are answered out loud, in the respondent’s own words. Multiple-choice, checkbox and rating questions are not supported';

/** One question as stored: text and probes keyed by language. */
export interface ParsedQuestion {
  order: number;
  section?: string;
  text: Record<string, string>;
  type: QuestionType;
  probes: Record<string, string>;
  required: boolean;
}

export interface ImportResult {
  languages: string[];
  questions: ParsedQuestion[];
  /** Row numbers are as the author sees them (header is row 1). */
  errors: { row: number; message: string }[];
}

/** What a `type` cell may say. Blank means open. */
const OPEN_TYPES = new Set(['open', 'open-ended', 'open ended', 'text']);
/** Types an older template offered: refused, with a message that says why. */
const CLOSED_TYPES = new Set([
  'single',
  'single choice',
  'single-choice',
  'radio',
  'multiple',
  'multiple choice',
  'multiple-choice',
  'checkbox',
  'scale',
  'rating',
  'likert',
]);

/** Columns of the template, in order. `_xx` columns repeat per language. */
export const TEMPLATE_COLUMNS = [
  'order',
  'section',
  'question_en',
  'question_ha',
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
    'Ask how long they have held the role.',
    'Tambayi tsawon lokacin da ya riƙe matsayin.',
    'yes',
  ],
  [
    '2',
    'Water access',
    'How does your household get its drinking water, and how has that changed over the years?',
    'Yaya gidanku ke samun ruwan sha, kuma yaya hakan ya canza cikin shekaru?',
    'Ask about the source, the distance and who fetches it.',
    'Tambayi tushen ruwan, nisan wurin da wanda ke ɗebo shi.',
    'yes',
  ],
  [
    '3',
    'Water access',
    'What would you change about the water supply, and why?',
    'Me za ka canza game da samar da ruwa, kuma me ya sa?',
    '',
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

    // Older templates had type, options and scale columns. A file that
    // still fills them in is refused (with the row), never quietly turned
    // into something the author did not write.
    const rawType = get(col('type')).toLowerCase();
    if (rawType && !OPEN_TYPES.has(rawType)) {
      errors.push({
        row: rowNo,
        message: CLOSED_TYPES.has(rawType)
          ? `${OPEN_ONLY_MESSAGE}. Ask "${text.en.slice(0, 60)}${text.en.length > 60 ? '…' : ''}" as an open question: set the type to open (or delete the type column) and leave the options empty`
          : `Unknown type "${get(col('type'))}". Only open questions are supported: use open, or delete the type column`,
      });
      return;
    }
    const hasOptions = header.some(
      (h, i) => (h === 'options' || /^options_[a-z]{2}$/.test(h)) && get(i),
    );
    if (hasOptions) {
      errors.push({
        row: rowNo,
        message: `${OPEN_ONLY_MESSAGE}. Remove the answer options from this row (the options_ columns must be empty)`,
      });
      return;
    }
    if (get(col('scale_min')) || get(col('scale_max'))) {
      errors.push({
        row: rowNo,
        message: `${OPEN_ONLY_MESSAGE}. Remove the scale values from this row (scale_min and scale_max must be empty)`,
      });
      return;
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
      type: 'OPEN',
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
    width: c.startsWith('question') ? 48 : c.startsWith('probes') ? 36 : 12,
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
  const help = wb.addWorksheet('How to fill this in');
  help.columns = [{ width: 16 }, { width: 90 }];
  [
    [
      'order',
      'Position of the question (1, 2, 3…). Leave empty to keep row order.',
    ],
    ['section', 'Optional heading that groups questions, e.g. "Water access".'],
    [
      'question_en',
      'Required. The question in English. Merline interviews are open-ended: write each question so it is answered out loud, in the respondent’s own words (no multiple choice, options or rating scales).',
    ],
    [
      'question_ha',
      'The question in Hausa. Add question_xx columns for other languages (two-letter code).',
    ],
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
