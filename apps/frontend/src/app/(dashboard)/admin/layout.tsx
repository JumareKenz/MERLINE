'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { useSession } from '@/hooks/use-session';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/settings', label: 'Organization', anyOf: ['view.organizations', 'edit.organizations'] },
  { href: '/admin/users', label: 'Members', anyOf: ['view.users'] },
  { href: '/admin/roles', label: 'Roles', anyOf: ['view.roles'] },
  { href: '/admin/ai', label: 'AI', anyOf: ['configure.ai', 'view.ai'] },
  { href: '/admin/activity-log', label: 'Activity', anyOf: ['view.audit'] },
];

/**
 * Settings: everything administrative behind one entry in the account area
 * instead of five sidebar links. Tabs follow permissions; each page's API
 * enforces them independently.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();
  const tabs = TABS.filter((t) => !session.isResolved || session.canAny(...t.anyOf));

  return (
    <div>
      <PageHeader title="Settings" description="Your organization, its members and roles, AI configuration and the audit trail." className="mb-6" />
      <nav aria-label="Settings sections" className="-mx-4 mb-8 overflow-x-auto border-b border-border-subtle px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-6">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative -mb-px inline-flex h-11 items-center border-b-2 text-[14px] font-medium transition-colors',
                    active ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
