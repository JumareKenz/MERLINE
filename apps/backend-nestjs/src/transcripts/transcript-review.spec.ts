import {
  ADMIN_EDITABLE,
  APPROVABLE,
  ENUMERATOR_EDITABLE,
  EVIDENCE_STATUSES,
  isEvidence,
  REVIEW_STATUS_LABELS,
} from './review-status';
import {
  extractCues,
  normalizeCues,
  spokenText,
  STANDARD_CUES,
} from './non-verbal-cues';
import { diffSnapshots, snapshotSegments } from './revisions';

describe('review statuses', () => {
  it('treat only approved and locked transcripts as evidence', () => {
    const evidence = Object.keys(REVIEW_STATUS_LABELS).filter((s) =>
      isEvidence(s as never),
    );
    expect(evidence.sort()).toEqual(['APPROVED', 'LOCKED']);
    expect([...EVIDENCE_STATUSES].sort()).toEqual(['APPROVED', 'LOCKED']);
  });

  it('never let anyone edit an approved or locked transcript', () => {
    for (const list of [ENUMERATOR_EDITABLE, ADMIN_EDITABLE]) {
      expect(list).not.toContain('APPROVED');
      expect(list).not.toContain('LOCKED');
      expect(list).not.toContain('TRANSCRIPTION_PROCESSING');
      expect(list).not.toContain('RECORDING_SUBMITTED');
    }
    expect(APPROVABLE).not.toContain('APPROVED');
    expect(APPROVABLE).not.toContain('TRANSCRIPTION_PROCESSING');
  });

  it('keep the enumerator’s and the administrator’s hands apart', () => {
    // Once submitted, only the administrator edits; while with the enumerator, only they do.
    expect(ENUMERATOR_EDITABLE).not.toContain('SUBMITTED_FOR_ADMIN_REVIEW');
    expect(ADMIN_EDITABLE).not.toContain('ENUMERATOR_EDITING');
    expect(ADMIN_EDITABLE).not.toContain('RETURNED_FOR_CORRECTION');
  });
});

describe('non-verbal cues', () => {
  it('tidy spacing inside brackets', () => {
    expect(normalizeCues('He was [ crying ] then [pause]')).toBe(
      'He was [crying] then [pause]',
    );
    expect(normalizeCues('[overlapping speech]  yes')).toBe(
      '[overlapping speech]  yes',
    );
  });

  it('accept every standard cue', () => {
    for (const cue of STANDARD_CUES)
      expect(normalizeCues(`a [${cue}] b`)).toBe(`a [${cue}] b`);
  });

  it('refuse unbalanced or nested brackets', () => {
    for (const bad of ['a [pause', 'a pause]', '[a [b]]', ']['])
      expect(() => normalizeCues(bad)).toThrow(/Square brackets/);
  });

  it('separate what was said from what was annotated', () => {
    const text = 'We [laughs] cope somehow [inaudible] mostly.';
    expect(extractCues(text)).toEqual(['laughs', 'inaudible']);
    expect(spokenText(text)).toBe('We cope somehow mostly.');
  });
});

describe('revision diffs', () => {
  const seg = (index: number, over: Record<string, unknown> = {}) => ({
    index,
    startMs: index * 1000,
    endMs: index * 1000 + 900,
    speakerLabel: 'S1',
    editedSpeakerLabel: null,
    text: `machine ${index}`,
    editedText: null,
    confidence: 0.5,
    flagged: false,
    flagReason: null,
    reviewNote: null,
    ...over,
  });

  it('uses the corrected text and speaker, and reports only what changed', () => {
    const before = snapshotSegments([seg(0), seg(1), seg(2)] as never);
    const after = snapshotSegments([
      seg(0),
      seg(1, { editedText: 'human 1' }),
      seg(2, {
        editedSpeakerLabel: 'Respondent',
        flagged: true,
        flagReason: 'doubt',
      }),
    ] as never);
    const diffs = diffSnapshots(before, after);
    expect(diffs.map((d) => [d.index, d.changed])).toEqual([
      [1, ['text']],
      [2, ['speaker', 'flag']],
    ]);
    expect(diffs[0].before?.text).toBe('machine 1');
    expect(diffs[0].after?.text).toBe('human 1');
  });

  it('are empty for identical revisions', () => {
    const s = snapshotSegments([seg(0), seg(1)] as never);
    expect(diffSnapshots(s, s)).toEqual([]);
  });
});
