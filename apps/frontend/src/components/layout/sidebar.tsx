'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Users,
  Shield,
  Settings,
  Activity,
  Building2,
  Layers,
  Sparkles,
  Cpu,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_HOME } from '@/lib/routes';
import { useUIStore } from '@/stores/ui-store';
import { Logo } from '@/components/brand/logo';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * MERL entries removed from navigation. Their route files remain on disk and
 * are still addressable by URL, but their backend modules are deregistered so
 * they no longer load data. They are retained for reference and for any
 * data-export work until the data-preservation decision is confirmed.
 *
 * Removed: Dashboard (MERL metrics only), Studies, Questionnaires, Indicators,
 * Reports, Assignments, Submissions, and the Field Operations group.
 *
 * Interview Guides, Interviews, Approvals and Reports return in Phase 2 as
 * qualitative surfaces. See LEGACY.md.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'research',
    label: 'Research',
    items: [
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'AI Assistant', href: '/ai', icon: Sparkles },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Roles', href: '/admin/roles', icon: Shield },
      { label: 'AI Settings', href: '/admin/ai', icon: Cpu },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Organizations', href: '/organizations', icon: Building2 },
      { label: 'Workspaces', href: '/workspaces', icon: Layers },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
      { label: 'Activity', href: '/admin/activity-log', icon: Activity },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'relative flex items-center gap-2.5 rounded-[5px] transition-colors duration-150',
        collapsed
          ? 'h-8 w-8 justify-center mx-auto'
          : 'h-[30px] px-2.5',
        isActive
          ? 'bg-primary-50 text-primary dark:bg-primary-100/10 dark:text-primary-400'
          : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute inset-y-[4px] left-0 w-[2px] rounded-r-full bg-primary" />
      )}
      <item.icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <span className="text-[13px] leading-none truncate">{item.label}</span>
      )}
    </Link>
  );
}

function SectionHeader({
  label,
  collapsed: sidebarCollapsed,
  groupCollapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  groupCollapsed: boolean;
  onToggle: () => void;
}) {
  if (sidebarCollapsed) {
    return <div className="my-3 mx-2 h-px bg-border-subtle" />;
  }

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-2 pt-4 pb-1 group"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-tertiary group-hover:text-foreground-secondary transition-colors">
        {label}
      </span>
      <ChevronDown
        className={cn(
          'h-3 w-3 text-foreground-tertiary transition-transform duration-200',
          groupCollapsed && '-rotate-90'
        )}
      />
    </button>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen } = useUIStore();

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem('merline-nav-groups');
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem('merline-nav-groups', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-background-surface border-r border-border-subtle transition-all duration-300 ease-standard',
          sidebarCollapsed ? 'w-[52px]' : 'w-[220px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-border-subtle',
            sidebarCollapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          {sidebarCollapsed ? (
            <Link href={APP_HOME} className="flex items-center justify-center">
              <Logo variant="mark" height={22} />
            </Link>
          ) : (
            <Link href={APP_HOME} className="flex items-center">
              <Logo variant="full" theme="auto" height={22} />
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0">
          {NAV_GROUPS.map((group, index) => {
            const isGroupCollapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className={cn(index > 0 && !sidebarCollapsed && 'mt-0.5')}>
                <SectionHeader
                  label={group.label}
                  collapsed={sidebarCollapsed}
                  groupCollapsed={isGroupCollapsed}
                  onToggle={() => toggleGroup(group.id)}
                />
                {!isGroupCollapsed && (
                  <div className={cn('space-y-0.5', sidebarCollapsed && 'space-y-1')}>
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border-subtle p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'flex h-8 items-center gap-2 rounded-[5px] px-2 text-foreground-tertiary transition-colors hover:bg-background-hover hover:text-foreground w-full',
              sidebarCollapsed && 'justify-center px-0 w-8 mx-auto'
            )}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-[15px] w-[15px]" strokeWidth={1.75} />
            ) : (
              <>
                <PanelLeftClose className="h-[15px] w-[15px]" strokeWidth={1.75} />
                <span className="text-[12px]">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
