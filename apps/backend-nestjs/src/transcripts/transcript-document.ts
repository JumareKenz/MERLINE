import {
  ReportBlock,
  ReportDocument,
  ReportSection,
  formatTimestamp,
} from '../analysis/report-document';
import { extractCues } from './non-verbal-cues';
import { REVIEW_STATUS_LABELS } from './review-status';
import { segmentText } from './segment-text';
import { segmentSpeaker } from './revisions';

export interface TranscriptExportData {
  transcript: {
    id: string;
    reviewStatus: keyof typeof REVIEW_STATUS_LABELS;
    language: string | null;
    provider: string | null;
    model: string | null;
    durationMs: number | null;
    approvedAt: Date | null;
    approvedByName: string | null;
    revisionNumber: number | null;
  };
  interview: {
    type: string | null;
    typeLabel: string;
    location: string | null;
    startedAt: Date | null;
    enumeratorName: string | null;
    participantName: string;
    projectName: string | null;
  };
  languageName: string;
  segments: {
    index: number;
    startMs: number;
    text: string;
    editedText: string | null;
    speakerLabel: string | null;
    editedSpeakerLabel: string | null;
    flagged: boolean;
    flagReason: string | null;
  }[];
  now: Date;
}

const date = (d: Date | null) =>
  d
    ? d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'Not recorded';

export const TRANSCRIPT_DISCLOSURE =
  'This is a verbatim transcript of an audio recording. It keeps the speakers’ own wording, including repetitions, pauses and unfinished sentences, and has not been edited into polished prose. ' +
  'Text in [square brackets] is a reviewer’s note about the recording (for example [laughs] or [inaudible]), not something that was said. ' +
  'It is research material: handle it according to the participant’s consent and keep it confidential.';

/**
 * A transcript as a ReportDocument, so the branded Word and PDF exporters
 * render it. The words are exactly what the reviewers settled on
 * (segmentText); nothing is added, summarised or reworded. A transcript
 * that has not been approved says so on every page it can be read on.
 */
export function buildTranscriptDocument(
  d: TranscriptExportData,
): ReportDocument {
  const t = d.transcript;
  const approved = t.reviewStatus === 'APPROVED' || t.reviewStatus === 'LOCKED';
  const edited = d.segments.filter((s) => s.editedText != null).length;
  const flagged = d.segments.filter((s) => s.flagged).length;
  const speakers = [
    ...new Set(
      d.segments.map((s) => segmentSpeaker(s)).filter((x): x is string => !!x),
    ),
  ];
  const cues = new Set(d.segments.flatMap((s) => extractCues(segmentText(s))));

  const facts = [
    { label: 'Project', value: d.interview.projectName ?? 'No project' },
    { label: 'Interview type', value: d.interview.typeLabel },
    { label: 'Participant', value: d.interview.participantName },
    {
      label: 'Interviewer',
      value: d.interview.enumeratorName ?? 'Not recorded',
    },
    { label: 'Date', value: date(d.interview.startedAt) },
    { label: 'Location', value: d.interview.location || 'Not recorded' },
    { label: 'Language', value: d.languageName },
    {
      label: 'Recording length',
      value: t.durationMs ? formatTimestamp(t.durationMs) : 'Unknown',
    },
    {
      label: 'Status',
      value: approved
        ? `Approved${t.approvedAt ? ` ${date(t.approvedAt)}` : ''}${t.approvedByName ? ` by ${t.approvedByName}` : ''}`
        : `${REVIEW_STATUS_LABELS[t.reviewStatus]} (not approved)`,
    },
  ];

  const sections: ReportSection[] = [];
  const nonApproved: ReportBlock[] = approved
    ? []
    : [
        {
          type: 'callout',
          tone: 'warning',
          text: 'WORKING DRAFT. This transcript has not been approved. Its wording may still change and it must not be quoted or used as evidence.',
        },
      ];

  sections.push({
    id: 't1',
    heading: 'Interview details',
    aiGenerated: false,
    blocks: [...nonApproved, { type: 'facts', items: facts }],
  });

  const body: ReportBlock[] =
    d.segments.length === 0
      ? [
          {
            type: 'callout',
            tone: 'info',
            text: 'No speech was detected in this recording.',
          },
        ]
      : [...d.segments]
          .sort((a, b) => a.index - b.index)
          .map((s): ReportBlock => {
            const speaker = segmentSpeaker(s);
            const note = s.flagged
              ? ` [uncertain${s.flagReason ? `: ${s.flagReason}` : ''}]`
              : '';
            return {
              type: 'paragraph',
              label: [formatTimestamp(s.startMs), speaker]
                .filter(Boolean)
                .join(' · '),
              text: `${segmentText(s)}${note}`,
            };
          });
  sections.push({
    id: 't2',
    heading: 'Transcript',
    aiGenerated: false,
    blocks: body,
  });

  sections.push({
    id: 't3',
    heading: 'About this transcript',
    aiGenerated: false,
    blocks: [
      {
        type: 'bullets',
        items: [
          `Speech to text: ${t.provider ?? 'automatic transcription'}${t.model ? ` (${t.model})` : ''}. ${d.segments.length} passages${speakers.length ? `, ${speakers.length} speaker label${speakers.length === 1 ? '' : 's'} (${speakers.join(', ')})` : ''}.`,
          approved
            ? `Reviewed against the recording by the enumerator and approved by an administrator${t.revisionNumber ? ` (version ${t.revisionNumber})` : ''}. ${edited} passage${edited === 1 ? ' was' : 's were'} corrected from the machine text.`
            : `Review status: ${REVIEW_STATUS_LABELS[t.reviewStatus]}. ${edited} passage${edited === 1 ? ' has' : 's have'} been corrected so far.`,
          flagged > 0
            ? `${flagged} passage${flagged === 1 ? ' is' : 's are'} marked [uncertain]: the reviewer could not be sure of the words.`
            : 'No passage is marked uncertain.',
          cues.size
            ? `Non-verbal cues used: ${[...cues].map((c) => `[${c}]`).join(', ')}.`
            : 'No non-verbal cues were added.',
          `Timestamps (m:ss) give where each passage starts in the recording.`,
        ],
      },
    ],
  });

  return {
    kind: 'Interview transcript',
    title: `Transcript: ${d.interview.participantName}`,
    subtitle: `${d.interview.typeLabel}${d.interview.projectName ? ` · ${d.interview.projectName}` : ''}`,
    meta: facts,
    sections,
    quotes: {},
    disclosure: TRANSCRIPT_DISCLOSURE,
    generatedAt: d.now.toISOString(),
  };
}
