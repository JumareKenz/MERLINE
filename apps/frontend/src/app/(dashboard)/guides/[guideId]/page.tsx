'use client';

import { useParams } from 'next/navigation';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { GuideEditor } from '@/components/guides/guide-editor';
import { useGuide } from '@/hooks/use-guides';

export default function GuidePage() {
  const { guideId } = useParams<{ guideId: string }>();
  const { data, isLoading, isError, error, refetch } = useGuide(guideId);
  if (isLoading) return <LoadingState message="Loading guide" rows={6} />;
  if (isError || !data) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This guide could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }
  return <GuideEditor guide={data} />;
}
