'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { Activity, Search, Filter } from 'lucide-react';

const MOCK_ACTIVITIES = [
  { id: '1', event: 'user.login', auditable_type: 'User', auditable_id: 'u1', user: { name: 'Admin User' }, ip_address: '192.168.1.1', created_at: new Date().toISOString() },
  { id: '2', event: 'project.created', auditable_type: 'Project', auditable_id: 'p1', user: { name: 'Jane Doe' }, ip_address: '192.168.1.2', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', event: 'study.updated', auditable_type: 'Study', auditable_id: 's1', user: { name: 'John Smith' }, ip_address: '192.168.1.3', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', event: 'submission.approved', auditable_type: 'Submission', auditable_id: 'sub1', user: { name: 'Admin User' }, ip_address: '192.168.1.1', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', event: 'indicator.created', auditable_type: 'Indicator', auditable_id: 'ind1', user: { name: 'Jane Doe' }, ip_address: '192.168.1.2', created_at: new Date(Date.now() - 172800000).toISOString() },
];

const EVENT_LABELS: Record<string, string> = {
  'user.login': 'User Login',
  'user.created': 'User Created',
  'user.updated': 'User Updated',
  'project.created': 'Project Created',
  'project.updated': 'Project Updated',
  'study.created': 'Study Created',
  'study.updated': 'Study Updated',
  'study.transition': 'Study Transition',
  'submission.created': 'Submission Created',
  'submission.approved': 'Submission Approved',
  'submission.rejected': 'Submission Rejected',
  'indicator.created': 'Indicator Created',
  'indicator.approved': 'Indicator Approved',
  'report.generated': 'Report Generated',
};

export default function ActivityLogPage() {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  const filtered = MOCK_ACTIVITIES.filter((a) => {
    if (search && !a.event.toLowerCase().includes(search.toLowerCase()) && !a.user?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (eventFilter && a.event !== eventFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
        <p className="text-foreground-secondary mt-1">Audit trail of all actions in your organization</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <Input placeholder="Search events..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-12 w-12 text-foreground-tertiary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No activity found</h3>
              <p className="text-sm text-foreground-secondary">No matching audit log entries found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-background-surface/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {EVENT_LABELS[activity.event] || activity.event.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-foreground-secondary">{activity.user?.name || 'System'}</span>
                      <span className="text-xs text-foreground-tertiary">on {activity.auditable_type}</span>
                      <span className="text-xs text-foreground-tertiary">{activity.ip_address}</span>
                    </div>
                  </div>
                  <span className="text-xs text-foreground-tertiary shrink-0">{formatDateTime(activity.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
