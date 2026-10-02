import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { AiModule } from '../ai/ai.module';
import { JobsModule } from '../jobs/jobs.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { TranscriptionProviderService } from './transcription-provider.service';
import { TranscriptionPipelineService } from './transcription-pipeline.service';
import { TranscriptionJobs } from './transcription-jobs';
import { TranscriptDialogueService } from './transcript-dialogue.service';
import { TranscriptReviewService } from './transcript-review.service';
import { TranscriptExportService } from './transcript-export.service';
import { FieldTranscriptsController } from './field-transcripts.controller';

@Module({
  imports: [ConsentsModule, AiModule, JobsModule],
  controllers: [TranscriptsController, FieldTranscriptsController],
  providers: [
    TranscriptsService,
    TranscriptionProviderService,
    TranscriptionPipelineService,
    TranscriptionJobs,
    TranscriptDialogueService,
    TranscriptReviewService,
    TranscriptExportService,
  ],
  exports: [
    TranscriptsService,
    TranscriptionProviderService,
    TranscriptReviewService,
  ],
})
export class TranscriptsModule {}
