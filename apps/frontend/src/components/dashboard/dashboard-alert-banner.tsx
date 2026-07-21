'use client';

import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardAlert } from '@/types/dashboard';

const severityConfig = {
  critical: { icon: AlertCircle, bg: 'bg-error-bg text-error border-error', dismissible: false },
  warning: { icon: AlertTriangle, bg: 'bg-warning-bg text-warning border-warning', dismissible: true },
  info: { icon: Info, bg: 'bg-info-bg text-info border-info', dismissible: true },
};

interface DashboardAlertBannerProps {
  alerts: DashboardAlert[];
}

export function DashboardAlertBanner({ alerts }: DashboardAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id) && a.severity === 'critical');

  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn('flex items-center gap-3 rounded-md border-l-4 px-4 py-3 text-sm', config.bg)}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{alert.title}</p>
              <p className="text-foreground-secondary">{alert.message}</p>
            </div>
            {config.dismissible && (
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
