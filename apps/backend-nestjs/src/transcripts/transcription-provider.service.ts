import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openAsBlob } from 'fs';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';
import type { TimedSegment } from './audio-chunking';
import { TRANSCRIPTION_LANGUAGES } from './languages';

export interface ProviderSegment extends TimedSegment {
  noSpeechProb: number | null;
  avgLogprob: number | null;
}

export interface TranscriptionResult {
  provider: 'groq';
  model: string;
  /** ISO code where known (en, ha), otherwise the provider's name for it. */
  language: string | null;
  segments: ProviderSegment[];
}

export { TRANSCRIPTION_LANGUAGES };

const LANGUAGE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(TRANSCRIPTION_LANGUAGES).map(([code, name]) => [
    name.toLowerCase(),
    code,
  ]),
);

/**
 * Groq speech-to-text (Whisper) and chat completions, server-side only.
 *
 * Errors are classified for the job runner rather than thrown as HTTP
 * exceptions: rate limits (429, with the provider's retry-after), timeouts
 * and 5xx are retryable; a rejected key, a file the provider cannot read,
 * or a missing key are permanent until someone intervenes. Never returns
 * invented text — every failure raises.
 */
@Injectable()
export class TranscriptionProviderService {
  private readonly logger = new Logger(TranscriptionProviderService.name);

  constructor(private readonly config: ConfigService) {}

  get sttModel(): string {
    return this.config.get<string>(
      'transcription.sttModel',
      'whisper-large-v3',
    );
  }

  get translationModel(): string {
    return this.config.get<string>(
      'transcription.translationModel',
      'openai/gpt-oss-120b',
    );
  }

  async transcribe(
    filePath: string,
    options: { filename: string; mimeType: string; language?: string | null },
  ): Promise<TranscriptionResult> {
    const model = this.sttModel;
    const form = new FormData();
    const blob = await openAsBlob(filePath, { type: options.mimeType });
    form.append('file', blob, options.filename);
    form.append('model', model);
    form.append('response_format', 'verbose_json');
    form.append('temperature', '0');
    if (options.language) form.append('language', options.language);

    const response = await this.request('/audio/transcriptions', {
      method: 'POST',
      body: form,
      timeoutMs: 10 * 60_000,
    });
    const data = (await response.json()) as {
      language?: string;
      segments?: Array<{
        start: number;
        end: number;
        text: string;
        avg_logprob?: number;
        no_speech_prob?: number;
      }>;
    };

    const segments: ProviderSegment[] = (data.segments ?? []).map((s) => ({
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      text: (s.text ?? '').trim(),
      avgLogprob: s.avg_logprob ?? null,
      noSpeechProb: s.no_speech_prob ?? null,
      confidence:
        s.avg_logprob === undefined
          ? null
          : Math.round(Math.min(1, Math.exp(s.avg_logprob)) * 1000) / 1000,
    }));

    return {
      provider: 'groq',
      model,
      language: normaliseLanguage(options.language || data.language),
      segments,
    };
  }

  /** One chat completion; returns the message text. */
  async chat(params: {
    system: string;
    user: string;
    model?: string;
    maxTokens?: number;
    json?: boolean;
  }): Promise<string> {
    const response = await this.request('/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model ?? this.translationModel,
        temperature: 0.1,
        max_tokens: params.maxTokens ?? 8000,
        ...(params.json && { response_format: { type: 'json_object' } }),
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      }),
      timeoutMs: 5 * 60_000,
    });
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new RetryableJobError('The model returned an empty response');
    }
    return content;
  }

  private async request(
    path: string,
    init: {
      method: string;
      body: BodyInit;
      headers?: Record<string, string>;
      timeoutMs: number;
    },
  ): Promise<Response> {
    const apiKey = this.config.get<string>('ai.groqKey', '');
    if (!apiKey) {
      throw new PermanentJobError(
        'Transcription is not configured on the server (GROQ_API_KEY is not set)',
      );
    }
    const baseUrl = this.config.get<string>(
      'transcription.groqBaseUrl',
      'https://api.groq.com/openai/v1',
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: init.method,
        headers: { Authorization: `Bearer ${apiKey}`, ...init.headers },
        body: init.body,
        signal: AbortSignal.timeout(init.timeoutMs),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new RetryableJobError(`Groq unreachable: ${message}`);
    }

    if (response.ok) return response;

    const body = (await response.text()).slice(0, 500);
    const detail = extractErrorMessage(body);
    this.logger.warn(`Groq ${path} returned ${response.status}: ${detail}`);

    if (response.status === 429) {
      throw new RetryableJobError(
        `Groq rate limit reached: ${detail}`,
        parseRetryAfter(response.headers),
      );
    }
    if (response.status >= 500 || response.status === 408) {
      throw new RetryableJobError(
        `Groq returned ${response.status}: ${detail}`,
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new PermanentJobError(
        `Groq rejected the API key (${response.status}). Check GROQ_API_KEY.`,
      );
    }
    throw new PermanentJobError(`Groq returned ${response.status}: ${detail}`);
  }
}

/**
 * Whisper writes plausible text over silence and noise ("Thank you for
 * watching"). A segment the model itself thinks is probably not speech,
 * and that it decoded with low confidence, is dropped — the same rule
 * OpenAI's reference implementation uses to skip silent windows.
 */
export function dropNonSpeech<T extends ProviderSegment>(segments: T[]): T[] {
  return segments.filter(
    (s) =>
      s.text.length > 0 &&
      !((s.noSpeechProb ?? 0) > 0.6 && (s.avgLogprob ?? 0) < -1),
  );
}

export function parseRetryAfter(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body;
  } catch {
    return body;
  }
}

function normaliseLanguage(language: string | null | undefined): string | null {
  if (!language) return null;
  const lower = language.toLowerCase();
  return LANGUAGE_NAME_TO_CODE[lower] ?? lower;
}
