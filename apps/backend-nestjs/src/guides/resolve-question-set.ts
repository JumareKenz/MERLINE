import type { Prisma, PrismaClient } from '@prisma/client';
import { GuidesService } from './guides.service';

/**
 * The guide version a new interview records. An explicit id (e.g. the one
 * a field device showed while offline) is honoured if it belongs to the
 * organization and was ever approved; otherwise the currently approved
 * guide for the project and interview type, if any.
 */
export async function resolveQuestionSet(
  db: PrismaClient | Prisma.TransactionClient,
  organizationId: string,
  projectId: string | null | undefined,
  interviewType: string | null | undefined,
  requestedId?: string,
): Promise<string | null> {
  if (requestedId) {
    const set = await db.questionSet.findFirst({
      where: { id: requestedId, organizationId, approvedAt: { not: null } },
      select: { id: true },
    });
    if (set) return set.id;
  }
  const approved = await GuidesService.approvedFor(
    db,
    organizationId,
    projectId,
    interviewType,
  );
  return approved?.id ?? null;
}
