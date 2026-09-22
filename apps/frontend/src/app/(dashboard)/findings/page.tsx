'use client';

import { FindingTable } from '@/components/findings/finding-table';
import { useFindings } from '@/hooks/use-findings';

export default function FindingsPage() {
  const { data, isLoading, isError, error, refetch } = useFindings();
  const findings = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Findings</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Every finding is evidence-linked. Quote a transcript segment, from a completed transcript, to start one.
        </p>
      </div>

      <FindingTable
        data={findings}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
