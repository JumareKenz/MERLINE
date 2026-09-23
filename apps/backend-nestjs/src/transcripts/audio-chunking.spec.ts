import {
  parseSilencedetect,
  planChunks,
  stitchSegments,
} from './audio-chunking';

describe('audio chunking', () => {
  describe('parseSilencedetect', () => {
    it('reads pauses and the decoded duration (not the header duration)', () => {
      const stderr = [
        '  Duration: N/A, start: 0.000000, bitrate: N/A',
        '[silencedetect @ 0x1] silence_start: 12.5',
        '[silencedetect @ 0x1] silence_end: 14.25 | silence_duration: 1.75',
        'size=N/A time=00:01:00.00 bitrate=N/A speed= 600x',
        '[silencedetect @ 0x1] silence_start: 118',
        'size=N/A time=00:02:03.40 bitrate=N/A speed= 610x',
      ].join('\n');

      const result = parseSilencedetect(stderr);
      expect(result.durationSec).toBeCloseTo(123.4);
      // A silence still open at the end of the file runs to the end.
      expect(result.silences).toEqual([
        { startSec: 12.5, endSec: 14.25 },
        { startSec: 118, endSec: 123.4 },
      ]);
      expect(result.silentFraction).toBeCloseTo((1.75 + 5.4) / 123.4);
    });

    it('falls back to the header duration when there is no progress line', () => {
      const result = parseSilencedetect('  Duration: 00:00:10.50, start: 0');
      expect(result.durationSec).toBeCloseTo(10.5);
      expect(result.silentFraction).toBe(0);
    });
  });

  describe('planChunks', () => {
    it('keeps a short recording whole', () => {
      expect(planChunks(700, [], 600)).toEqual([{ startSec: 0, endSec: 700 }]);
    });

    it('cuts in the middle of the pause nearest each boundary', () => {
      const chunks = planChunks(
        1500,
        [
          { startSec: 560, endSec: 562 }, // 39s before the 600s target
          { startSec: 610, endSec: 614 }, // 12s after: nearer, so chosen
          { startSec: 1195, endSec: 1199 },
        ],
        600,
      );
      expect(chunks).toEqual([
        { startSec: 0, endSec: 612 },
        { startSec: 612, endSec: 1197 },
        { startSec: 1197, endSec: 1500 },
      ]);
    });

    it('cuts at the target when no pause is close enough', () => {
      const chunks = planChunks(1300, [{ startSec: 100, endSec: 101 }], 600);
      expect(chunks).toEqual([
        { startSec: 0, endSec: 600 },
        { startSec: 600, endSec: 1300 },
      ]);
    });

    it('covers the whole recording with no gaps or overlaps', () => {
      const chunks = planChunks(5400, [], 600);
      expect(chunks[0].startSec).toBe(0);
      expect(chunks.at(-1)!.endSec).toBe(5400);
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i].startSec).toBe(chunks[i - 1].endSec);
      }
    });
  });

  describe('stitchSegments', () => {
    it('shifts each chunk by its start and clamps overshoot to the chunk end', () => {
      const out = stitchSegments([
        {
          chunk: { startSec: 0, endSec: 612 },
          segments: [
            { startMs: 0, endMs: 4000, text: 'a', confidence: 0.9 },
            { startMs: 608000, endMs: 615000, text: 'b', confidence: 0.8 },
          ],
        },
        {
          chunk: { startSec: 612, endSec: 900 },
          segments: [
            { startMs: 1500, endMs: 3000, text: 'c', confidence: null },
          ],
        },
      ]);
      expect(out.map((s) => [s.text, s.startMs, s.endMs])).toEqual([
        ['a', 0, 4000],
        ['b', 608000, 612000],
        ['c', 613500, 615000],
      ]);
    });
  });
});
