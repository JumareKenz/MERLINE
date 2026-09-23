'use client';

import Link from 'next/link';
import { Check, Circle, SkipForward } from 'lucide-react';
import { useInterviewQuestionLog } from '@/hooks/use-guides';
import { cn, formatDuration } from '@/lib/utils';
import { localized } from '@/types/guide';

/**
 * What the interviewer covered: each guide question, whether it was asked
 * (and where in the recording) or skipped. Uses the exact guide version
 * the interview was done with.
 */
export function InterviewGuideLog({ interviewId, language }: { interviewId: string; language?: string | null }) {
  const { data, isLoading } = useInterviewQuestionLog(interviewId);
  if (isLoading) return <p className="text-[14px] text-foreground-tertiary">Loading…</p>;
  if (!data?.guide) {
    return <p className="text-[14px] text-foreground-secondary">No interview guide was in use for this interview.</p>;
  }
  const lang = language && data.guide.languages.includes(language) ? language : 'en';
  const byQuestion = new Map(data.entries.map((e) => [e.questionId, e]));
  const asked = data.entries.filter((e) => e.status === 'ASKED').length;
  const skipped = data.entries.filter((e) => e.status === 'SKIPPED').length;

  return (
    <div>
      <p className="mb-3 text-[13.5px] text-foreground-secondary">
        <Link href={`/guides/${data.guide.id}`} className="font-medium text-foreground-link hover:underline">
          {data.guide.title}
        </Link>{' '}
        · version {data.guide.version} · {asked} asked, {skipped} skipped, {data.guide.questions.length - asked - skipped} not marked
      </p>
      <ol className="divide-y divide-border-subtle">
        {data.guide.questions.map((q, i) => {
          const e = q.id ? byQuestion.get(q.id) : undefined;
          return (
            <li key={q.id ?? i} className="flex items-start gap-3 py-2.5">
              <span className="mt-0.5 w-5 shrink-0 text-right text-[12.5px] tabular-nums text-foreground-tertiary">{i + 1}</span>
              <p className="min-w-0 flex-1 text-[14px] leading-snug text-foreground">{localized(q.text, lang)}</p>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium',
                  e?.status === 'ASKED' ? 'text-success' : e?.status === 'SKIPPED' ? 'text-foreground-secondary' : 'text-foreground-tertiary',
                )}
              >
                {e?.status === 'ASKED' ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden /> {e.atMs != null ? formatDuration(e.atMs) : 'Asked'}
                  </>
                ) : e?.status === 'SKIPPED' ? (
                  <>
                    <SkipForward className="h-3.5 w-3.5" aria-hidden /> Skipped
                  </>
                ) : (
                  <>
                    <Circle className="h-3 w-3" aria-hidden /> Not marked
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
