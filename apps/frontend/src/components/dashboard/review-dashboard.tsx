'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Hourglass, KeyRound, Send, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useReviewSummary } from '@/hooks/use-transcript-review';
import { useEnumerators } from '@/hooks/use-enumerators';
import { useSession } from '@/hooks/use-session';
import { typeLabel } from '@/lib/interview-types';
import { cn } from '@/lib/utils';
import type { ReviewSummary } from '@/types/review';

interface Tile {
  key: string;
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: typeof Send;
  tone: 'attention' | 'quiet' | 'good';
}

/** The counts a person can act on, grouped by whose turn it is. */
export function tilesFor(s: ReviewSummary): Tile[] {
  const b = s.byStatus;
  return [
    {
      key: 'admin',
      label: 'Waiting for your approval',
      value: b.SUBMITTED_FOR_ADMIN_REVIEW,
      hint: 'Enumerators have reviewed these. Compare, correct, then approve or return.',
      href: '/transcripts?review=SUBMITTED_FOR_ADMIN_REVIEW',
      icon: Send,
      tone: 'attention',
    },
    {
      key: 'enumerators',
      label: 'With enumerators',
      value: b.AVAILABLE_FOR_REVIEW + b.ENUMERATOR_EDITING + b.RETURNED_FOR_CORRECTION,
      hint: 'Ready for, or being corrected by, the person who conducted the interview.',
      href: '/transcripts?review=AVAILABLE_FOR_REVIEW',
      icon: UsersRound,
      tone: 'quiet',
    },
    {
      key: 'processing',
      label: 'Being transcribed',
      value: b.RECORDING_SUBMITTED + b.TRANSCRIPTION_PROCESSING,
      hint: 'Recordings that have arrived and are not transcribed yet.',
      href: '/transcripts?review=TRANSCRIPTION_PROCESSING',
      icon: Hourglass,
      tone: 'quiet',
    },
    {
      key: 'approved',
      label: 'Approved for analysis',
      value: b.APPROVED + b.LOCKED,
      hint: 'The only transcripts insights, findings and reports can use.',
      href: '/analysis',
      icon: CheckCircle2,
      tone: 'good',
    },
  ];
}

export function ReviewDashboard() {
  const session = useSession();
  const canTranscripts = !session.isResolved || session.can('view.transcripts');
  const summary = useReviewSummary();
  const enumerators = useEnumerators({});
  const canEnumerators = !session.isResolved || session.can('view.enumerators');

  const list = enumerators.data ?? [];
  const noCode = list.filter((e) => e.isActive && (e.accessCode.state === 'NONE' || e.accessCode.state === 'REVOKED' || e.accessCode.state === 'EXPIRED')).length;
  const unused = list.filter((e) => e.isActive && e.accessCode.state === 'UNUSED').length;

  return (
    <div>
      <PageHeader title="Dashboard" description="What needs attention now, from the field to the final report." />

      {canTranscripts &&
        (summary.isLoading ? (
          <LoadingState message="Loading transcript status" rows={3} />
        ) : summary.isError ? (
          <ErrorState message="The transcript status could not be loaded." onRetry={() => summary.refetch()} />
        ) : (
          summary.data && (
            <>
              <section aria-label="Transcript review" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {tilesFor(summary.data).map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.key}
                      href={t.href}
                      className={cn(
                        'group flex flex-col rounded-xl border bg-background-elevated p-5 shadow-soft transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        t.tone === 'attention' && t.value > 0 ? 'border-lemon-500' : 'border-border-subtle',
                      )}
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium text-foreground-secondary">
                        <Icon className="h-4 w-4 text-primary" aria-hidden /> {t.label}
                      </span>
                      <span className="mt-2 font-display text-[34px] font-semibold leading-none tabular-nums text-foreground">{t.value}</span>
                      <span className="mt-2 text-[13px] leading-snug text-foreground-tertiary">{t.hint}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-foreground-link group-hover:underline">
                        Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </Link>
                  );
                })}
              </section>

              <section aria-labelledby="types-h" className="mt-10">
                <h2 id="types-h" className="mb-3 text-[16px] font-semibold text-foreground">
                  By interview type
                </h2>
                {summary.data.byType.length === 0 ? (
                  <EmptyState
                    size="inline"
                    title="No transcripts yet"
                    description="Once enumerators submit recordings, each interview type appears here with how much of it is approved."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border-subtle">
                    <table className="w-full min-w-[420px] text-left text-[14px]">
                      <thead>
                        <tr className="bg-background-surface text-[12px] uppercase tracking-[0.06em] text-foreground-tertiary">
                          <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Transcripts</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Approved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.data.byType.map((row) => (
                          <tr key={row.type} className="border-t border-border-subtle">
                            <td className="px-4 py-2.5">
                              <Link href={`/transcripts?type=${row.type}`} className="font-medium text-foreground-link hover:underline">
                                {typeLabel(row.type)}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.total}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{row.approved}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        ))}

      {canEnumerators && !enumerators.isLoading && !enumerators.isError && (
        <section aria-labelledby="enum-h" className="mt-10">
          <h2 id="enum-h" className="mb-3 text-[16px] font-semibold text-foreground">
            Enumerators
          </h2>
          {list.length === 0 ? (
            <EmptyState
              size="inline"
              icon={<UsersRound />}
              title="No enumerators yet"
              description="Add the people who collect interviews. Each gets their own access code for the field app."
              action={
                <Link href="/enumerators" className="text-[14px] font-medium text-foreground-link hover:underline">
                  Add an enumerator
                </Link>
              }
            />
          ) : (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-border-subtle bg-background-elevated px-5 py-4 text-[14px]">
              <span>
                <strong className="tabular-nums">{list.filter((e) => e.isActive).length}</strong> active of <strong className="tabular-nums">{list.length}</strong>
              </span>
              {noCode > 0 && (
                <Link href="/enumerators?code=REVOKED" className="inline-flex items-center gap-1.5 font-medium text-foreground-link hover:underline">
                  <KeyRound className="h-4 w-4" aria-hidden /> {noCode} without a working code
                </Link>
              )}
              {unused > 0 && <span className="text-foreground-secondary">{unused} have not signed in yet</span>}
              <Link href="/enumerators" className="ml-auto inline-flex items-center gap-1 font-medium text-foreground-link hover:underline">
                Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
