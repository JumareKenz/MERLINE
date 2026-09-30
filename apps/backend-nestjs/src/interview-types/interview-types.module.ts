import { Module } from '@nestjs/common';
import { InterviewTypesController } from './interview-types.controller';
import { InterviewTypesService } from './interview-types.service';

@Module({
  controllers: [InterviewTypesController],
  providers: [InterviewTypesService],
})
export class InterviewTypesModule {}
