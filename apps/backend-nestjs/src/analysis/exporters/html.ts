import {
  ReportBlock,
  ReportDocument,
  formatTimestamp,
} from '../report-document';
import { BRAND, asset, longDate } from './brand';

/** Escapes text for a CSS string (page header/footer content). */
const cssString = (s: string) =>
  s.replace(/[\\"]/g, '\\$&').replace(/\n/g, ' ');

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function fontFace(
  family: string,
  file: string,
  weight: string,
  style = 'normal',
) {
  return `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${asset('fonts', file).toString('base64')}) format('truetype');font-weight:${weight};font-style:${style};}`;
}

function block(b: ReportBlock, doc: ReportDocument): string {
  switch (b.type) {
    case 'paragraph':
      return `<p>${esc(b.text)}</p>`;
    case 'bullets':
      return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'numbered':
      return `<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
    case 'callout':
      return `<div class="callout ${b.tone}">${esc(b.text)}</div>`;
    case 'facts':
      return `<dl class="facts">${b.items.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`;
    case 'table':
      return `<table><thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows
        .map(
          (r) =>
            `<tr>${r.map((c, i) => `<td${i === 0 && ['High', 'Medium', 'Low'].includes(c) ? ` class="prio ${c.toLowerCase()}"` : ''}>${esc(c)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody></table>`;
    case 'quote': {
      const q = doc.quotes[b.quoteId];
      if (!q) return '';
      return `<figure class="quote"><blockquote>“${esc(q.text)}”</blockquote><figcaption><span class="verbatim">Verbatim</span> ${esc(q.source)} · ${formatTimestamp(q.startMs)}${q.speaker ? ` · ${esc(q.speaker)}` : ''}</figcaption>${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}</figure>`;
    }
  }
}

/**
 * The report as a standalone, print-ready HTML page (fonts and logo
 * embedded): a navy cover, a contents page, then the sections. Rendered to
 * PDF by headless Chromium.
 */
export function renderReportHtml(
  doc: ReportDocument,
  organizationName: string,
): string {
  const logo = asset('brand', 'mark-dark-512.png').toString('base64');
  const c = BRAND;
  const toc = doc.sections
    .map(
      (s, i) =>
        `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><a href="#${s.id}">${esc(s.heading)}</a>${s.aiGenerated ? '<span class="ai-pill">AI analysis</span>' : ''}</li>`,
    )
    .join('');
  const sections = doc.sections
    .map(
      (s, i) => `<section id="${s.id}" class="${i === 0 ? 'first' : ''}">
  <header class="sh"><span class="num">${String(i + 1).padStart(2, '0')}</span><h2>${esc(s.heading)}</h2>${s.aiGenerated ? '<span class="ai-pill">AI analysis</span>' : ''}</header>
  ${s.blocks.map((b) => block(b, doc)).join('\n')}
</section>`,
    )
    .join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
${fontFace('Inter', 'Inter-Regular.ttf', '400')}
${fontFace('Inter', 'Inter-Italic.ttf', '400', 'italic')}
${fontFace('Inter', 'Inter-Medium.ttf', '500')}
${fontFace('Inter', 'Inter-SemiBold.ttf', '600')}
${fontFace('Inter', 'Inter-Bold.ttf', '700')}
${fontFace('Sora', 'Sora-Variable.ttf', '100 800')}
@page{size:A4;margin:22mm 20mm 22mm 20mm;
  @top-left{content:"Merline";font-family:Inter,sans-serif;font-size:7.5pt;font-weight:600;color:#${c.navy};}
  @top-right{content:"${cssString(doc.title)}";font-family:Inter,sans-serif;font-size:7.5pt;color:#${c.muted};}
  @bottom-left{content:"${cssString(organizationName)} · Confidential";font-family:Inter,sans-serif;font-size:7.5pt;color:#${c.muted};}
  @bottom-right{content:"Page " counter(page) " of " counter(pages);font-family:Inter,sans-serif;font-size:7.5pt;color:#${c.muted};}
}
@page:first{margin:0;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}
*{box-sizing:border-box;}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{margin:0;font-family:Inter,sans-serif;font-size:10.5pt;line-height:1.62;color:#${c.ink};font-feature-settings:"cv11","ss01";}
.cover{height:297mm;width:210mm;background:#${c.navy};color:#fff;position:relative;padding:28mm 22mm;page-break-after:always;overflow:hidden;}
.cover::after{content:"";position:absolute;right:-40mm;top:-30mm;width:150mm;height:150mm;border-radius:24mm;background:rgba(255,255,255,.04);transform:rotate(18deg);}
.cover .brand{display:flex;align-items:center;gap:10px;font-family:Sora,Inter,sans-serif;font-weight:600;font-size:15pt;letter-spacing:-.01em;}
.cover .brand img{width:34px;height:34px;}
.cover .kind{margin-top:58mm;display:inline-block;background:#${c.lemon};color:#${c.navyDeep};font-weight:600;font-size:9pt;letter-spacing:.14em;text-transform:uppercase;padding:5px 10px;border-radius:4px;}
.cover h1{font-family:Sora,Inter,sans-serif;font-weight:600;font-size:30pt;line-height:1.12;letter-spacing:-.02em;margin:14px 0 10px;max-width:160mm;}
.cover .subtitle{font-size:13pt;color:rgba(255,255,255,.78);max-width:150mm;}
.cover .accent{width:56px;height:4px;background:#${c.lemon};margin:22px 0;border-radius:2px;}
.cover dl{position:absolute;left:22mm;right:22mm;bottom:26mm;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px;margin:0;border-top:1px solid rgba(255,255,255,.18);padding-top:14px;}
.cover dt{font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6);}
.cover dd{margin:2px 0 0;font-size:9.5pt;color:#fff;}
.cover .foot{position:absolute;left:22mm;right:22mm;bottom:12mm;font-size:8pt;color:rgba(255,255,255,.55);display:flex;justify-content:space-between;}
.toc{page-break-after:always;}
.toc h2{font-family:Sora,Inter,sans-serif;}
*{font-synthesis:none;}
.toc h2{font-size:20pt;color:#${c.navy};margin:0 0 18px;letter-spacing:-.01em;}
.toc ol{list-style:none;padding:0;margin:0;}
.toc li{display:flex;align-items:baseline;gap:12px;padding:6px 0;border-bottom:1px solid #${c.line};font-size:10pt;}
.toc .n{font-variant-numeric:tabular-nums;color:#${c.muted};font-size:9pt;width:22px;}
.toc a{color:#${c.ink};text-decoration:none;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.disclosure{break-inside:avoid;margin-top:22px;font-size:8.5pt;color:#${c.muted};background:#${c.surface};border-radius:8px;padding:12px 14px;line-height:1.55;}
section{margin:0 0 20px;}
section+section{margin-top:26px;}
.sh{display:flex;align-items:center;gap:10px;border-bottom:2px solid #${c.navy};padding-bottom:6px;margin-bottom:12px;break-after:avoid;}
.sh .num{font-size:9pt;font-weight:600;color:#${c.navy};background:#${c.lemon};border-radius:4px;padding:2px 6px;font-variant-numeric:tabular-nums;}
.sh h2{font-family:Inter,sans-serif;font-size:14pt;font-weight:600;color:#${c.navy};margin:0;flex:1;letter-spacing:-.01em;line-height:1.3;}
.ai-pill{font-size:7pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#${c.navy};border:1px solid #${c.navy}33;border-radius:999px;padding:2px 7px;white-space:nowrap;}
p{margin:0 0 9px;orphans:3;widows:3;}
ul,ol{margin:0 0 10px;padding-left:18px;}
li{margin:0 0 4px;}
li::marker{color:#${c.navy};}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:0;border:1px solid #${c.line};border-radius:8px;overflow:hidden;}
.facts div{padding:10px 12px;border-right:1px solid #${c.line};border-bottom:1px solid #${c.line};}
.facts dt{font-size:7.5pt;letter-spacing:.1em;text-transform:uppercase;color:#${c.muted};}
.facts dd{margin:2px 0 0;font-weight:500;}
table{width:100%;border-collapse:collapse;margin:6px 0 12px;font-size:9pt;page-break-inside:auto;}
thead{display:table-header-group;}
tr{break-inside:avoid;}
th{background:#${c.navy};color:#fff;text-align:left;font-weight:600;padding:7px 9px;font-size:8.5pt;letter-spacing:.02em;}
td{padding:7px 9px;border-bottom:1px solid #${c.line};vertical-align:top;}
tbody tr:nth-child(even) td{background:#${c.surface};}
td.prio{font-weight:600;white-space:nowrap;}
td.prio.high{color:#B42318;} td.prio.medium{color:#${c.warning};} td.prio.low{color:#${c.lemonInk};}
.quote{margin:12px 0 14px;padding:10px 14px 10px 16px;border-left:3px solid #${c.lemon};background:#${c.surface};border-radius:0 8px 8px 0;break-inside:avoid;}
.quote blockquote{margin:0;font-size:11pt;line-height:1.55;color:#${c.navyDeep};font-style:italic;}
.quote figcaption{margin-top:6px;font-size:8pt;color:#${c.muted};}
.verbatim{font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#${c.lemonInk};margin-right:4px;}
.quote .note{margin:6px 0 0;font-size:9pt;color:#${c.ink};}
.callout{border-radius:8px;padding:9px 12px;margin:0 0 10px;font-size:9.5pt;}
.callout.info{background:#${c.infoBg};color:#${c.navyDeep};}
.callout.warning{background:#${c.warningBg};color:#${c.warning};}
</style></head><body>
<div class="cover">
  <div class="brand"><img src="data:image/png;base64,${logo}" alt=""/>Merline</div>
  <div class="kind">${esc(doc.kind)}</div>
  <h1>${esc(doc.title)}</h1>
  ${doc.subtitle ? `<div class="subtitle">${esc(doc.subtitle)}</div>` : ''}
  <div class="accent"></div>
  <dl>${doc.meta
    .filter((m) => m.label !== 'Requested')
    .slice(0, 6)
    .map((m) => `<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`)
    .join('')}</dl>
  <div class="foot"><span>${esc(organizationName)} · Confidential research material</span><span>${longDate(doc.generatedAt)}</span></div>
</div>
<div class="toc"><h2>Contents</h2><ol>${toc}</ol><div class="disclosure">${esc(doc.disclosure)}</div></div>
${sections}
</body></html>`;
}
