import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { MediaModule } from '../media/media.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [ConsentsModule, MediaModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
