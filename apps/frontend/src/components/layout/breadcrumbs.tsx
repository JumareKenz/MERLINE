'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { findArea } from '@/lib/navigation';

const SEGMENT_LABELS: Record<string, string> = {
  new: 'New',
  edit: 'Edit',
  admin: 'Settings',
  users: 'Members',
  roles: 'Roles',
  ai: 'AI',
  'activity-log': 'Activity',
  settings: 'Settings',
  participants: 'Participants',
};

function isId(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment);
}

/**
 * "Area › Detail". Deliberately shallow: the area comes from the primary
 * navigation, and record ids read as "Detail" rather than raw UUIDs.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const area = findArea(pathname);
  const segments = pathname.split('/').filter(Boolean);
  const areaDepth = area ? area.href.split('/').filter(Boolean).length : 0;
  const rest = segments.slice(areaDepth);
  const crumbs = rest
    .map((segment, i) => ({
      href: '/' + segments.slice(0, areaDepth + i + 1).join('/'),
      label: isId(segment) ? 'Detail' : (SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' ')),
    }))
    .filter((c) => !(area?.href === '/admin/settings' && c.label === 'Settings'));

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[14px]">
      {area ? (
        crumbs.length > 0 ? (
          <Link href={area.href} className="truncate font-medium text-foreground-secondary transition-colors hover:text-foreground">
            {area.label}
          </Link>
        ) : (
          <span className="truncate font-semibold text-foreground" aria-current="page">
            {area.label}
          </span>
        )
      ) : null}
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {(area || i > 0) && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground-tertiary" aria-hidden />}
            {last ? (
              <span className="truncate font-semibold capitalize text-foreground" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="truncate capitalize text-foreground-secondary hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
