import {
  buildTranscriptDocument,
  TranscriptExportData,
} from './transcript-document';
import { renderReportHtml } from '../analysis/exporters/html';
import { renderReportDocx } from '../analysis/exporters/docx';

const base = (
  over: Partial<TranscriptExportData['transcript']> = {},
): TranscriptExportData => ({
  transcript: {
    id: 't1',
    reviewStatus: 'APPROVED',
    language: 'ha',
    provider: 'gemini',
    model: 'gemini-3.5-transcribe',
    durationMs: 125_000,
    approvedAt: new Date('2026-09-30T10:00:00Z'),
    approvedByName: 'Ada Admin',
    revisionNumber: 4,
    ...over,
  },
  interview: {
    type: 'FGD',
    typeLabel: 'Focus group discussion',
    location: 'Garun Mallam',
    startedAt: new Date('2026-09-29T08:00:00Z'),
    enumeratorName: 'Amina Yusuf',
    participantName: 'Women’s group 2',
    projectName: 'Maternal health',
  },
  languageName: 'Hausa',
  segments: [
    {
      index: 1,
      startMs: 65_000,
      text: 'Mun gode.',
      editedText: null,
      speakerLabel: 'Speaker 2',
      editedSpeakerLabel: null,
      flagged: false,
      flagReason: null,
    },
    {
      index: 0,
      startMs: 4_000,
      text: 'Ruwan sha ya yi mana wuya.',
      editedText: 'Ruwan sha ya yi mana wahala [pause] sosai.',
      speakerLabel: 'Speaker 1',
      editedSpeakerLabel: 'Respondent',
      flagged: false,
      flagReason: null,
    },
    {
      index: 2,
      startMs: 90_000,
      text: 'Ban ji ba.',
      editedText: null,
      speakerLabel: null,
      editedSpeakerLabel: null,
      flagged: true,
      flagReason: 'muffled',
    },
  ],
  now: new Date('2026-10-02T12:00:00Z'),
});

describe('transcript document', () => {
  it('uses the reviewed wording and speaker, in order, with timestamps, and never the machine text where it was corrected', () => {
    const doc = buildTranscriptDocument(base());
    const body = doc.sections.find((s) => s.heading === 'Transcript')!;
    expect(body.blocks).toEqual([
      {
        type: 'paragraph',
        label: '0:04 · Respondent',
        text: 'Ruwan sha ya yi mana wahala [pause] sosai.',
      },
      { type: 'paragraph', label: '1:05 · Speaker 2', text: 'Mun gode.' },
      {
        type: 'paragraph',
        label: '1:30',
        text: 'Ban ji ba. [uncertain: muffled]',
      },
    ]);
    expect(JSON.stringify(doc)).not.toContain('wuya');
  });

  it('states the facts an administrator would cite', () => {
    const doc = buildTranscriptDocument(base());
    expect(doc.kind).toBe('Interview transcript');
    expect(doc.title).toBe('Transcript: Women’s group 2');
    const facts = doc.meta.map((m) => `${m.label}: ${m.value}`);
    expect(facts).toEqual(
      expect.arrayContaining([
        'Interview type: Focus group discussion',
        'Interviewer: Amina Yusuf',
        'Language: Hausa',
        'Recording length: 2:05',
        'Status: Approved 30 September 2026 by Ada Admin',
      ]),
    );
    const notes = JSON.stringify(
      doc.sections.find((s) => s.heading === 'About this transcript'),
    );
    expect(notes).toMatch(/version 4/);
    expect(notes).toMatch(/1 passage is marked \[uncertain\]/);
    expect(notes).toMatch(/\[pause\]/);
  });

  it('marks a transcript that is not approved as a working draft', () => {
    const doc = buildTranscriptDocument(
      base({
        reviewStatus: 'SUBMITTED_FOR_ADMIN_REVIEW',
        approvedAt: null,
        approvedByName: null,
        revisionNumber: null,
      }),
    );
    const first = JSON.stringify(doc.sections[0]);
    expect(first).toMatch(/WORKING DRAFT/);
    expect(first).toMatch(/must not be quoted/);
    expect(doc.meta.find((m) => m.label === 'Status')!.value).toMatch(
      /not approved/,
    );
    expect(
      JSON.stringify(buildTranscriptDocument(base()).sections[0]),
    ).not.toMatch(/WORKING DRAFT/);
  });

  it('handles a recording with no speech', () => {
    const d = base();
    d.segments = [];
    expect(JSON.stringify(buildTranscriptDocument(d))).toMatch(
      /No speech was detected/,
    );
  });

  it('renders to branded HTML (for PDF) and to a Word file, escaping content', async () => {
    const d = base();
    d.interview.participantName = 'A <b> & "c"';
    const doc = buildTranscriptDocument(d);
    const html = renderReportHtml(doc, 'JAZE');
    expect(html).toContain('A &lt;b&gt; &amp; &quot;c&quot;');
    expect(html).toContain('Interview transcript');
    expect(html).toContain('Ruwan sha ya yi mana wahala');
    expect(html).not.toContain('AI analysis');
    expect(
      (await renderReportDocx(doc, 'JAZE')).subarray(0, 2).toString(),
    ).toBe('PK');
  });
});
