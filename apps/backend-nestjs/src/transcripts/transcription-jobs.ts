import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { TranscriptionPipelineService } from './transcription-pipeline.service';
import { TRANSCRIPTION_JOB, TRANSLATION_JOB } from './transcription-queue';

interface TranscriptPayload {
  transcriptId: string;
  targetLanguage?: string;
}

/** Registers this module's job types with the queue. */
@Injectable()
export class TranscriptionJobs implements OnModuleInit {
  constructor(
    private readonly jobs: JobsService,
    private readonly pipeline: TranscriptionPipelineService,
  ) {}

  onModuleInit() {
    this.jobs.register(TRANSCRIPTION_JOB, {
      run: (job) =>
        this.pipeline.transcribe(
          (job.payload as unknown as TranscriptPayload).transcriptId,
          job.attempts,
        ),
      onFailure: (failure) =>
        this.pipeline.onTranscriptionFailure(
          (failure.job.payload as unknown as TranscriptPayload).transcriptId,
          failure,
        ),
    });

    this.jobs.register(TRANSLATION_JOB, {
      run: (job) => {
        const payload = job.payload as unknown as TranscriptPayload;
        return this.pipeline.translate(
          payload.transcriptId,
          payload.targetLanguage ?? 'en',
        );
      },
      onFailure: (failure) =>
        this.pipeline.onTranslationFailure(
          (failure.job.payload as unknown as TranscriptPayload).transcriptId,
          failure,
        ),
    });
  }
}
