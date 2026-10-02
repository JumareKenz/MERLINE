/**
 * Machine translation of interview guides into Hausa. The result is only a
 * draft: an administrator must review it (and may edit it) before the guide
 * can be approved for the field. Pure helpers here; the call is in
 * GuidesService.translateToHausa.
 */
export const TRANSLATION_PROMPT_VERSION = 'guide-ha-v1';

export const GUIDE_TRANSLATION_SYSTEM = `You translate qualitative research interview guides from English into Hausa (as spoken in northern Nigeria) for field interviewers.

Rules:
- Keep every question open-ended, neutral and simple enough to say aloud. Do not add, drop or change the meaning of a question, and do not add examples that are not in the English.
- Keep names, acronyms (ANC, PNC, EBF) and numbers as written; if a term has no common Hausa equivalent, keep the English term.
- Translate probes the same way. Keep line breaks inside probes.
- Return ONE JSON object only: {"items":[{"key": string, "text": string, "probes": string}]}. Return exactly the keys you were given. Use "" for probes when there are none.`;

export interface TranslatableQuestion {
  id: string;
  text: Record<string, string>;
  probes: Record<string, string>;
}

export interface TranslationInput {
  key: string;
  text: string;
  probes: string;
}

/** Questions that have English text but no Hausa text yet. */
export function questionsNeedingHausa(
  questions: TranslatableQuestion[],
  overwrite = false,
): TranslationInput[] {
  return questions
    .filter((q) => q.text.en?.trim() && (overwrite || !q.text.ha?.trim()))
    .map((q) => ({
      key: q.id,
      text: q.text.en.trim(),
      probes: q.probes.en?.trim() ?? '',
    }));
}

/**
 * Reads the model's reply. Only keys that were asked for are accepted and
 * empty translations are dropped, so a bad reply can never overwrite a
 * question with nothing or add questions that do not exist.
 */
export function parseTranslation(
  reply: string,
  asked: TranslationInput[],
): Map<string, { text: string; probes: string }> {
  const stripped = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const parsed = JSON.parse(stripped) as {
    items?: { key?: unknown; text?: unknown; probes?: unknown }[];
  };
  const wanted = new Set(asked.map((a) => a.key));
  const out = new Map<string, { text: string; probes: string }>();
  for (const it of parsed.items ?? []) {
    if (typeof it.key !== 'string' || !wanted.has(it.key)) continue;
    const text = typeof it.text === 'string' ? it.text.trim() : '';
    if (!text) continue;
    out.set(it.key, {
      text,
      probes: typeof it.probes === 'string' ? it.probes.trim() : '',
    });
  }
  return out;
}
