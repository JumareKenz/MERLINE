'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  new: 'New',
  studies: 'Studies',
  questionnaires: 'Questionnaires',
  indicators: 'Indicators',
  library: 'Library',
  'data-collection': 'Data Collection',
  assignments: 'Assignments',
  submissions: 'Submissions',
  enumerators: 'Enumerators',
  reports: 'Reports',
  generate: 'Generate',
  templates: 'Templates',
  admin: 'Administration',
  users: 'Users',
  invite: 'Invite',
  roles: 'Roles & Permissions',
  settings: 'Settings',
  'activity-log': 'Activity Log',
  organizations: 'Organizations',
  workspaces: 'Workspaces',
  profile: 'My Profile',
  notifications: 'Notifications',
  sync: 'Sync',
  preview: 'Preview',
  review: 'Review',
  deploy: 'Deploy',
  edit: 'Edit',
  teams: 'Teams',
};

function getBreadcrumbLabel(segment: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment)) return 'Detail';
  return BREADCRUMB_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (pathname === '/dashboard' || pathname === '/') return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center text-foreground-secondary hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;
        const label = getBreadcrumbLabel(segment);

        return (
          <div key={segment} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-foreground-tertiary" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">{label}</span>
            ) : (
              <Link
                href={href}
                className={cn(
                  'text-foreground-secondary hover:text-foreground transition-colors truncate max-w-[150px]'
                )}
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
