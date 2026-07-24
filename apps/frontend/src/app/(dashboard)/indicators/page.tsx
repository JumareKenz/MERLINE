'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IndicatorTable } from '@/components/indicators/indicator-table';
import { useIndicators } from '@/hooks/use-indicators';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3 } from 'lucide-react';

export default function IndicatorsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useIndicators({ search });

  const indicators = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Indicators</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">Browse the indicator library</p>
        </div>
        <Link href="/indicators/new">
          <Button size="sm" className="h-8 px-3 text-[13px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Indicator
          </Button>
        </Link>
      </div>

      <IndicatorTable
        data={indicators}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
