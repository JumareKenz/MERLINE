import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { AnalysisPipelineService } from './analysis-pipeline.service';
import { ANALYSIS_REPORT_JOB } from './analysis-reports.service';

@Injectable()
export class AnalysisJobs implements OnModuleInit {
  constructor(
    private readonly jobs: JobsService,
    private readonly pipeline: AnalysisPipelineService,
  ) {}

  onModuleInit() {
    this.jobs.register(ANALYSIS_REPORT_JOB, {
      run: (job) =>
        this.pipeline.run((job.payload as { reportId: string }).reportId),
      onFailure: (failure) =>
        this.pipeline.onFailure(
          (failure.job.payload as { reportId: string }).reportId,
          failure,
        ),
    });
  }
}
