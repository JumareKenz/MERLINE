import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { AiModule } from '../ai/ai.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { TranscriptionProviderService } from './transcription-provider.service';
import { TranscriptDialogueService } from './transcript-dialogue.service';

@Module({
  imports: [ConsentsModule, AiModule],
  controllers: [TranscriptsController],
  providers: [
    TranscriptsService,
    TranscriptionProviderService,
    TranscriptDialogueService,
  ],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
