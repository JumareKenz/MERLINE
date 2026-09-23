import type { Prisma, PrismaClient } from '@prisma/client';

/** Interview formats, as the project's `settings.method` names them. */
export const INTERVIEW_TYPES = ['KII', 'FGD', 'IDI', 'OTHER'] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  KII: 'Key informant interview',
  FGD: 'Focus group discussion',
  IDI: 'In-depth interview',
  OTHER: 'Interview',
};

/**
 * The type an interview gets when none is given: its project's method, if
 * the project has one.
 */
export async function defaultInterviewType(
  db: PrismaClient | Prisma.TransactionClient,
  projectId: string | null | undefined,
): Promise<InterviewType | undefined> {
  if (!projectId) return undefined;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { settings: true },
  });
  const method = (project?.settings as { method?: string } | null)?.method;
  return INTERVIEW_TYPES.includes(method as InterviewType)
    ? (method as InterviewType)
    : undefined;
}
