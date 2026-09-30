import { BadRequestException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Interview types. A project can collect several at once: its own list is
 * the ProjectInterviewType rows; a project with none uses the built-ins.
 * `Interview.type` stores the key (a built-in such as "FGD", or a custom
 * key an administrator defined for that project).
 */
export const INTERVIEW_TYPES = [
  'KII',
  'FGD',
  'IDI',
  'HOUSEHOLD',
  'OBSERVATION',
  'OTHER',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  KII: 'Key informant interview',
  FGD: 'Focus group discussion',
  IDI: 'In-depth interview',
  HOUSEHOLD: 'Household interview',
  OBSERVATION: 'Observation session',
  OTHER: 'Interview',
};

/** Shape of a key, built-in or custom. DTOs use this; the project's list decides what is allowed. */
export const INTERVIEW_TYPE_KEY = /^[A-Z][A-Z0-9_]{1,29}$/;

export interface TypeField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select';
  required?: boolean;
  options?: string[];
}

export interface AvailableInterviewType {
  key: string;
  label: string;
  description: string | null;
  fields: TypeField[];
  custom: boolean;
}

type Db = PrismaClient | Prisma.TransactionClient;

export function interviewTypeLabel(
  key: string | null | undefined,
  labels?: Map<string, string>,
): string {
  if (!key) return 'Interview';
  return labels?.get(key) ?? INTERVIEW_TYPE_LABELS[key as InterviewType] ?? key;
}

/** The types a project collects: its configured list, else the built-ins. */
export async function availableInterviewTypes(
  db: Db,
  organizationId: string,
  projectId: string | null | undefined,
): Promise<AvailableInterviewType[]> {
  const configured = projectId
    ? await db.projectInterviewType.findMany({
        where: { organizationId, projectId, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      })
    : [];
  if (configured.length) {
    return configured.map((t) => ({
      key: t.key,
      label: t.label,
      description: t.description,
      fields: (t.fields as unknown as TypeField[]) ?? [],
      custom: !INTERVIEW_TYPES.includes(t.key as InterviewType),
    }));
  }
  return INTERVIEW_TYPES.map((key) => ({
    key,
    label: INTERVIEW_TYPE_LABELS[key],
    description: null,
    fields: [],
    custom: false,
  }));
}

/**
 * The type an interview gets when none is given: the project's `method`
 * setting if it is one of the project's types, else its only type, else
 * nothing (the caller decides).
 */
export async function defaultInterviewType(
  db: Db,
  projectId: string | null | undefined,
  organizationId?: string,
): Promise<string | undefined> {
  if (!projectId) return undefined;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { settings: true, organizationId: true },
  });
  if (!project) return undefined;
  const types = await availableInterviewTypes(
    db,
    organizationId ?? project.organizationId,
    projectId,
  );
  const method = (project.settings as { method?: string } | null)?.method;
  if (method && types.some((t) => t.key === method)) return method;
  return types.length === 1 ? types[0].key : undefined;
}

/**
 * Checks a requested type against the project's list (throwing a clear 400)
 * and returns the type to store, with its metadata cleaned to the fields
 * that type defines.
 */
export async function resolveInterviewType(
  db: Db,
  organizationId: string,
  projectId: string | null | undefined,
  requested: string | undefined,
  metadata?: Record<string, unknown>,
): Promise<{
  type: string | undefined;
  metadata: Prisma.InputJsonObject | undefined;
}> {
  const types = await availableInterviewTypes(db, organizationId, projectId);
  const type =
    requested ?? (await defaultInterviewType(db, projectId, organizationId));
  if (!type) return { type: undefined, metadata: undefined };
  const def = types.find((t) => t.key === type);
  if (!def) {
    throw new BadRequestException(
      `"${type}" is not an interview type of this project. Choose one of: ${types.map((t) => t.key).join(', ')}`,
    );
  }
  return { type, metadata: cleanTypeMetadata(def.fields, metadata) };
}

export function cleanTypeMetadata(
  fields: TypeField[],
  input: Record<string, unknown> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!fields.length) return undefined;
  const out: Record<string, string | number> = {};
  for (const f of fields) {
    const raw = input?.[f.key];
    const empty = raw === undefined || raw === null || raw === '';
    if (empty) {
      if (f.required) throw new BadRequestException(`${f.label} is required`);
      continue;
    }
    if (f.kind === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n))
        throw new BadRequestException(`${f.label} must be a number`);
      out[f.key] = n;
    } else {
      const text = (
        typeof raw === 'string' || typeof raw === 'number' ? String(raw) : ''
      )
        .trim()
        .slice(0, 500);
      if (f.kind === 'select' && !(f.options ?? []).includes(text)) {
        throw new BadRequestException(
          `${f.label} must be one of: ${(f.options ?? []).join(', ')}`,
        );
      }
      out[f.key] = text;
    }
  }
  return out;
}
