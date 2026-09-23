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

@Module({
  imports: [ConsentsModule, AiModule, JobsModule],
  controllers: [TranscriptsController],
  providers: [
    TranscriptsService,
    TranscriptionProviderService,
    TranscriptionPipelineService,
    TranscriptionJobs,
    TranscriptDialogueService,
  ],
  exports: [TranscriptsService, TranscriptionProviderService],
})
export class TranscriptsModule {}
