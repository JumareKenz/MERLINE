'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/use-session';
import { cn } from '@/lib/utils';

/** Reports and Findings are two views of the same evidence-based work; one nav item, two tabs. */
export function ReportsTabs() {
  const pathname = usePathname();
  const session = useSession();
  const tabs = [
    { href: '/analysis', label: 'Reports', show: !session.isResolved || session.canAny('view.reports') },
    { href: '/findings', label: 'Findings', show: !session.isResolved || session.canAny('view.findings') },
  ].filter((t) => t.show);
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Reports and findings" className="mb-6 flex gap-6 border-b border-border-subtle">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/');
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px h-11 border-b-2 text-[14px] font-medium leading-[44px] transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
