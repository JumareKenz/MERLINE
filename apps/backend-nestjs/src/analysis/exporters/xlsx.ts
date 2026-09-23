import ExcelJS from 'exceljs';
import {
  ReportDocument,
  formatTimestamp,
  quotesInOrder,
} from '../report-document';
import { BRAND, asset, longDate } from './brand';

const argb = (hex: string) => `FF${hex}`;
const HEADER: Partial<ExcelJS.Style> = {
  font: { name: 'Inter', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: argb(BRAND.navy) },
  },
  alignment: { vertical: 'middle', wrapText: true },
};
const BODY_FONT: Partial<ExcelJS.Font> = {
  name: 'Inter',
  size: 10,
  color: { argb: argb(BRAND.ink) },
};

function sheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: { header: string; width: number }[],
  rows: (string | number)[][],
) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: argb(BRAND.navy) } },
  });
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }));
  ws.getRow(1).height = 24;
  ws.getRow(1).eachCell((cell) => Object.assign(cell, { style: HEADER }));
  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    row.eachCell((cell) => {
      cell.font = BODY_FONT;
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: argb(BRAND.line) } },
      };
      if (i % 2 === 1)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: argb(BRAND.surface) },
        };
    });
  });
  if (rows.length)
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
  return ws;
}

/**
 * The report as a workbook: a branded summary sheet, then one sheet per
 * table-shaped part (sections, quotations with timestamps, and every table
 * in the report), filterable and frozen at the header.
 */
export async function renderReportXlsx(
  doc: ReportDocument,
  organizationName: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Merline';
  wb.title = doc.title;
  wb.created = new Date(doc.generatedAt);

  // Summary sheet with a title band.
  const ws = wb.addWorksheet('Summary', {
    properties: { tabColor: { argb: argb(BRAND.lemon) } },
    views: [{ showGridLines: false }],
  });
  ws.columns = [{ width: 4 }, { width: 26 }, { width: 90 }];
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 3; c++) {
      ws.getCell(r, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: argb(BRAND.navy) },
      };
    }
  }
  const logo = wb.addImage({
    buffer: asset('brand', 'mark-dark-512.png') as unknown as ExcelJS.Buffer,
    extension: 'png',
  });
  ws.addImage(logo, {
    tl: { col: 1, row: 0.35 },
    ext: { width: 30, height: 30 },
  });
  ws.getCell('C1').value = 'Merline';
  ws.getCell('C1').font = {
    name: 'Inter',
    bold: true,
    size: 12,
    color: { argb: 'FFFFFFFF' },
  };
  ws.getCell('B3').value = doc.kind.toUpperCase();
  ws.getCell('B3').font = {
    name: 'Inter',
    bold: true,
    size: 9,
    color: { argb: argb(BRAND.lemon) },
  };
  ws.getCell('B4').value = doc.title;
  ws.getCell('B4').font = {
    name: 'Inter',
    bold: true,
    size: 18,
    color: { argb: 'FFFFFFFF' },
  };
  ws.getRow(4).height = 30;
  ws.getCell('B5').value =
    `${doc.subtitle ?? ''}   ·   ${organizationName}   ·   ${longDate(doc.generatedAt)}`;
  ws.getCell('B5').font = {
    name: 'Inter',
    size: 10,
    color: { argb: 'FFC9D3E6' },
  };
  for (let c = 1; c <= 3; c++)
    ws.getCell(6, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb(BRAND.lemon) },
    };
  ws.getRow(6).height = 4;

  let r = 8;
  for (const m of doc.meta) {
    ws.getCell(r, 2).value = m.label;
    ws.getCell(r, 2).font = {
      name: 'Inter',
      size: 9,
      bold: true,
      color: { argb: argb(BRAND.muted) },
    };
    ws.getCell(r, 3).value = m.value;
    ws.getCell(r, 3).font = BODY_FONT;
    ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' };
    r++;
  }
  const summary =
    doc.sections.find((s) => s.heading === 'Executive summary') ??
    doc.sections.find((s) => s.aiGenerated);
  if (summary) {
    r++;
    ws.getCell(r, 2).value = summary.heading;
    ws.getCell(r, 2).font = {
      name: 'Inter',
      size: 12,
      bold: true,
      color: { argb: argb(BRAND.navy) },
    };
    r++;
    for (const b of summary.blocks) {
      if (b.type !== 'paragraph') continue;
      ws.mergeCells(r, 2, r, 3);
      ws.getCell(r, 2).value = b.text;
      ws.getCell(r, 2).font = BODY_FONT;
      ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(r).height = Math.min(
        400,
        15 * Math.ceil(b.text.length / 105) + 6,
      );
      r++;
    }
  }
  r++;
  ws.mergeCells(r, 2, r, 3);
  ws.getCell(r, 2).value = doc.disclosure;
  ws.getCell(r, 2).font = {
    name: 'Inter',
    size: 8,
    italic: true,
    color: { argb: argb(BRAND.muted) },
  };
  ws.getCell(r, 2).alignment = { wrapText: true };
  ws.getRow(r).height = 40;

  // Every section as text rows.
  sheet(
    wb,
    'Report',
    [
      { header: 'No.', width: 6 },
      { header: 'Section', width: 34 },
      { header: 'Content', width: 110 },
      { header: 'Source', width: 14 },
    ],
    doc.sections.flatMap((s, i) =>
      s.blocks.flatMap((b): (string | number)[][] => {
        const src = s.aiGenerated ? 'AI analysis' : 'Record';
        switch (b.type) {
          case 'paragraph':
          case 'callout':
            return [[i + 1, s.heading, b.text, src]];
          case 'bullets':
          case 'numbered':
            return b.items.map((t) => [i + 1, s.heading, `• ${t}`, src]);
          case 'facts':
            return b.items.map((f) => [
              i + 1,
              s.heading,
              `${f.label}: ${f.value}`,
              'Record',
            ]);
          case 'quote': {
            const q = doc.quotes[b.quoteId];
            return q
              ? [
                  [
                    i + 1,
                    s.heading,
                    `“${q.text}” — ${q.source}, ${formatTimestamp(q.startMs)}`,
                    'Verbatim',
                  ],
                ]
              : [];
          }
          case 'table':
            return b.rows.map((row) => [
              i + 1,
              s.heading,
              row.join(' | '),
              src,
            ]);
        }
      }),
    ),
  );

  const quotes = quotesInOrder(doc);
  if (quotes.length) {
    sheet(
      wb,
      'Quotations',
      [
        { header: 'Id', width: 10 },
        { header: 'Quotation (verbatim)', width: 90 },
        { header: 'Interview', width: 40 },
        { header: 'Time', width: 10 },
      ],
      quotes.map((q) => [q.id, q.text, q.source, formatTimestamp(q.startMs)]),
    );
  }

  // Each table in the report becomes its own sheet (recommendations, interviews…).
  const names = new Set(wb.worksheets.map((w) => w.name));
  for (const s of doc.sections) {
    for (const b of s.blocks) {
      if (b.type !== 'table') continue;
      let name = s.heading.replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Table';
      while (names.has(name)) name = `${name.slice(0, 26)} ${names.size}`;
      names.add(name);
      sheet(
        wb,
        name,
        b.columns.map((c) => ({
          header: c,
          width: Math.max(
            12,
            Math.min(
              70,
              Math.max(
                c.length,
                ...b.rows.map((row) => row[b.columns.indexOf(c)]?.length ?? 0),
              ) * 0.9,
            ),
          ),
        })),
        b.rows,
      );
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
