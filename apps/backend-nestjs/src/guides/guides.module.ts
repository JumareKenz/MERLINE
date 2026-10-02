import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { TranscriptsModule } from '../transcripts/transcripts.module';

/** Interview guides: versioned question sets for field interviews. */
@Module({
  imports: [TranscriptsModule],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
