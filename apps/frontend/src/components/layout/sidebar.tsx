'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  ClipboardList,
  BarChart3,
  FileText,
  Users,
  Shield,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  Database,
  FileCheck,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Assistant', href: '/ai', icon: Sparkles },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Studies', href: '/studies', icon: FlaskConical },
  { label: 'Questionnaires', href: '/questionnaires', icon: ClipboardList },
  { label: 'Indicators', href: '/indicators', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileText },
];

const DATA_COLLECTION_ITEMS: NavItem[] = [
  { label: 'Assignments', href: '/assignments', icon: ClipboardList },
  { label: 'Submissions', href: '/submissions', icon: FileCheck },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'AI Settings', href: '/admin/ai', icon: Cpu },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Roles', href: '/admin/roles', icon: Shield },
];

const SETTINGS_ITEMS: NavItem[] = [
  { label: 'Organizations', href: '/organizations', icon: Building2 },
  { label: 'Workspaces', href: '/workspaces', icon: Layers },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Activity Log', href: '/admin/activity-log', icon: Activity },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary border-l-[3px] border-primary ml-0 pl-[9px]'
          : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground ml-0 pl-3',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-white">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function NavSection({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <Separator className="my-2" />;
  return (
    <div className="px-3 pt-4 pb-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground-tertiary">
        {label}
      </p>
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen } = useUIStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col bg-background-surface border-r border-border transition-all duration-200 ease-standard',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className={cn('flex h-14 items-center border-b border-border px-4', sidebarCollapsed && 'justify-center')}>
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="text-lg font-semibold">Merline</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href="/dashboard">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <span className="text-sm font-bold text-white">M</span>
              </div>
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}

          <NavSection label="Data Collection" collapsed={sidebarCollapsed} />
          {DATA_COLLECTION_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}

          <NavSection label="Administration" collapsed={sidebarCollapsed} />
          {ADMIN_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}

          <NavSection label="System" collapsed={sidebarCollapsed} />
          {SETTINGS_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </>
  );
}
