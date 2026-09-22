import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TranscriptionSegment {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptionResult {
  provider: string;
  language: string | null;
  segments: TranscriptionSegment[];
}

/**
 * PHASE 2 — real transcription via OpenAI's Whisper endpoint.
 *
 * This is deliberately a separate client from AiGatewayService: Whisper's
 * `/audio/transcriptions` is a multipart file upload, not the
 * `/chat/completions` JSON dialect the gateway speaks, so nothing there
 * applies here.
 *
 * Whisper enforces a 25MB request body. A 90-minute interview is well beyond
 * that, so this cannot be the whole story for long recordings — chunking
 * needs a background worker (tracked as a known gap; Redis is provisioned,
 * unused). For now: fail clearly rather than silently truncate or fabricate.
 *
 * Mirrors AiGatewayService's contract: throws ServiceUnavailableException on
 * any failure, including a missing key. Never returns invented text.
 */
@Injectable()
export class TranscriptionProviderService {
  private readonly logger = new Logger(TranscriptionProviderService.name);
  private static readonly MAX_BYTES = 25 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {}

  async transcribe(
    audio: Buffer,
    mimeType: string,
    filename: string,
  ): Promise<TranscriptionResult> {
    const apiKey = this.configService.get<string>('ai.openaiKey', '');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'No transcription provider is configured. Set OPENAI_API_KEY.',
      );
    }

    if (audio.length > TranscriptionProviderService.MAX_BYTES) {
      throw new ServiceUnavailableException(
        `Recording is ${Math.ceil(audio.length / 1024 / 1024)}MB, which exceeds the ` +
          `${TranscriptionProviderService.MAX_BYTES / 1024 / 1024}MB single-request transcription ` +
          'limit. Chunked transcription is not yet implemented (see known gaps).',
      );
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      filename,
    );
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Transcription request failed: ${message}`);
      throw new ServiceUnavailableException(
        `Transcription provider unreachable: ${message}`,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Transcription provider returned ${response.status}: ${body}`,
      );
      throw new ServiceUnavailableException(
        `Transcription provider returned ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as {
      language?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
      text?: string;
    };

    const segments = (data.segments ?? []).map((segment, index) => ({
      index,
      startMs: Math.round(segment.start * 1000),
      endMs: Math.round(segment.end * 1000),
      text: segment.text.trim(),
    }));

    if (segments.length === 0) {
      // No segments back from a 200 response is itself a provider anomaly,
      // not silently treated as "an empty interview".
      throw new ServiceUnavailableException(
        'Transcription provider returned no segments for this recording',
      );
    }

    return { provider: 'openai', language: data.language ?? null, segments };
  }
}
