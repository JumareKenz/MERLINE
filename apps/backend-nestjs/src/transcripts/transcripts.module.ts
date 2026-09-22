import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { TranscriptionProviderService } from './transcription-provider.service';

@Module({
  imports: [ConsentsModule],
  controllers: [TranscriptsController],
  providers: [TranscriptsService, TranscriptionProviderService],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
