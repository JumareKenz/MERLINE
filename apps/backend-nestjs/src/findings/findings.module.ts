import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { AiModule } from '../ai/ai.module';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';

@Module({
  imports: [ConsentsModule, AiModule],
  controllers: [FindingsController],
  providers: [FindingsService],
  exports: [FindingsService],
})
export class FindingsModule {}
