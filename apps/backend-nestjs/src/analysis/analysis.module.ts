import { Module } from '@nestjs/common';
import { ConsentsModule } from '../consents/consents.module';
import { JobsModule } from '../jobs/jobs.module';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { AnalysisJobs } from './analysis-jobs';
import { AnalysisPipelineService } from './analysis-pipeline.service';
import { AnalysisReportsController } from './analysis-reports.controller';
import { AnalysisReportsService } from './analysis-reports.service';

/** AI-written interview, project and custom reports, with Word/Excel/PDF export. */
@Module({
  imports: [ConsentsModule, JobsModule, TranscriptsModule],
  controllers: [AnalysisReportsController],
  providers: [AnalysisReportsService, AnalysisPipelineService, AnalysisJobs],
})
export class AnalysisModule {}
