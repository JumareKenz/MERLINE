'use client';

import { useParams } from 'next/navigation';
import { useIndicator, useIndicatorValues, useRecordIndicatorValue, useSetIndicatorTarget } from '@/hooks/use-indicators';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndicatorValueChart } from '@/components/indicators/indicator-value-chart';
import { IndicatorValueForm } from '@/components/indicators/indicator-value-form';
import { IndicatorTargetForm } from '@/components/indicators/indicator-target-form';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { Plus, Target, TrendingUp, TrendingDown, Minus, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecordIndicatorValueDto, SetIndicatorTargetDto } from '@/types/indicator';

function ProgressBar({ value, target }: { value: number | null; target: number | null }) {
  if (value == null || target == null || target === 0) return null;
  const pct = Math.min((value / target) * 100, 100);
  const color =
    pct >= 90 ? 'bg-success' : pct >= 60 ? 'bg-warning' : 'bg-error';
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-foreground-tertiary">Progress toward target</span>
        <span className="text-[12px] font-semibold tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TrendIcon({ values }: { values: Array<{ value: number }> }) {
  if (values.length < 2) return <Minus className="h-4 w-4 text-foreground-tertiary" />;
  const last = values[values.length - 1].value;
  const prev = values[values.length - 2].value;
  if (last > prev) return <TrendingUp className="h-4 w-4 text-success" />;
  if (last < prev) return <TrendingDown className="h-4 w-4 text-error" />;
  return <Minus className="h-4 w-4 text-foreground-tertiary" />;
}

