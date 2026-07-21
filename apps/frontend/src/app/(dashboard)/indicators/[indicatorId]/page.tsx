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
import { toast } from 'sonner';
import type { RecordIndicatorValueDto, SetIndicatorTargetDto } from '@/types/indicator';

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
  const currentValue = values.length > 0 ? values[values.length - 1] : null;
  const targetValue = indicator.target_value;

  const handleRecordValue = async (formData: RecordIndicatorValueDto) => {
    try {
      await recordValue.mutateAsync({ indicatorId, data: formData });
      toast.success('Value recorded');
      setShowValueForm(false);
    } catch {
      toast.error('Failed to record value');
    }
  };

  const handleSetTarget = async (formData: SetIndicatorTargetDto) => {
    try {
      await setTarget.mutateAsync({ indicatorId, data: formData });
      toast.success('Target set');
      setShowTargetForm(false);
    } catch {
      toast.error('Failed to set target');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <StatusBadge status={indicator.status} />
          <span className="text-sm text-foreground-secondary font-mono">{indicator.code}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{indicator.name}</h1>
        {indicator.definition && (
          <p className="text-foreground-secondary mt-2 max-w-2xl">{indicator.definition}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-foreground-secondary mb-1">Current Value</p>
            <p className="text-2xl font-semibold">{currentValue?.value != null ? currentValue.value : '—'}</p>
            <p className="text-xs text-foreground-secondary mt-1">{currentValue?.period || ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-foreground-secondary mb-1">Target</p>
            <p className="text-2xl font-semibold">{targetValue != null ? targetValue : '—'}</p>
            <p className="text-xs text-foreground-secondary mt-1">{indicator.target_year ? `by ${indicator.target_year}` : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-foreground-secondary mb-1">Data Points</p>
            <p className="text-2xl font-semibold">{values.length}</p>
            <p className="text-xs text-foreground-secondary mt-1">Total records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-foreground-secondary mb-1">Measurement</p>
            <p className="text-2xl font-semibold">{indicator.unit || '—'}</p>
            <p className="text-xs text-foreground-secondary mt-1">{indicator.data_type || ''}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowValueForm(!showValueForm)}>
          Record Value
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowTargetForm(!showTargetForm)}>
          Set Target
        </Button>
      </div>

      {showValueForm && (
        <Card>
          <CardHeader><CardTitle>Record Value</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Set Target</CardTitle></CardHeader>
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
          <TabsTrigger value="values">Values</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Value Trend</CardTitle></CardHeader>
            <CardContent>
              {values.length > 0 ? (
                <IndicatorValueChart values={values} />
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-foreground-secondary">
                  No values recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values" className="pt-4">
          <Card>
            <CardHeader><CardTitle>All Values</CardTitle></CardHeader>
            <CardContent>
              {values.length > 0 ? (
                <div className="space-y-2">
                  {[...values].reverse().map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium text-sm">{v.value}</p>
                        <p className="text-xs text-foreground-secondary">
                          {v.period} — {v.notes ? v.notes : 'Manual entry'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-sm text-foreground-secondary">
                  No values recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Indicator Information</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-foreground-secondary">Type</p>
                  <p className="font-medium capitalize">{indicator.indicator_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Sector</p>
                  <p className="font-medium">{indicator.sector || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Unit</p>
                  <p className="font-medium">{indicator.unit || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Data Type</p>
                  <p className="font-medium capitalize">{indicator.data_type || '—'}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Methodology</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-foreground-secondary">Data Source</p>
                  <p className="font-medium">{indicator.data_source || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Collection Method</p>
                  <p className="font-medium">{indicator.collection_method || '—'}</p>
                </div>
                {indicator.formula && (
                  <div>
                    <p className="text-sm text-foreground-secondary">Formula</p>
                    <code className="text-xs bg-background-surface px-2 py-0.5 rounded">{indicator.formula}</code>
                  </div>
                )}
                <div>
                  <p className="text-sm text-foreground-secondary">Frequency</p>
                  <p className="font-medium capitalize">{indicator.frequency || '—'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
