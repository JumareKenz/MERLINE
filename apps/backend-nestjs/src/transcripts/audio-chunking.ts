import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

export interface Silence {
  startSec: number;
  endSec: number;
}

export interface AudioAnalysis {
  durationSec: number;
  silences: Silence[];
  /** Share of the recording that is silence, 0–1. */
  silentFraction: number;
}

export interface ChunkPlan {
  startSec: number;
  endSec: number;
}

/**
 * Decodes the file once with ffmpeg's `silencedetect` filter. One pass
 * gives both the duration (browser-recorded WebM often has none in its
 * header, so ffprobe cannot be relied on) and the pauses to cut at.
 */
export async function analyseAudio(
  ffmpegPath: string,
  filePath: string,
): Promise<AudioAnalysis> {
  const { stderr } = await run(
    ffmpegPath,
    [
      '-hide_banner',
      '-nostats',
      '-i',
      filePath,
      '-af',
      'silencedetect=noise=-35dB:d=0.4',
      '-f',
      'null',
      '-',
    ],
    { maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60_000 },
  );
  return parseSilencedetect(stderr);
}

/** Parses ffmpeg's silencedetect/progress output. Exported for tests. */
export function parseSilencedetect(stderr: string): AudioAnalysis {
  const silences: Silence[] = [];
  let open: number | null = null;
  for (const line of stderr.split('\n')) {
    const start = line.match(/silence_start: (-?[\d.]+)/);
    if (start) open = Math.max(0, parseFloat(start[1]));
    const end = line.match(/silence_end: ([\d.]+)/);
    if (end && open !== null) {
      silences.push({ startSec: open, endSec: parseFloat(end[1]) });
      open = null;
    }
  }

  // The last "time=" is how far decoding got, i.e. the real duration.
  let durationSec = 0;
  for (const m of stderr.matchAll(/time=(\d+):(\d+):([\d.]+)/g)) {
    durationSec = +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
  }
  if (durationSec === 0) {
    const d = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (d) durationSec = +d[1] * 3600 + +d[2] * 60 + parseFloat(d[3]);
  }
  // Silence running to the end of the file has no silence_end line.
  if (open !== null && durationSec > open) {
    silences.push({ startSec: open, endSec: durationSec });
  }

  const silent = silences.reduce((t, s) => t + (s.endSec - s.startSec), 0);
  return {
    durationSec,
    silences,
    silentFraction: durationSec > 0 ? Math.min(1, silent / durationSec) : 0,
  };
}

/**
 * Splits a recording into pieces of about `targetSec`, cutting in the
 * middle of the pause nearest each boundary (within `windowSec`) so no word
 * is split between two requests. With no pause nearby it cuts at the
 * target itself.
 */
export function planChunks(
  durationSec: number,
  silences: Silence[],
  targetSec: number,
  windowSec = 45,
): ChunkPlan[] {
  if (durationSec <= targetSec * 1.25) {
    return [{ startSec: 0, endSec: durationSec }];
  }

  const chunks: ChunkPlan[] = [];
  let start = 0;
  while (durationSec - start > targetSec * 1.25) {
    const target = start + targetSec;
    let cut = target;
    let best = Infinity;
    for (const s of silences) {
      const mid = (s.startSec + s.endSec) / 2;
      const distance = Math.abs(mid - target);
      if (distance <= windowSec && distance < best && mid > start + 1) {
        best = distance;
        cut = mid;
      }
    }
    chunks.push({ startSec: start, endSec: cut });
    start = cut;
  }
  chunks.push({ startSec: start, endSec: durationSec });
  return chunks;
}

/**
 * Cuts one piece and re-encodes it as 16 kHz mono Opus: what Whisper
 * works at internally, and about 2.4 MB per ten minutes.
 */
export async function extractChunk(
  ffmpegPath: string,
  input: string,
  chunk: ChunkPlan,
  output: string,
): Promise<void> {
  await run(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      chunk.startSec.toFixed(3),
      '-t',
      (chunk.endSec - chunk.startSec).toFixed(3),
      '-i',
      input,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'libopus',
      '-b:a',
      '32k',
      output,
    ],
    { timeout: 10 * 60_000 },
  );
}

export interface TimedSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number | null;
}

/**
 * Joins per-chunk segments into one timeline: each chunk's times are
 * shifted by where the chunk starts in the recording, and clamped so a
 * segment never runs past its chunk (Whisper sometimes overshoots the
 * final segment's end).
 */
export function stitchSegments(
  pieces: { chunk: ChunkPlan; segments: TimedSegment[] }[],
): TimedSegment[] {
  const out: TimedSegment[] = [];
  for (const { chunk, segments } of pieces) {
    const offset = Math.round(chunk.startSec * 1000);
    const limit = Math.round(chunk.endSec * 1000);
    for (const s of segments) {
      const startMs = Math.min(offset + s.startMs, limit);
      const endMs = Math.max(startMs, Math.min(offset + s.endMs, limit));
      out.push({ ...s, startMs, endMs });
    }
  }
  return out;
}
