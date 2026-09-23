import { ServiceUnavailableException } from '@nestjs/common';
import type { ReportDocument } from '../report-document';
import { renderReportHtml } from './html';

/**
 * Renders the report to PDF with headless Chromium (playwright-core), so
 * the PDF has real typography: embedded brand fonts, running header and
 * page numbers, no page-broken quotations.
 */
export async function renderReportPdf(
  doc: ReportDocument,
  organizationName: string,
  chromiumPath?: string,
): Promise<Buffer> {
  let chromium: typeof import('playwright-core').chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    throw new ServiceUnavailableException(
      'PDF export is not available on this server',
    );
  }

  let browser: import('playwright-core').Browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(chromiumPath && { executablePath: chromiumPath }),
      args: ['--no-sandbox', '--font-render-hinting=none'],
    });
  } catch (err) {
    throw new ServiceUnavailableException(
      `PDF export needs Chromium on the server (set CHROMIUM_PATH): ${err instanceof Error ? err.message.split('\n')[0] : err}`,
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml(doc, organizationName), {
      waitUntil: 'load',
    });
    await page.evaluate(() => document.fonts.ready);
    // Running header, footer and page numbers come from CSS @page margin
    // boxes (html.ts), which the cover page can opt out of.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
