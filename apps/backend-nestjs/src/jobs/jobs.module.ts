import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsWorker } from './jobs.worker';

/**
 * Background jobs (transcription, translation). Modules that own a job type
 * import this module and register a handler with `JobsService.register`;
 * anything can enqueue with the plain `enqueueJob` function.
 */
@Module({
  providers: [JobsService, JobsWorker],
  exports: [JobsService],
})
export class JobsModule {}