export default function IndicatorDetailPage() {
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const { data, isLoading, isError, error, refetch } = useIndicator(indicatorId);
  const { data: valuesData } = useIndicatorValues(indicatorId);
  const recordValue = useRecordIndicatorValue();
  const setTarget = useSetIndicatorTarget();

  const [showValueForm, setShowValueForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-96" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const indicator = data?.data?.data;
  if (!indicator) return <ErrorState message="Indicator not found" />;

  const values = valuesData?.data?.data || [];
  const latestValue = values.length > 0 ? values[values.length - 1] : null;
  const targetValue = indicator.target_value ?? null;
  const currentVal = latestValue?.value ?? null;

  const handleRecordValue = (formData: RecordIndicatorValueDto) => {
    recordValue.mutate(
      { indicatorId, data: formData },
      { onSuccess: () => setShowValueForm(false) },
    );
  };

  const handleSetTarget = (formData: SetIndicatorTargetDto) => {
    setTarget.mutate(
      { indicatorId, data: formData },
      { onSuccess: () => setShowTargetForm(false) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[13px] text-foreground-secondary font-mono">{indicator.code}</span>
            {indicator.status && <StatusBadge status={indicator.status} />}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{indicator.name}</h1>
          {indicator.definition && (
            <p className="text-[13px] text-foreground-tertiary mt-1 max-w-2xl">{indicator.definition}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-[13px]"
            onClick={() => setShowTargetForm(!showTargetForm)}
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            Set Target
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 text-[13px]"
            onClick={() => setShowValueForm(!showValueForm)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Value
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-[12px] text-foreground-tertiary mb-1.5">Current Value</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] font-semibold tracking-tight tabular-nums">
                {currentVal != null ? currentVal.toLocaleString() : '—'}
              </p>
              {indicator.unit && (
                <span className="text-[13px] text-foreground-tertiary">{indicator.unit}</span>
              )}
              {values.length >= 2 && <TrendIcon values={values} />}
            </div>
            {latestValue?.period && (
              <p className="text-[12px] text-foreground-tertiary mt-0.5">{latestValue.period}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-[12px] text-foreground-tertiary mb-1.5">Target</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] font-semibold tracking-tight tabular-nums">
                {targetValue != null ? targetValue.toLocaleString() : '—'}
              </p>
              {indicator.unit && targetValue != null && (
                <span className="text-[13px] text-foreground-tertiary">{indicator.unit}</span>
              )}
            </div>
            {indicator.target_year && (
              <p className="text-[12px] text-foreground-tertiary mt-0.5">by {indicator.target_year}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-[12px] text-foreground-tertiary mb-1.5">Baseline</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] font-semibold tracking-tight tabular-nums">
                {indicator.baseline_value != null ? indicator.baseline_value.toLocaleString() : '—'}
              </p>
              {indicator.unit && indicator.baseline_value != null && (
                <span className="text-[13px] text-foreground-tertiary">{indicator.unit}</span>
              )}
            </div>
            <p className="text-[12px] text-foreground-tertiary mt-0.5">
              {indicator.baseline_year ? `Year ${indicator.baseline_year}` : 'Starting point'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-[12px] text-foreground-tertiary mb-1.5">Data Points</p>
            <div className="flex items-baseline gap-2">
              <p className="text-[26px] font-semibold tracking-tight tabular-nums">{values.length}</p>
              <Database className="h-4 w-4 text-foreground-tertiary" />
            </div>
            <p className="text-[12px] text-foreground-tertiary mt-0.5">
              {values.length > 0 ? `Last: ${formatDate(latestValue?.created_at ?? '')}` : 'No data yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress toward target */}
      {currentVal != null && targetValue != null && (
        <Card>
          <CardContent className="p-5">
            <ProgressBar value={currentVal} target={targetValue} />
            <div className="flex items-center justify-between mt-3 text-[12px] text-foreground-tertiary">
              <span>
                Baseline: {indicator.baseline_value != null ? indicator.baseline_value.toLocaleString() : '—'}{' '}
                {indicator.unit || ''}
              </span>
              <span>
                Target: {targetValue.toLocaleString()} {indicator.unit || ''}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline forms */}
      {showValueForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Record New Value</CardTitle>
          </CardHeader>
          <CardContent>
            <IndicatorValueForm
              onSubmit={handleRecordValue}
              isSubmitting={recordValue.isPending}
              onCancel={() => setShowValueForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {showTargetForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Set Target</CardTitle>
          </CardHeader>
          <CardContent>
            <IndicatorTargetForm
              onSubmit={handleSetTarget}
              isSubmitting={setTarget.isPending}
              onCancel={() => setShowTargetForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="values">Values ({values.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {values.length > 0 ? (
                <IndicatorValueChart values={values} />
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Database className="h-8 w-8 text-foreground-tertiary mb-3" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium text-foreground-secondary">No data yet</p>
                  <p className="text-[12px] text-foreground-tertiary mt-0.5">
                    Record your first value to start tracking this indicator.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values" className="pt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Data History</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => setShowValueForm(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {values.length > 0 ? (
                <div className="divide-y divide-border">
                  {[...values].reverse().map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-[13px] font-semibold tabular-nums">
                          {v.value.toLocaleString()}
                          {indicator.unit ? ` ${indicator.unit}` : ''}
                        </p>
                        <p className="text-[12px] text-foreground-tertiary mt-0.5">
                          {v.period && <span>{v.period} · </span>}
                          {v.created_at ? formatDate(v.created_at) : ''}
                        </p>
                      </div>
                      {v.notes && (
                        <p className="text-[12px] text-foreground-tertiary max-w-xs text-right">{v.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-foreground-tertiary py-8 text-center">
                  No values recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Indicator Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Type', value: indicator.indicator_type?.replace(/_/g, ' ') },
                  { label: 'Sector', value: indicator.sector },
                  { label: 'Unit', value: indicator.unit },
                  { label: 'Data Type', value: indicator.data_type },
                  { label: 'Frequency', value: indicator.frequency },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className="text-[13px] font-medium capitalize">{value || '—'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Methodology</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Data Source', value: indicator.data_source },
                  { label: 'Collection Method', value: indicator.collection_method },
                  { label: 'Disaggregation', value: indicator.disaggregations?.map((d) => d.dimension).join(', ') },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className="text-[13px] font-medium">{value || '—'}</p>
                  </div>
                ))}
                {indicator.formula && (
                  <div>
                    <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-0.5">
                      Formula
                    </p>
                    <code className="text-[12px] bg-background-subtle px-2 py-1 rounded border border-border font-mono block">
                      {indicator.formula}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
