import type { TranscriptSegment } from '@prisma/client';
import { segmentText } from './segment-text';

/** One segment as frozen in a TranscriptRevision. */
export interface SegmentSnapshot {
  index: number;
  startMs: number;
  endMs: number;
  speaker: string | null;
  text: string;
  confidence: number | null;
  flagged: boolean;
  flagReason: string | null;
  note: string | null;
}

export function segmentSpeaker(s: {
  speakerLabel: string | null;
  editedSpeakerLabel?: string | null;
}): string | null {
  return s.editedSpeakerLabel ?? s.speakerLabel;
}

export function snapshotSegments(
  segments: Pick<
    TranscriptSegment,
    | 'index'
    | 'startMs'
    | 'endMs'
    | 'speakerLabel'
    | 'editedSpeakerLabel'
    | 'text'
    | 'editedText'
    | 'confidence'
    | 'flagged'
    | 'flagReason'
    | 'reviewNote'
  >[],
): SegmentSnapshot[] {
  return [...segments]
    .sort((a, b) => a.index - b.index)
    .map((s) => ({
      index: s.index,
      startMs: s.startMs,
      endMs: s.endMs,
      speaker: segmentSpeaker(s),
      text: segmentText(s),
      confidence: s.confidence,
      flagged: s.flagged,
      flagReason: s.flagReason,
      note: s.reviewNote,
    }));
}

export interface SegmentDiff {
  index: number;
  startMs: number;
  endMs: number;
  before: SegmentSnapshot | null;
  after: SegmentSnapshot | null;
  changed: ('text' | 'speaker' | 'flag' | 'note')[];
}

/** Segment-level differences between two revisions (unchanged segments are omitted). */
export function diffSnapshots(
  from: SegmentSnapshot[],
  to: SegmentSnapshot[],
): SegmentDiff[] {
  const a = new Map(from.map((s) => [s.index, s]));
  const b = new Map(to.map((s) => [s.index, s]));
  const out: SegmentDiff[] = [];
  for (const index of [...new Set([...a.keys(), ...b.keys()])].sort(
    (x, y) => x - y,
  )) {
    const before = a.get(index) ?? null;
    const after = b.get(index) ?? null;
    const changed: SegmentDiff['changed'] = [];
    if (before?.text !== after?.text) changed.push('text');
    if (before?.speaker !== after?.speaker) changed.push('speaker');
    if (
      before?.flagged !== after?.flagged ||
      (before?.flagReason ?? null) !== (after?.flagReason ?? null)
    )
      changed.push('flag');
    if ((before?.note ?? null) !== (after?.note ?? null)) changed.push('note');
    if (changed.length) {
      const ref = after ?? before!;
      out.push({
        index,
        startMs: ref.startMs,
        endMs: ref.endMs,
        before,
        after,
        changed,
      });
    }
  }
  return out;
}

export function sameSnapshot(
  a: SegmentSnapshot[],
  b: SegmentSnapshot[],
): boolean {
  return diffSnapshots(a, b).length === 0;
}
