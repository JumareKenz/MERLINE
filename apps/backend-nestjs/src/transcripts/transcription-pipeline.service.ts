import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { consentBlockReason } from '../consents/consents.service';
import { PermanentJobError, RetryableJobError } from '../jobs/job-errors';
import type { JobFailure } from '../jobs/jobs.service';
import {
  AudioAnalysis,
  ChunkPlan,
  analyseAudio,
  extractChunk,
  planChunks,
  stitchSegments,
} from './audio-chunking';
import {
  TRANSCRIPTION_LANGUAGES,
  TranscriptionProviderService,
  dropNonSpeech,
} from './transcription-provider.service';
import { segmentText } from './segment-text';

/** Recordings that are at least this silent are stored as "no speech". */
const SILENT_FRACTION = 0.98;
/** Segments per translation request: small enough to fit the output limit. */
const TRANSLATION_BATCH = 40;

/**
 * The work behind the `transcription` and `translation` jobs. Runs in the
 * job worker, never in a request. Consent is re-checked when the job runs,
 * not only when it was queued: a participant may withdraw in between.
 */
@Injectable()
export class TranscriptionPipelineService {
  private readonly logger = new Logger(TranscriptionPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly provider: TranscriptionProviderService,
    private readonly config: ConfigService,
  ) {}

