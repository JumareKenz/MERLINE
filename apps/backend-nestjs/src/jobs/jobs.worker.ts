import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';

/**
 * Polls the job table inside the API process. Runs up to `concurrency` jobs
 * at once. Disabled with JOBS_WORKER=off (and never started under Jest, so
 * tests drive the queue explicitly with `JobsService.drain()`).
 */
@Injectable()
export class JobsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(JobsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = 0;
  private stopped = false;
  private ticking = false;
  private lastRecovery = 0;

  constructor(
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const enabled = this.config.get<boolean>('jobs.workerEnabled', true);
    if (!enabled || process.env.JEST_WORKER_ID) return;
    this.logger.log(
      `Job worker ${this.jobs.workerId} started for: ${this.jobs.registeredTypes.join(', ') || '(none)'}`,
    );
    this.schedule(1000);
  }

  onApplicationShutdown() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule(ms: number) {
    if (this.stopped) return;
    // One pending timer at a time: a finished job asks for an early tick,
    // which replaces the regular poll rather than adding a second loop.
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    const pollMs = this.config.get<number>('jobs.pollMs', 3000);
    const concurrency = this.config.get<number>('jobs.concurrency', 2);
    try {
      if (Date.now() - this.lastRecovery > 60_000) {
        this.lastRecovery = Date.now();
        const recovered = await this.jobs.recoverStale();
        if (recovered) this.logger.warn(`Requeued ${recovered} stale job(s)`);
      }
      while (this.running < concurrency && !this.stopped) {
        const job = await this.jobs.claimNext();
        if (!job) break;
        this.running++;
        void this.jobs
          .execute(job)
          .catch((err) =>
            this.logger.error(`Job ${job.id} crashed the runner: ${err}`),
          )
          .finally(() => {
            this.running--;
            // A slot freed up: look for more work straight away.
            if (!this.stopped) this.schedule(0);
          });
      }
    } catch (err) {
      this.logger.error(
        `Job poll failed: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      this.ticking = false;
    }
    this.schedule(pollMs);
  }
}
