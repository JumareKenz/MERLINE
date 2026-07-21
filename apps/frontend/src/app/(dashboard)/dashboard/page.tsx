'use client';

import { useState } from 'react';
import { ExecutiveDashboard } from '@/components/dashboard/executive-dashboard';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('last_30d');

  return <ExecutiveDashboard dateRange={dateRange} onDateRangeChange={setDateRange} />;
}
