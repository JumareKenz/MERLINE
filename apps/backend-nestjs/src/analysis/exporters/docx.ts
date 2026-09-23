import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  ReportBlock,
  ReportDocument,
  formatTimestamp,
} from '../report-document';
import { BRAND, asset, longDate } from './brand';

const FONT = 'Inter';
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const THIN = { style: BorderStyle.SINGLE, size: 4, color: BRAND.line };

function run(
  text: string,
  opts: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {},
) {
  return new TextRun({ text, font: FONT, ...opts });
}

function cell(text: string, header: boolean, width: number, shaded = false) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: header
      ? { type: ShadingType.CLEAR, fill: BRAND.navy, color: 'auto' }
      : shaded
        ? { type: ShadingType.CLEAR, fill: BRAND.surface, color: 'auto' }
        : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    borders: { top: THIN, bottom: THIN, left: THIN, right: THIN },
    children: [
      new Paragraph({
        spacing: { after: 0, line: 276 },
        children: [
          run(text, {
            size: header ? 17 : 18,
            bold: header,
            color: header ? 'FFFFFF' : BRAND.ink,
          }),
        ],
      }),
    ],
  });
}

function table(columns: string[], rows: string[][]) {
  const width = Math.floor(100 / columns.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [
      new TableRow({
        tableHeader: true,
        children: columns.map((c) => cell(c, true, width)),
      }),
      ...rows.map(
        (r, i) =>
          new TableRow({
            cantSplit: true,
            children: r.map((c) => cell(c, false, width, i % 2 === 1)),
          }),
      ),
    ],
  });
}

