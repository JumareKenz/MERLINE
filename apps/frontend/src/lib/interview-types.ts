import type { TypeField } from '@/types/review';

/** Standard interview types; a project may add its own (see ProjectInterviewType). */
export const STANDARD_TYPE_LABELS: Record<string, string> = {
  KII: 'Key informant interview',
  FGD: 'Focus group discussion',
  IDI: 'In-depth interview',
  HOUSEHOLD: 'Household interview',
  OBSERVATION: 'Observation session',
  OTHER: 'Other',
};

export function typeLabel(key: string | null | undefined, labels?: Record<string, string>): string {
  if (!key) return 'Not set';
  return labels?.[key] ?? STANDARD_TYPE_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** "Water point visit" style keys: capitals, digits and underscores, starting with a letter. */
export function typeKeyFromLabel(label: string): string {
  const key = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return /^[A-Z]/.test(key) ? key : `T_${key}`.slice(0, 30);
}

/** Problems with a draft list, in words; empty when it can be saved. */
export function validateTypeDrafts(drafts: { key: string; label: string; fields: TypeField[] }[]): string[] {
  const problems: string[] = [];
  if (drafts.length === 0) problems.push('A project needs at least one interview type.');
  const seen = new Set<string>();
  for (const d of drafts) {
    if (!d.label.trim()) problems.push('Every type needs a name.');
    if (!/^[A-Z][A-Z0-9_]{1,29}$/.test(d.key)) problems.push(`“${d.label || 'Untitled'}” needs a name with letters or digits so it can be identified.`);
    if (seen.has(d.key)) problems.push(`“${d.label}” is used twice.`);
    seen.add(d.key);
    for (const f of d.fields) {
      if (!f.label.trim()) problems.push(`A field on “${d.label}” has no label.`);
      if (f.kind === 'select' && !(f.options ?? []).filter(Boolean).length) problems.push(`“${f.label || 'A choice field'}” on “${d.label}” needs at least one option.`);
    }
  }
  return [...new Set(problems)];
}


/** camelCase key from a label: "Group size" → "groupSize". */
export function fieldKey(label: string): string {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const key = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('');
  return /^[a-z]/.test(key) ? key.slice(0, 30) : `f${key}`.slice(0, 30);
}
