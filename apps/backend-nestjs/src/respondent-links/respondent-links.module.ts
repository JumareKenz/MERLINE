import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { RespondController } from './respond.controller';
import { RespondService } from './respond.service';
import { RespondentLinksController } from './respondent-links.controller';
import { RespondentLinksService } from './respondent-links.service';

@Module({
  imports: [MediaModule],
  controllers: [RespondentLinksController, RespondController],
  providers: [RespondentLinksService, RespondService],
})
export class RespondentLinksModule {}