function blocks(b: ReportBlock, doc: ReportDocument): (Paragraph | Table)[] {
  switch (b.type) {
    case 'paragraph':
      return [
        new Paragraph({
          spacing: { after: 140, line: 312 },
          children: [run(b.text, { size: 21 })],
        }),
      ];
    case 'bullets':
      return b.items.map(
        (i) =>
          new Paragraph({
            numbering: { reference: 'bullets', level: 0 },
            spacing: { after: 70, line: 300 },
            children: [run(i, { size: 21 })],
          }),
      );
    case 'numbered':
      return b.items.map(
        (i) =>
          new Paragraph({
            numbering: { reference: 'numbers', level: 0 },
            spacing: { after: 70, line: 300 },
            children: [run(i, { size: 21 })],
          }),
      );
    case 'callout':
      return [
        new Paragraph({
          shading: {
            type: ShadingType.CLEAR,
            fill: b.tone === 'warning' ? BRAND.warningBg : BRAND.infoBg,
            color: 'auto',
          },
          spacing: { before: 60, after: 160, line: 290 },
          indent: { left: 120, right: 120 },
          children: [
            run(b.text, {
              size: 19,
              color: b.tone === 'warning' ? BRAND.warning : BRAND.navyDeep,
            }),
          ],
        }),
      ];
    case 'facts':
      return [
        table(
          ['Detail', 'Value'],
          b.items.map((f) => [f.label, f.value]),
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];
    case 'table':
      return [
        table(b.columns, b.rows),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];
    case 'quote': {
      const q = doc.quotes[b.quoteId];
      if (!q) return [];
      const border = {
        left: {
          style: BorderStyle.SINGLE,
          size: 24,
          color: BRAND.lemon,
          space: 10,
        },
      };
      return [
        new Paragraph({
          border,
          shading: {
            type: ShadingType.CLEAR,
            fill: BRAND.surface,
            color: 'auto',
          },
          indent: { left: 240, right: 240 },
          spacing: { before: 120, after: 0, line: 300 },
          children: [
            run(`“${q.text}”`, {
              italics: true,
              size: 22,
              color: BRAND.navyDeep,
            }),
          ],
        }),
        new Paragraph({
          border,
          shading: {
            type: ShadingType.CLEAR,
            fill: BRAND.surface,
            color: 'auto',
          },
          indent: { left: 240, right: 240 },
          spacing: { after: b.note ? 0 : 180 },
          children: [
            run('VERBATIM  ', {
              bold: true,
              size: 15,
              color: BRAND.lemonInk,
              characterSpacing: 20,
            }),
            run(
              `${q.source} · ${formatTimestamp(q.startMs)}${q.speaker ? ` · ${q.speaker}` : ''}`,
              { size: 16, color: BRAND.muted },
            ),
          ],
        }),
        ...(b.note
          ? [
              new Paragraph({
                indent: { left: 240, right: 240 },
                spacing: { before: 60, after: 180 },
                children: [run(b.note, { size: 19, color: BRAND.ink })],
              }),
            ]
          : []),
      ];
    }
  }
}

/** The report as a branded Word document (fonts embedded). */
export async function renderReportDocx(
  doc: ReportDocument,
  organizationName: string,
): Promise<Buffer> {
  const markLight = asset('brand', 'mark-dark-512.png');
  const mark = asset('brand', 'mark-512.png');

  // Cover: a full-width navy block built from a one-cell table.
  const cover = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 13600, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            shading: {
              type: ShadingType.CLEAR,
              fill: BRAND.navy,
              color: 'auto',
            },
            borders: NO_BORDERS,
            margins: { top: 700, bottom: 500, left: 700, right: 700 },
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    type: 'png',
                    data: markLight,
                    transformation: { width: 34, height: 34 },
                  }),
                  run('  Merline', { color: 'FFFFFF', size: 30, bold: true }),
                ],
              }),
              new Paragraph({ spacing: { before: 3600 }, children: [] }),
              new Paragraph({
                shading: {
                  type: ShadingType.CLEAR,
                  fill: BRAND.lemon,
                  color: 'auto',
                },
                spacing: { after: 240 },
                children: [
                  run(` ${doc.kind.toUpperCase()} `, {
                    bold: true,
                    size: 17,
                    color: BRAND.navyDeep,
                    characterSpacing: 40,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 200, line: 264 },
                children: [
                  run(doc.title, { color: 'FFFFFF', size: 56, bold: true }),
                ],
              }),
              ...(doc.subtitle
                ? [
                    new Paragraph({
                      spacing: { after: 600 },
                      children: [
                        run(doc.subtitle, { color: 'C9D3E6', size: 26 }),
                      ],
                    }),
                  ]
                : []),
              ...doc.meta
                .filter((m) => m.label !== 'Requested')
                .slice(0, 6)
                .map(
                  (m) =>
                    new Paragraph({
                      spacing: { after: 60 },
                      children: [
                        run(`${m.label.toUpperCase()}   `, {
                          size: 15,
                          color: '9FB0CF',
                          characterSpacing: 20,
                        }),
                        run(m.value, { size: 19, color: 'FFFFFF' }),
                      ],
                    }),
                ),
              new Paragraph({
                spacing: { before: 700 },
                children: [
                  run(
                    `${organizationName} · Confidential research material · ${longDate(doc.generatedAt)}`,
                    { size: 16, color: '9FB0CF' },
                  ),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const body: (Paragraph | Table)[] = [
    cover,
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [run('Contents')],
    }),
    ...doc.sections.map(
      (s, i) =>
        new Paragraph({
          spacing: { after: 80 },
          border: { bottom: THIN },
          children: [
            run(`${String(i + 1).padStart(2, '0')}   `, {
              color: BRAND.muted,
              size: 18,
            }),
            run(s.heading, { size: 21 }),
            ...(s.aiGenerated
              ? [
                  run('   AI ANALYSIS', {
                    size: 14,
                    color: BRAND.navy,
                    bold: true,
                    characterSpacing: 20,
                  }),
                ]
              : []),
          ],
        }),
    ),
    new Paragraph({
      spacing: { before: 300 },
      shading: { type: ShadingType.CLEAR, fill: BRAND.surface, color: 'auto' },
      children: [run(doc.disclosure, { size: 17, color: BRAND.muted })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  doc.sections.forEach((s, i) => {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 12,
            color: BRAND.navy,
            space: 4,
          },
        },
        children: [
          run(` ${String(i + 1).padStart(2, '0')} `, {
            shading: {
              type: ShadingType.CLEAR,
              fill: BRAND.lemon,
              color: 'auto',
            },
            size: 20,
            color: BRAND.navyDeep,
          }),
          run(`  ${s.heading}`),
          ...(s.aiGenerated
            ? [
                run('   AI ANALYSIS', {
                  size: 14,
                  color: BRAND.navy,
                  bold: true,
                  characterSpacing: 20,
                }),
              ]
            : []),
        ],
      }),
    );
    for (const b of s.blocks) body.push(...blocks(b, doc));
  });

  const document = new Document({
    creator: 'Merline',
    title: doc.title,
    description: doc.kind,
    fonts: [
      {
        name: FONT,
        data: asset('fonts', 'Inter-Regular.ttf'),
      },
    ],
    styles: {
      default: {
        document: { run: { font: FONT, size: 21, color: BRAND.ink } },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: 30, bold: true, color: BRAND.navy },
          paragraph: { spacing: { before: 480, after: 220 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 400, hanging: 260 } },
                run: { color: BRAND.navy },
              },
            },
          ],
        },
        {
          reference: 'numbers',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1300, bottom: 1300, left: 1250, right: 1250 },
          },
          titlePage: true,
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    type: 'png',
                    data: mark,
                    transformation: { width: 14, height: 14 },
                  }),
                  run('  Merline', { bold: true, size: 16, color: BRAND.navy }),
                  run(`   ${doc.title}`, { size: 16, color: BRAND.muted }),
                ],
              }),
            ],
          }),
          first: new Header({ children: [new Paragraph({ children: [] })] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  run(`${organizationName} · Confidential    Page `, {
                    size: 15,
                    color: BRAND.muted,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: 15,
                    color: BRAND.muted,
                  }),
                  run(' of ', { size: 15, color: BRAND.muted }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 15,
                    color: BRAND.muted,
                  }),
                ],
              }),
            ],
          }),
          first: new Footer({ children: [new Paragraph({ children: [] })] }),
        },
        children: body,
      },
    ],
  });
  return Packer.toBuffer(document);
}
