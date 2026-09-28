import { openAsBlob, statSync } from 'fs';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';

/**
 * Speech-to-text with Google's gemini-3.5-transcribe (Gemini API,
 * Interactions endpoint), for pre-recorded audio.
 *
 * Flow per recording (or per chunk of a long one): upload the audio with
 * the Files API, ask for a verbatim transcript with word timestamps and
 * speaker diarization, then delete the uploaded file. Words are grouped
 * into sentence-sized segments so the rest of Merline (segment playback,
 * corrections, quotations) works exactly as with Whisper.
 *
 * Settings, and why:
 *  - verbatim mode: research transcripts must not be rewritten. "Smart"
 *    mode removes fillers and may rephrase, and cannot give timestamps.
 *  - word timestamps: segments need start and end times. Google notes
 *    this costs a little accuracy and limits a request to 30 minutes, so
 *    the pipeline splits longer recordings (maxRequestSeconds).
 *  - a language code: the interview's language, as BCP-47. Hausa is
 *    ha-NG; English has no Nigerian variant, so it is configurable.
 *
 * Errors are classified for the job runner exactly like the Groq path:
 * 429/5xx/timeouts retry, a rejected key or unreadable audio is permanent.
 * Never returns invented text.
 */

export const GEMINI_DEFAULT_BASE_URL =
  'https://generativelanguage.googleapis.com';
/** Google's limit is 30 minutes with word timestamps; keep a margin. */
export const GEMINI_MAX_REQUEST_SECONDS = 25 * 60;

export interface GeminiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  /** ISO 639-1 code → BCP-47 code the model accepts. */
  languageCodes: Record<string, string>;
}

export interface WordInfo {
  text: string;
  startMs: number;
  endMs: number;
  speaker: string | null;
}

export interface GeminiSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker: string | null;
}

export class GeminiTranscriber {
  constructor(
    private readonly config: GeminiConfig,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  async transcribe(
    filePath: string,
    options: { filename: string; mimeType: string; language?: string | null },
  ): Promise<{ text: string; words: WordInfo[] }> {
    if (!this.config.apiKey) {
      throw new PermanentJobError(
        'Transcription is not configured on the server (GEMINI_API_KEY is not set)',
      );
    }
    const mimeType = geminiMimeType(options.mimeType, options.filename);
    const file = await this.upload(filePath, mimeType, options.filename);
    try {
      const languageCode = options.language
        ? this.config.languageCodes[options.language]
        : undefined;
      const response = await this.call(
        `${this.config.baseUrl}/v1beta/interactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.config.model,
            input: [{ type: 'audio', uri: file.uri, mime_type: mimeType }],
            generation_config: {
              transcription_config: {
                ...(languageCode && { language_codes: [languageCode] }),
                mode: {
                  type: 'verbatim',
                  diarization_mode: 'speaker',
                  timestamp_granularities: ['word'],
                },
              },
            },
          }),
          timeoutMs: 15 * 60_000,
          what: 'transcription',
        },
      );
      const data = (await response.json()) as InteractionResponse;
      if (data.status && data.status !== 'completed') {
        throw new RetryableJobError(
          `Gemini transcription did not complete (status ${data.status})`,
        );
      }
      return { text: data.output_text ?? '', words: wordsFrom(data) };
    } finally {
      // Best effort: Google also deletes uploads after 48 hours.
      await this.call(`${this.config.baseUrl}/v1beta/${file.name}`, {
        method: 'DELETE',
        timeoutMs: 30_000,
        what: 'file deletion',
      }).catch((err) =>
        this.log(
          `Could not delete uploaded audio ${file.name}: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }
  }

  /** Files API resumable upload: start, then upload and finalize. */
  private async upload(
    filePath: string,
    mimeType: string,
    displayName: string,
  ): Promise<{ name: string; uri: string }> {
    const bytes = statSync(filePath).size;
    const start = await this.call(
      `${this.config.baseUrl}/upload/v1beta/files`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(bytes),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
        timeoutMs: 60_000,
        what: 'audio upload',
      },
    );
    const uploadUrl = start.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new RetryableJobError('Gemini did not return an upload address');
    }
    const blob = await openAsBlob(filePath, { type: mimeType });
    const done = await this.call(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(bytes),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: blob,
      timeoutMs: 10 * 60_000,
      what: 'audio upload',
      // The upload address is already authorised.
      noKey: true,
    });
    const data = (await done.json()) as {
      file?: { name?: string; uri?: string };
    };
    if (!data.file?.name || !data.file.uri) {
      throw new RetryableJobError('Gemini did not confirm the audio upload');
    }
    return { name: data.file.name, uri: data.file.uri };
  }

  private async call(
    url: string,
    init: {
      method: string;
      body?: BodyInit;
      headers?: Record<string, string>;
      timeoutMs: number;
      what: string;
      noKey?: boolean;
    },
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          ...(init.noKey ? {} : { 'x-goog-api-key': this.config.apiKey }),
          ...init.headers,
        },
        body: init.body,
        signal: AbortSignal.timeout(init.timeoutMs),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new RetryableJobError(
        `Gemini unreachable (${init.what}): ${message}`,
      );
    }
    if (response.ok) return response;

    const detail = errorMessage((await response.text()).slice(0, 500));
    this.log(`Gemini ${init.what} returned ${response.status}: ${detail}`);
    if (response.status === 429) {
      throw new RetryableJobError(
        `Gemini rate limit reached: ${detail}`,
        retryAfterMs(response.headers),
      );
    }
    if (response.status >= 500 || response.status === 408) {
      throw new RetryableJobError(
        `Gemini returned ${response.status}: ${detail}`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new PermanentJobError(
        `Gemini rejected the API key (${response.status}). Check GEMINI_API_KEY.`,
      );
    }
    throw new PermanentJobError(
      `Gemini returned ${response.status}: ${detail}`,
    );
  }
}

