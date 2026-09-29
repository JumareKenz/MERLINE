'use client';

import { cn } from '@/lib/utils';
import type { PublicQuestion } from '@/types/respondent-link';

export function localized(text: Record<string, string> | undefined, lang: string): string {
  if (!text) return '';
  return text[lang]?.trim() || text.en?.trim() || Object.values(text).find((v) => v?.trim()) || '';
}

/**
 * One question, large and calm. Merline interviews are open-ended: the
 * respondent answers out loud, in their own words. There is nothing to
 * tick or tap, whatever the guide once held.
 */
export function QuestionView({ q, lang, compact = false }: { q: PublicQuestion; lang: string; compact?: boolean }) {
  return (
    <div>
      {q.section && <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">{localized({ en: q.section }, lang)}</p>}
      <h2 className={cn('font-display font-semibold leading-snug text-foreground', compact ? 'text-[17px]' : 'text-[22px] sm:text-[26px]')}>
        {localized(q.text, lang)}
      </h2>
      {!compact && <p className="mt-3 text-[15px] text-foreground-secondary">Answer out loud, in your own words. Take as long as you need.</p>}
    </div>
  );
}
