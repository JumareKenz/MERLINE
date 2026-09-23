import type { Job, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface EnqueueJobInput {
  type: string;
  organizationId: string;
  payload: Prisma.InputJsonValue;
  /** At most one queued or running job per key. */
  dedupeKey?: string;
  maxAttempts?: number;
  runAt?: Date;
}

/**
 * Adds a job to the queue. A plain function over the Prisma client (not a
 * service method) so that any module can enqueue — including inside its own
 * transaction — without depending on the jobs module's providers.
 *
 * With a `dedupeKey`, an existing queued or running job for that key is
 * returned instead of adding a second one.
 */
export async function enqueueJob(db: Db, input: EnqueueJobInput): Promise<Job> {
  if (input.dedupeKey) {
    const active = await db.job.findFirst({
      where: {
        dedupeKey: input.dedupeKey,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });
    if (active) return active;
  }

  return db.job.create({
    data: {
      type: input.type,
      organizationId: input.organizationId,
      payload: input.payload,
      dedupeKey: input.dedupeKey,
      ...(input.maxAttempts !== undefined && {
        maxAttempts: input.maxAttempts,
      }),
      runAt: input.runAt ?? new Date(),
    },
  });
}
