/**
 * Evidence rules for reports. Deterministic on purpose: how strong a
 * finding looks is decided here from what was actually cited and verified,
 * never from the model's own confidence, and never from how many times a
 * topic is mentioned alone.
 */
export type EvidenceStrength =
  'Strong' | 'Moderate' | 'Limited' | 'Insufficient';

export interface Support {
  /** Interviews the finding is verifiably quoted from. */
  quotedInterviews: number;
  /** Distinct interview types among those. */
  quotedTypes: number;
  /** Interviews the analysis said the finding came from (may lack a quotation). */
  claimedInterviews: number;
  /** Contrary or qualifying quotations found. */
  contrary: number;
}

/**
 * Strong: verbatim support from at least three interviews spanning at
 * least two interview types, with contrary evidence outnumbered.
 * Moderate: verbatim support from two or more interviews.
 * Limited: one interview, or claimed without a verbatim quotation.
 * Insufficient: nothing verifiable supports it.
 * A finding whose contrary evidence matches or exceeds its support is
 * capped at Limited.
 */
export function evidenceStrength(s: Support): EvidenceStrength {
  if (s.quotedInterviews === 0) {
    return s.claimedInterviews >= 2 ? 'Limited' : 'Insufficient';
  }
  if (s.contrary >= s.quotedInterviews) return 'Limited';
  if (s.quotedInterviews >= 3 && s.quotedTypes >= 2) return 'Strong';
  if (s.quotedInterviews >= 2) return 'Moderate';
  return 'Limited';
}

export function strengthBasis(
  strength: EvidenceStrength,
  s: Support,
  typeSummary: string,
): string {
  const where = typeSummary ? ` (${typeSummary})` : '';
  const quoted =
    s.quotedInterviews > 0
      ? `Verbatim quotations from ${plural(s.quotedInterviews, 'interview')}${where}.`
      : 'No verbatim quotation supports this finding; it rests on the interview analyses only.';
  const contrary = s.contrary
    ? ` ${plural(s.contrary, 'contrary or qualifying statement')} recorded.`
    : '';
  return `${strength}. ${quoted}${contrary} This rating counts independent interviews and interview types; it does not show the finding is true or validated.`;
}

export function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export interface TypedInterview {
  ref: string;
  type: string | null;
  typeLabel: string;
  location: string | null;
}

/** "2 KII, 1 FGD" for a set of interview refs. */
export function typeCounts(
  refs: string[],
  byRef: Map<string, TypedInterview>,
): { summary: string; types: string[] } {
  const counts = new Map<string, number>();
  for (const r of refs) {
    const t = byRef.get(r);
    if (t)
      counts.set(t.type ?? 'OTHER', (counts.get(t.type ?? 'OTHER') ?? 0) + 1);
  }
  return {
    summary: [...counts.entries()].map(([t, n]) => `${n} ${t}`).join(', '),
    types: [...counts.keys()],
  };
}

export interface TriangulationInput {
  findings: { title: string; refs: string[]; strength: EvidenceStrength }[];
  interviews: TypedInterview[];
}

/**
 * Finding × interview-type table. Each cell is "supporting / interviews of
 * that type", so a theme raised by 2 of 2 KIIs and 0 of 6 FGDs is visibly
 * different from one raised across both. Convergence is reported only when
 * more than one type supports a finding; single-source findings say so.
 */
export function triangulationTable(input: TriangulationInput): {
  columns: string[];
  rows: string[][];
  types: string[];
} {
  const byRef = new Map(input.interviews.map((i) => [i.ref, i]));
  const types = [...new Set(input.interviews.map((i) => i.type ?? 'OTHER'))];
  const totals = new Map(
    types.map((t) => [
      t,
      input.interviews.filter((i) => (i.type ?? 'OTHER') === t).length,
    ]),
  );
  const multiLocation =
    new Set(input.interviews.map((i) => i.location).filter(Boolean)).size > 1;
  const columns = [
    'Finding',
    ...types.map((t) => `${t} (of ${totals.get(t)})`),
    'Reading',
    ...(multiLocation ? ['Locations'] : []),
    'Evidence',
  ];
  const rows = input.findings.map((f) => {
    const supporting = f.refs.filter((r) => byRef.has(r));
    const perType = types.map((t) => {
      const n = supporting.filter(
        (r) => (byRef.get(r)!.type ?? 'OTHER') === t,
      ).length;
      return `${n}`;
    });
    const supportingTypes = types.filter((_, i) => perType[i] !== '0');
    const reading =
      supporting.length <= 1
        ? 'Single interview'
        : supportingTypes.length > 1
          ? `Across ${supportingTypes.length} interview types`
          : `One type only (${supportingTypes[0]})`;
    const locations = [
      ...new Set(supporting.map((r) => byRef.get(r)!.location).filter(Boolean)),
    ] as string[];
    return [
      f.title,
      ...perType,
      reading,
      ...(multiLocation ? [locations.join('; ') || '—'] : []),
      f.strength,
    ];
  });
  return { columns, rows, types };
}
