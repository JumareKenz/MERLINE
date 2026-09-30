import { STANDARD_TYPE_LABELS } from '@/lib/interview-types';
import type { InterviewTypeDef } from '@/types/review';

/** The types offered for a project: its own list, else the standard ones (an older cached project has none). */
export function typesForProject(types: InterviewTypeDef[] | undefined): InterviewTypeDef[] {
  if (types && types.length > 0) return types;
  return Object.entries(STANDARD_TYPE_LABELS).map(([key, label]) => ({ key, label, description: null, fields: [] }));
}

/** The type to preselect: the project's method when it is one of the types, or the only type. */
export function defaultType(types: InterviewTypeDef[], method?: string | null): string {
  if (method && types.some((t) => t.key === method)) return method;
  return types.length === 1 ? types[0].key : '';
}

/**
 * Checks and cleans answers to a type's own fields. Returns the values to
 * send and an error per field key (the server repeats these checks).
 */
export function validateTypeMetadata(
  type: InterviewTypeDef | undefined,
  raw: Record<string, string>,
): { values: Record<string, string | number>; errors: Record<string, string> } {
  const values: Record<string, string | number> = {};
  const errors: Record<string, string> = {};
  for (const f of type?.fields ?? []) {
    const v = (raw[f.key] ?? '').trim();
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (f.kind === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) errors[f.key] = `${f.label} must be a number.`;
      else values[f.key] = n;
    } else if (f.kind === 'select' && !(f.options ?? []).includes(v)) {
      errors[f.key] = `Choose one of the options for ${f.label}.`;
    } else {
      values[f.key] = v;
    }
  }
  return { values, errors };
}
