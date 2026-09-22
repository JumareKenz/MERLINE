'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Sparkles, User, Quote as QuoteIcon } from 'lucide-react';
import {
  useFinding,
  useApproveFinding,
  useRejectFinding,
  usePublishFinding,
  useArchiveFinding,
} from '@/hooks/use-findings';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate, formatDuration } from '@/lib/utils';

export default function FindingDetailPage() {
  const { findingId } = useParams<{ findingId: string }>();
  const { data, isLoading, isError, error, refetch } = useFinding(findingId);
  const { can } = usePermissions();

  const approve = useApproveFinding();
  const reject = useRejectFinding();
  const publish = usePublishFinding();
  const archive = useArchiveFinding();

  const finding = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !finding) {
    return <ErrorState message={error?.message || 'Finding not found'} onRetry={() => refetch()} />;
  }

  const canApprove = can('approve.findings') && ['DRAFT', 'IN_REVIEW'].includes(finding.status);
  const canPublish = can('publish.findings') && finding.status === 'APPROVED';
  const canArchive = can('edit.findings') && !['ARCHIVED', 'PUBLISHED'].includes(finding.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={finding.status} />
            {finding.source === 'AI' ? (
              <span className="inline-flex items-center gap-1 text-[12px] text-foreground-tertiary">
                <Sparkles className="h-3 w-3" /> AI-drafted ({finding.aiModel})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[12px] text-foreground-tertiary">
                <User className="h-3 w-3" /> Human
              </span>
            )}
            {finding.theme && <span className="text-[12px] text-foreground-tertiary">· {finding.theme}</span>}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{finding.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canApprove && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-[13px]"
                loading={reject.isPending}
                onClick={() => reject.mutate(finding.id)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-[13px]"
                loading={approve.isPending}
                onClick={() => approve.mutate(finding.id)}
              >
                Approve
              </Button>
            </>
          )}
          {canPublish && (
            <Button
              size="sm"
              className="h-8 px-3 text-[13px]"
              loading={publish.isPending}
              onClick={() => publish.mutate(finding.id)}
            >
              Publish
            </Button>
          )}
          {canArchive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-[13px]"
              loading={archive.isPending}
              onClick={() => archive.mutate(finding.id)}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {finding.source === 'AI' && (
        <div className="rounded-md bg-info-bg text-info px-3 py-2 text-[12px] flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          This finding was drafted by AI ({finding.aiProvider} / {finding.aiModel}) and has not been reviewed by a human yet.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] leading-relaxed">{finding.interpretation}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Evidence ({finding.quotations?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!finding.quotations || finding.quotations.length === 0 ? (
            <p className="text-[13px] text-foreground-tertiary py-6 text-center">
              No quotations yet — this finding cannot be approved until at least one is added, from a transcript segment.
            </p>
          ) : (
            <div className="space-y-3">
              {finding.quotations.map((quotation) => (
                <div key={quotation.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start gap-2">
                    <QuoteIcon className="h-3.5 w-3.5 text-foreground-tertiary shrink-0 mt-0.5" />
                    <p className="text-[13px] italic">&ldquo;{quotation.excerpt}&rdquo;</p>
                  </div>
                  {quotation.transcriptSegment && (
                    <p className="text-[11px] text-foreground-tertiary mt-1.5 ml-5.5">
                      Segment at {formatDuration(quotation.transcriptSegment.startMs)} · added {formatDate(quotation.createdAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