/* ------------------------------------------------------------------ */

interface InteractionResponse {
  status?: string;
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        text?: string;
        speaker?: string;
        start_offset?: string;
        end_offset?: string;
      }>;
    }>;
  }>;
}

/** "1.250s" → 1250. */
export function parseOffset(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/s$/, ''));
  return Number.isFinite(n) ? Math.round(n * 1000) : null;
}

export function wordsFrom(data: InteractionResponse): WordInfo[] {
  const words: WordInfo[] = [];
  for (const step of data.steps ?? []) {
    for (const part of step.content ?? []) {
      for (const a of part.annotations ?? []) {
        if (a.type !== 'word_info' || !a.text?.trim()) continue;
        const startMs = parseOffset(a.start_offset);
        const endMs = parseOffset(a.end_offset);
        if (startMs === null || endMs === null) continue;
        words.push({
          text: a.text.trim(),
          startMs,
          endMs: Math.max(startMs, endMs),
          speaker: a.speaker ?? null,
        });
      }
    }
  }
  return words.sort((a, b) => a.startMs - b.startMs);
}

const SENTENCE_END = /[.?!…]["')\]]?$/;

/**
 * Words → segments of roughly a sentence: a new segment starts when the
 * speaker changes, after a pause, after a sentence ends, or when one runs
 * long. Short enough to play back and correct, long enough to quote.
 */
export function segmentsFromWords(
  words: WordInfo[],
  opts: { pauseMs?: number; maxMs?: number; maxWords?: number } = {},
): GeminiSegment[] {
  const pauseMs = opts.pauseMs ?? 1200;
  const maxMs = opts.maxMs ?? 30_000;
  const maxWords = opts.maxWords ?? 60;
  const out: GeminiSegment[] = [];
  let current: { words: WordInfo[] } | null = null;

  const flush = () => {
    if (!current || current.words.length === 0) return;
    const w = current.words;
    out.push({
      startMs: w[0].startMs,
      endMs: w[w.length - 1].endMs,
      text: w
        .map((x) => x.text)
        .join(' ')
        .replace(/\s+([,.?!;:…])/g, '$1'),
      speaker: w[0].speaker,
    });
    current = null;
  };

  for (const word of words) {
    if (current) {
      const last = current.words[current.words.length - 1];
      const first = current.words[0];
      const breakHere =
        word.speaker !== first.speaker ||
        word.startMs - last.endMs > pauseMs ||
        (SENTENCE_END.test(last.text) && current.words.length >= 4) ||
        word.endMs - first.startMs > maxMs ||
        current.words.length >= maxWords;
      if (breakHere) flush();
    }
    if (!current) current = { words: [] };
    current.words.push(word);
  }
  flush();
  return out;
}

/** The Gemini API's name for our audio types. */
export function geminiMimeType(mimeType: string, filename: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  const byExt: Record<string, string> = {
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    m4a: 'audio/m4a',
    mp4: 'audio/m4a',
    mp3: 'audio/mp3',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
  };
  const map: Record<string, string> = {
    'audio/mpeg': 'audio/mp3',
    'audio/mp4': 'audio/m4a',
    'audio/x-m4a': 'audio/m4a',
    'audio/x-wav': 'audio/wav',
    'video/webm': 'audio/webm',
  };
  if (map[base]) return map[base];
  if (base.startsWith('audio/') && base !== 'audio/octet-stream') return base;
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return byExt[ext] ?? 'audio/ogg';
}

function errorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body;
  } catch {
    return body;
  }
}

function retryAfterMs(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : undefined;
}
