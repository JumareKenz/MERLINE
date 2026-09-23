import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Quotation } from '@/types/finding';

/**
 * A quotation shown as evidence: the verbatim excerpt, and a link to the
 * exact transcript segment it came from — the traceability chain that makes
 * a finding approvable.
 */
export function EvidenceReference({ quotation }: { quotation: Quotation }) {
  const segment = quotation.transcriptSegment;
  return (
    <figure className="relative rounded-lg border border-border-subtle bg-background-elevated py-3.5 pl-5 pr-4">
      <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-lemon-600" />
      <blockquote className="text-[15px] leading-[1.65] text-foreground">&ldquo;{quotation.excerpt}&rdquo;</blockquote>
      {segment && (
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-foreground-tertiary">
          <span>
            Segment #{segment.index} · {formatDuration(segment.startMs)}
            {segment.speakerLabel ? ` · ${segment.speakerLabel}` : ''}
          </span>
          <Link
            href={`/transcripts/${segment.transcriptId}#segment-${segment.index}`}
            className="inline-flex items-center gap-0.5 font-medium text-foreground-link hover:underline"
          >
            Open in transcript <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </figcaption>
      )}
    </figure>
  );
}