  async transcribe(transcriptId: string, attempt: number): Promise<void> {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
      include: { interview: { include: { consent: true } }, media: true },
    });
    if (!transcript) throw new PermanentJobError('Transcript no longer exists');
    if (transcript.status === 'COMPLETED') return;

    const blocked = consentBlockReason(
      transcript.interview.consent,
      'allowTranscription',
    );
    if (blocked) throw new PermanentJobError(blocked);
    if (transcript.media.deletedAt || transcript.interview.deletedAt) {
      throw new PermanentJobError('The recording or interview was deleted');
    }

    const started = Date.now();
    await this.prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        status: 'PROCESSING',
        attempts: attempt,
        errorMessage: null,
        nextAttemptAt: null,
      },
    });

    const workDir = await mkdtemp(join(tmpdir(), 'merline-transcribe-'));
    try {
      const source = join(workDir, 'source');
      await this.download(transcript.media.path, source);
      const { size } = await stat(source);

      const maxDirectBytes = this.config.get<number>(
        'transcription.maxDirectBytes',
        20 * 1024 * 1024,
      );
      const analysis = await this.analyse(source, size <= maxDirectBytes);

      if (analysis && analysis.silentFraction >= SILENT_FRACTION) {
        await this.complete(transcript.id, transcript.organizationId, {
          model: this.provider.sttModel,
          language: transcript.requestedLanguage,
          segments: [],
          durationMs: Math.round(analysis.durationSec * 1000),
          processingMs: Date.now() - started,
        });
        return;
      }

      const pieces = await this.prepare(
        source,
        size,
        maxDirectBytes,
        analysis,
        workDir,
        transcript.media,
      );

      let language: string | null = null;
      const results: {
        chunk: ChunkPlan;
        segments: ReturnType<typeof dropNonSpeech>;
      }[] = [];
      for (const piece of pieces) {
        const result = await this.provider.transcribe(piece.path, {
          filename: piece.filename,
          mimeType: piece.mimeType,
          language: transcript.requestedLanguage,
        });
        const kept = dropNonSpeech(result.segments);
        if (!language && kept.length > 0) language = result.language;
        results.push({ chunk: piece.chunk, segments: kept });
      }

      const segments = stitchSegments(results);
      const lastEnd = segments.at(-1)?.endMs ?? 0;
      await this.complete(transcript.id, transcript.organizationId, {
        model: this.provider.sttModel,
        language: language ?? transcript.requestedLanguage,
        segments,
        durationMs: analysis
          ? Math.round(analysis.durationSec * 1000)
          : lastEnd || null,
        processingMs: Date.now() - started,
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  /** Mirrors a failed transcription job onto its transcript. */
  async onTranscriptionFailure(transcriptId: string, failure: JobFailure) {
    await this.prisma.transcript.updateMany({
      where: { id: transcriptId, status: { not: 'COMPLETED' } },
      data: failure.final
        ? {
            status: 'FAILED',
            errorMessage: failure.message,
            nextAttemptAt: null,
            attempts: failure.job.attempts,
          }
        : {
            status: 'PENDING',
            errorMessage: `Attempt ${failure.job.attempts} failed: ${failure.message}. Retrying automatically.`,
            nextAttemptAt: failure.nextRunAt ?? null,
            attempts: failure.job.attempts,
          },
    });
  }

  async translate(transcriptId: string, targetLanguage: string): Promise<void> {
    const transcript = await this.prisma.transcript.findUnique({
      where: { id: transcriptId },
      include: {
        interview: { include: { consent: true } },
        segments: { orderBy: { index: 'asc' } },
      },
    });
    if (!transcript) throw new PermanentJobError('Transcript no longer exists');
    if (transcript.status !== 'COMPLETED') {
      throw new PermanentJobError(
        'Only a completed transcript can be translated',
      );
    }
    const blocked = consentBlockReason(
      transcript.interview.consent,
      'allowAiAnalysis',
    );
    if (blocked) throw new PermanentJobError(blocked);

    await this.prisma.transcript.update({
      where: { id: transcript.id },
      data: {
        translationStatus: 'PROCESSING',
        translationLanguage: targetLanguage,
        translationError: null,
      },
    });

    const target = TRANSCRIPTION_LANGUAGES[targetLanguage] ?? targetLanguage;
    const source = transcript.language
      ? (TRANSCRIPTION_LANGUAGES[transcript.language] ?? transcript.language)
      : 'the original language';
    const translated = new Map<number, string>();

    for (let i = 0; i < transcript.segments.length; i += TRANSLATION_BATCH) {
      const batch = transcript.segments.slice(i, i + TRANSLATION_BATCH);
      const content = await this.provider.chat({
        json: true,
        system:
          `You translate research interview transcript segments from ${source} into ${target}. ` +
          'Translate faithfully and completely: do not summarise, explain, add or omit anything. ' +
          'Keep hesitations and repetitions. Translate every segment on its own, even when others are unclear. ' +
          `Return a segment unchanged only if it is already entirely in ${target}. ` +
          'If a segment is unintelligible, reply "[unintelligible]" for it rather than copying it. ' +
          'Reply with JSON only: {"segments":[{"index":<number>,"text":"<translation>"}]} with exactly one entry per input segment.',
        user: JSON.stringify(
          batch.map((s) => ({ index: s.index, text: segmentText(s) })),
        ),
      });

      let parsed: { segments?: Array<{ index?: number; text?: string }> };
      try {
        parsed = JSON.parse(content) as typeof parsed;
      } catch {
        throw new RetryableJobError('The translation was not valid JSON');
      }
      for (const s of parsed.segments ?? []) {
        if (typeof s.index === 'number' && typeof s.text === 'string') {
          translated.set(s.index, s.text.trim());
        }
      }
      const missing = batch.filter((s) => !translated.has(s.index));
      if (missing.length > 0) {
        throw new RetryableJobError(
          `The translation skipped ${missing.length} segment(s); it was discarded`,
        );
      }
    }

    await this.prisma.$transaction([
      ...transcript.segments.map((s) =>
        this.prisma.transcriptSegment.update({
          where: { id: s.id },
          data: { translatedText: translated.get(s.index) ?? null },
        }),
      ),
      this.prisma.transcript.update({
        where: { id: transcript.id },
        data: {
          translationStatus: 'COMPLETED',
          translationModel: this.provider.translationModel,
          translatedAt: new Date(),
          translationError: null,
        },
      }),
    ]);
  }

  async onTranslationFailure(transcriptId: string, failure: JobFailure) {
    await this.prisma.transcript.updateMany({
      where: { id: transcriptId },
      data: {
        translationStatus: failure.final ? 'FAILED' : 'PENDING',
        translationError: failure.final
          ? failure.message
          : `Attempt ${failure.job.attempts} failed: ${failure.message}. Retrying automatically.`,
      },
    });
  }

  private async complete(
    transcriptId: string,
    organizationId: string,
    result: {
      model: string;
      language: string | null;
      segments: ReturnType<typeof stitchSegments>;
      durationMs: number | null;
      processingMs: number;
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      // Only a transcript that never completed reaches here, so no
      // quotation can point at these segments yet.
      await tx.transcriptSegment.deleteMany({ where: { transcriptId } });
      if (result.segments.length > 0) {
        await tx.transcriptSegment.createMany({
          data: result.segments.map((s, index) => ({
            transcriptId,
            organizationId,
            index,
            startMs: s.startMs,
            endMs: s.endMs,
            text: s.text,
            confidence: s.confidence,
          })),
        });
      }
      await tx.transcript.update({
        where: { id: transcriptId },
        data: {
          status: 'COMPLETED',
          provider: 'groq',
          model: result.model,
          language: result.language,
          text: result.segments.map((s) => s.text).join(' '),
          durationMs: result.durationMs,
          processingMs: result.processingMs,
          completedAt: new Date(),
          errorMessage: null,
          nextAttemptAt: null,
        },
      });
    });
  }

  private async download(key: string, destination: string) {
    let stream: NodeJS.ReadableStream;
    try {
      stream = await this.storage.getObjectStream(key);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/NoSuchKey|not found/i.test(message)) {
        throw new PermanentJobError(
          'The recording file is missing from storage',
        );
      }
      throw new RetryableJobError(`Could not read the recording: ${message}`);
    }
    await pipeline(stream as Readable, createWriteStream(destination));
  }

  /**
   * Duration and pauses. Optional for a small file (it can go to the
   * provider as it is); required for a large one, which must be split.
   */
  private async analyse(
    source: string,
    optional: boolean,
  ): Promise<AudioAnalysis | null> {
    try {
      return await analyseAudio(
        this.config.get<string>('transcription.ffmpegPath', 'ffmpeg'),
        source,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (optional) {
        this.logger.warn(`Audio analysis skipped: ${message}`);
        return null;
      }
      throw new PermanentJobError(
        /ENOENT/.test(message)
          ? 'This recording is too large to send whole and ffmpeg is not installed on the server to split it'
          : `The recording could not be decoded: ${message.slice(0, 300)}`,
      );
    }
  }

  private async prepare(
    source: string,
    size: number,
    maxDirectBytes: number,
    analysis: AudioAnalysis | null,
    workDir: string,
    media: { originalName: string; filename: string; mimeType: string },
  ) {
    if (size <= maxDirectBytes || !analysis) {
      return [
        {
          path: source,
          filename: providerFilename(
            media.originalName || media.filename,
            media.mimeType,
          ),
          mimeType: media.mimeType,
          // Unknown length (analysis skipped): nothing to clamp against.
          chunk: {
            startSec: 0,
            endSec: analysis?.durationSec || Number.POSITIVE_INFINITY,
          },
        },
      ];
    }

    if (analysis.durationSec <= 0) {
      throw new PermanentJobError(
        'Could not determine the length of this recording',
      );
    }
    const chunkSeconds = this.config.get<number>(
      'transcription.chunkSeconds',
      600,
    );
    const plan = planChunks(
      analysis.durationSec,
      analysis.silences,
      chunkSeconds,
    );
    const ffmpeg = this.config.get<string>(
      'transcription.ffmpegPath',
      'ffmpeg',
    );
    const pieces: {
      path: string;
      filename: string;
      mimeType: string;
      chunk: ChunkPlan;
    }[] = [];
    for (const [i, chunk] of plan.entries()) {
      const path = join(workDir, `chunk-${i}.ogg`);
      await extractChunk(ffmpeg, source, chunk, path);
      pieces.push({
        path,
        filename: `chunk-${i}.ogg`,
        mimeType: 'audio/ogg',
        chunk,
      });
    }
    return pieces;
  }
}

/** The provider infers the format from the extension, so make sure there is one. */
export function providerFilename(name: string, mimeType: string): string {
  if (/\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|opus|wav|webm)$/i.test(name))
    return name;
  const ext =
    {
      'audio/webm': 'webm',
      'video/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/flac': 'flac',
    }[mimeType.split(';')[0].trim()] ?? 'webm';
  return `${name || 'recording'}.${ext}`;
}
