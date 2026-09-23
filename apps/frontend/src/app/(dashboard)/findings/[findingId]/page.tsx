'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Quote, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { EvidenceReference } from '@/components/findings/evidence-reference';
import { useApproveFinding, useArchiveFinding, useFinding, usePublishFinding, useRejectFinding } from '@/hooks/use-findings';
import { useSession } from '@/hooks/use-session';
import { API } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import type { FindingStatus } from '@/types/finding';

const STAGES: { key: string; label: string; reached: (s: FindingStatus) => boolean }[] = [
  { key: 'draft', label: 'Drafted', reached: () => true },
  { key: 'approved', label: 'Approved', reached: (s) => s === 'APPROVED' || s === 'PUBLISHED' },
  { key: 'published', label: 'Published', reached: (s) => s === 'PUBLISHED' },
];

function LifecycleRail({ status }: { status: FindingStatus }) {
  if (status === 'REJECTED' || status === 'ARCHIVED') return null;
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Finding progress">
      {STAGES.map((stage, i) => {
        const reached = stage.reached(status);
        return (
          <li key={stage.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold',
                reached ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong text-foreground-tertiary',
              )}
            >
              {reached ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-[13px] font-medium', reached ? 'text-foreground' : 'text-foreground-tertiary')}>
              {stage.label}
              <span className="sr-only">{reached ? ' (done)' : ' (not yet)'}</span>
            </span>
            {i < STAGES.length - 1 && <span aria-hidden className={cn('h-px flex-1', reached ? 'bg-primary' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function FindingDetailPage() {
  const { findingId } = useParams<{ findingId: string }>();
  const { data, isLoading, isError, error, refetch } = useFinding(findingId);
  const session = useSession();
  const approve = useApproveFinding();
  const reject = useRejectFinding();
  const publish = usePublishFinding();
  const archive = useArchiveFinding();
  const [confirm, setConfirm] = useState<'reject' | 'publish' | 'archive' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  if (isLoading) return <LoadingState message="Loading finding" />;
  const finding = data?.data?.data;
  if (isError || !finding) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This finding could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  const quotations = finding.quotations ?? [];
  const reviewable = ['DRAFT', 'IN_REVIEW'].includes(finding.status);
  const canApprove = session.can('approve.findings') && reviewable;
  const canPublish = session.can('publish.findings') && finding.status === 'APPROVED';
  const canArchive = session.can('edit.findings') && !['ARCHIVED', 'PUBLISHED'].includes(finding.status);

  const confirmCopy = {
    reject: { title: 'Reject this finding?', description: 'It will be marked rejected. Its quotations stay linked for the record.', label: 'Reject', danger: true },
    publish: {
      title: 'Publish this finding?',
      description: 'Publishing makes it part of the project’s reported results. The server re-checks that every quoted participant consented to publication.',
      label: 'Publish',
      danger: false,
    },
    archive: { title: 'Archive this finding?', description: 'It will be hidden from active work. Nothing is deleted.', label: 'Archive', danger: false },
    delete: {
      title: 'Delete this finding?',
      description: 'It moves to the Trash with its quotations. The transcripts it quotes are not affected. An administrator can restore it.',
      label: 'Delete',
      danger: true,
    },
  } as const;

  const run = async (action: 'reject' | 'publish' | 'archive' | 'delete') => {
    if (action === 'delete') {
      setDeleting(true);
      try {
        await API.findings.delete(finding.id);
        queryClient.invalidateQueries({ queryKey: ['findings'] });
        toast.success('Finding moved to the Trash');
        router.push('/findings');
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? 'The finding could not be deleted');
      } finally {
        setDeleting(false);
        setConfirm(null);
      }
      return;
    }
    const mutation = action === 'reject' ? reject : action === 'publish' ? publish : archive;
    await mutation.mutateAsync(finding.id).catch(() => undefined);
    setConfirm(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={finding.theme ?? 'Finding'}
        title={finding.title}
        meta={<StatusBadge status={finding.status} />}
        actions={
          <>
            {session.can('delete.findings') && (
              <Button variant="ghost" onClick={() => setConfirm('delete')} aria-label="Delete finding">
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
            {canArchive && (
              <Button variant="ghost" onClick={() => setConfirm('archive')}>
                Archive
              </Button>
            )}
            {canApprove && (
              <>
                <Button variant="secondary" onClick={() => setConfirm('reject')}>
                  Reject
                </Button>
                <Button onClick={() => approve.mutate(finding.id)} loading={approve.isPending} disabled={quotations.length === 0}>
                  Approve
                </Button>
              </>
            )}
            {canPublish && <Button onClick={() => setConfirm('publish')}>Publish</Button>}
          </>
        }
      />

      <LifecycleRail status={finding.status} />

      {finding.source === 'AI' && (
        <p className="mb-6 flex items-start gap-2.5 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
          <span>
            AI draft. Every quotation below was checked word for word against the transcript before it was saved; the interpretation still needs a
            researcher’s judgement.
          </span>
        </p>
      )}

      <section className="mb-8">
        <h2 className="type-eyebrow mb-3">Interpretation</h2>
        <p className="whitespace-pre-wrap text-[16px] leading-[1.7] text-foreground">{finding.interpretation}</p>
        <p className="mt-3 text-[13px] text-foreground-tertiary">
          Created {formatDate(finding.createdAt)}
          {finding.reviewedAt ? ` · reviewed ${formatDate(finding.reviewedAt)}` : ''}
          {finding.publishedAt ? ` · published ${formatDate(finding.publishedAt)}` : ''}
        </p>
      </section>

      <section aria-labelledby="evidence-heading">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="evidence-heading" className="type-eyebrow">
            Evidence · {quotations.length}
          </h2>
          <Link href="/transcripts" className="text-[13px] font-medium text-foreground-link hover:underline">
            Add from a transcript
          </Link>
        </div>
        {quotations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-warning/40 bg-warning-bg/50">
            <EmptyState
              size="inline"
              icon={<Quote />}
              title="No evidence yet"
              description="This finding cannot be approved until at least one verbatim quotation from a transcript segment is attached."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {quotations.map((q) => (
              <EvidenceReference key={q.id} quotation={q} />
            ))}
          </div>
        )}
      </section>

      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmCopy[confirm].title}
          description={confirmCopy[confirm].description}
          confirmLabel={confirmCopy[confirm].label}
          variant={confirmCopy[confirm].danger ? 'danger' : 'default'}
          loading={reject.isPending || publish.isPending || archive.isPending || deleting}
          onConfirm={() => run(confirm)}
        />
      )}
    </div>
  );
}
