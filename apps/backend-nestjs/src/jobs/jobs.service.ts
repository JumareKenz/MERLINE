import { Injectable, Logger } from '@nestjs/common';
import { Job, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import {
  PermanentJobError,
  RetryableJobError,
  backoffDelayMs,
} from './job-errors';

/** What a handler learns when its job fails (for mirroring onto its own rows). */
export interface JobFailure {
  job: Job;
  message: string;
  /** False when the job is rescheduled; true when it has stopped. */
  final: boolean;
  nextRunAt?: Date;
}

export interface JobHandler {
  run(job: Job): Promise<void>;
  onFailure?(failure: JobFailure): Promise<void>;
}

/** A running job refreshes its lock this often… */
const HEARTBEAT_MS = 30_000;
/** …and one whose lock is older than this is presumed abandoned (process died). */
const STALE_LOCK_MS = 3 * 60_000;

/**
 * The database-backed job queue.
 *
 * Jobs are claimed with `FOR UPDATE SKIP LOCKED`, so several API processes
 * can share the table without running a job twice. A running job
 * heartbeats; if its process dies (deploy, crash) the lock goes stale and
 * the job is put back in the queue. Nothing is dropped: a job either
 * succeeds or ends FAILED with its last error, and stays in the table.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly handlers = new Map<string, JobHandler>();
  readonly workerId = `api-${process.pid}-${randomUUID().slice(0, 8)}`;

  constructor(private readonly prisma: PrismaService) {}

  register(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  get registeredTypes(): string[] {
    return [...this.handlers.keys()];
  }

  /** Puts jobs whose worker stopped heartbeating back in the queue. */
  async recoverStale(now = new Date()): Promise<number> {
    const result = await this.prisma.job.updateMany({
      where: {
        status: 'RUNNING',
        lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) },
      },
      data: {
        status: 'QUEUED',
        lockedAt: null,
        lockedBy: null,
        runAt: now,
        lastError: 'Worker stopped while running this job; requeued',
      },
    });
    return result.count;
  }

  /**
   * Atomically claims the next due job of a registered type, or null.
   * `organizationId` narrows the claim (scripts and tests); the worker
   * claims across all organizations.
   */
  async claimNext(organizationId?: string): Promise<Job | null> {
    const types = this.registeredTypes;
    if (types.length === 0) return null;
    const orgFilter = organizationId
      ? Prisma.sql`AND "organization_id" = ${organizationId}`
      : Prisma.empty;

    // Prisma stores DateTime as UTC in `timestamp without time zone`, so
    // "now" must be UTC too: bare now() is converted to the session's time
    // zone and, anywhere east of UTC, makes rescheduled jobs due at once.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "jobs"
      SET "status" = 'RUNNING',
          "locked_at" = (now() AT TIME ZONE 'UTC'),
          "locked_by" = ${this.workerId},
          "attempts" = "attempts" + 1,
          "updated_at" = (now() AT TIME ZONE 'UTC')
      WHERE "id" = (
        SELECT "id" FROM "jobs"
        WHERE "status" = 'QUEUED'
          AND "run_at" <= (now() AT TIME ZONE 'UTC')
          AND "type" = ANY(${types}::text[])
          ${orgFilter}
        ORDER BY "run_at"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id"`;

    if (rows.length === 0) return null;
    return this.prisma.job.findUnique({ where: { id: rows[0].id } });
  }

  /** Runs one claimed job to completion, recording the outcome. */
  async execute(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.finish(
        job,
        new PermanentJobError(`No handler for ${job.type}`),
      );
      return;
    }

    const heartbeat = setInterval(() => {
      this.prisma.job
        .update({ where: { id: job.id }, data: { lockedAt: new Date() } })
        .catch(() => undefined);
    }, HEARTBEAT_MS);

    try {
      await handler.run(job);
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });
    } catch (err) {
      await this.finish(job, err, handler);
    } finally {
      clearInterval(heartbeat);
    }
  }

  /** Claims and runs due jobs until none are left. Used by tests and scripts. */
  async drain(options: { organizationId?: string; max?: number } = {}) {
    const max = options.max ?? 100;
    let ran = 0;
    for (; ran < max; ran++) {
      const job = await this.claimNext(options.organizationId);
      if (!job) break;
      await this.execute(job);
    }
    return ran;
  }

  private async finish(job: Job, err: unknown, handler?: JobHandler) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = err instanceof PermanentJobError;
    const final = permanent || job.attempts >= job.maxAttempts;
    const nextRunAt = final
      ? undefined
      : new Date(
          Date.now() +
            backoffDelayMs(
              job.attempts,
              err instanceof RetryableJobError ? err.retryAfterMs : undefined,
            ),
        );

    this.logger.warn(
      `Job ${job.type} ${job.id} attempt ${job.attempts}/${job.maxAttempts} failed` +
        `${final ? ' (final)' : `; retrying at ${nextRunAt?.toISOString()}`}: ${message}`,
    );

    const data: Prisma.JobUpdateInput = final
      ? { status: 'FAILED', lastError: message, lockedAt: null, lockedBy: null }
      : {
          status: 'QUEUED',
          lastError: message,
          runAt: nextRunAt,
          lockedAt: null,
          lockedBy: null,
        };
    await this.prisma.job.update({ where: { id: job.id }, data });

    try {
      await handler?.onFailure?.({ job, message, final, nextRunAt });
    } catch (hookErr) {
      this.logger.error(
        `onFailure for ${job.type} ${job.id} threw: ${hookErr instanceof Error ? hookErr.message : hookErr}`,
      );
    }
  }
}
