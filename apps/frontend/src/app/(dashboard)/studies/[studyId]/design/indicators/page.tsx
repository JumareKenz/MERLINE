'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { useIndicators } from '@/hooks/use-indicators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ArrowRight, ArrowLeft, BarChart3, Plus, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';

export default function IndicatorsStep() {
  const { study, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState<string | null>(null);

  const { data: studyIndicators, isLoading: studyLoading, refetch: refetchStudy } = useIndicators({ study_id: studyId });
  const { data: libraryData, isLoading: libraryLoading } = useIndicators({ search: search || undefined });

  const linked = studyIndicators?.data?.data || [];
  const library = (libraryData?.data?.data || []).filter((ind: any) => !linked.some((l: any) => l.id === ind.id));

  const linkIndicator = async (indicatorId: string) => {
    setLinking(indicatorId);
    try {
      await API.indicators.study.link(studyId, indicatorId);
      refetchStudy();
      toast.success('Indicator linked');
    } catch {
      toast.error('Failed to link indicator');
    } finally {
      setLinking(null);
    }
  };

  const unlinkIndicator = async (indicatorId: string) => {
    setLinking(indicatorId);
    try {
      await API.indicators.study.unlink(studyId, indicatorId);
      refetchStudy();
      toast.success('Indicator unlinked');
    } catch {
      toast.error('Failed to unlink indicator');
    } finally {
      setLinking(null);
    }
  };

  const proceed = () => {
    if (linked.length > 0) markStepComplete('indicators');
    router.push(`/studies/${studyId}/design/instruments`);
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Indicators</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            Link measurable indicators to this study. Ask the AI Copilot for recommendations aligned with your objectives and sector.
          </p>
        </div>
        <Link href={`/indicators/new?study_id=${studyId}`}>
          <Button size="sm" className="h-8 px-3 text-[13px] shrink-0">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Indicator
          </Button>
        </Link>
      </div>

      {/* Linked indicators */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Study Indicators ({linked.length})</CardTitle>
            {linked.length > 0 && (
              <span className="text-[11px] text-success font-medium">✓ {linked.length} linked</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {studyLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : linked.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" strokeWidth={1.5} />}
              title="No indicators linked yet"
              description="Link indicators from the library below or create new ones."
              className="py-8"
            />
          ) : (
            <div className="divide-y divide-border">
              {linked.map((ind: any) => (
                <div key={ind.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{ind.name}</p>
                    <p className="text-[11px] text-foreground-tertiary">
                      {ind.indicator_type} · {ind.unit || 'No unit'} · {ind.frequency || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(ind.baseline_value != null || ind.target_value != null) && (
                      <span className="text-[11px] text-foreground-tertiary tabular-nums">
                        {ind.baseline_value ?? '—'} → {ind.target_value ?? '—'}
                      </span>
                    )}
                    <Link href={`/indicators/${ind.id}`} className="text-foreground-tertiary hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-7 px-2 text-[12px] text-foreground-tertiary hover:text-destructive"
                      disabled={linking === ind.id}
                      onClick={() => unlinkIndicator(ind.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicator library */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Indicator Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-tertiary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicators…"
              className="pl-8 h-8 text-[13px]"
            />
          </div>

          {libraryLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : library.length === 0 ? (
            <p className="text-[13px] text-foreground-tertiary text-center py-6">
              {search ? 'No indicators match your search.' : 'All library indicators are already linked.'}
            </p>
          ) : (
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {library.slice(0, 20).map((ind: any) => (
                <div key={ind.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{ind.name}</p>
                    <p className="text-[11px] text-foreground-tertiary">{ind.indicator_type} · {ind.unit || 'No unit'}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 px-2 text-[12px] shrink-0"
                    disabled={linking === ind.id}
                    onClick={() => linkIndicator(ind.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Link
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/logframe`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Logframe
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={proceed}>
          Instruments <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
