'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronsUpDown, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/providers/auth-provider';
import { useSession } from '@/hooks/use-session';
import { ACCOUNT_NAV, PRIMARY_NAV, isActive, type NavItem } from '@/lib/navigation';
import { APP_HOME } from '@/lib/routes';
import { cn, getInitials } from '@/lib/utils';

/** Until /auth/me answers, show everything rather than flash items in and out. */
function useVisibleNav() {
  const session = useSession();
  const visible = (item: NavItem) => !session.isResolved || item.anyOf.length === 0 || session.canAny(...item.anyOf);
  return { primary: PRIMARY_NAV.filter(visible), account: ACCOUNT_NAV.filter(visible), session };
}

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-3 rounded-md text-[14px] transition-colors duration-fast',
        collapsed ? 'mx-auto w-10 justify-center' : 'px-3',
        active
          ? 'bg-background-elevated font-semibold text-foreground shadow-soft ring-1 ring-border-subtle'
          : 'font-medium text-foreground-secondary hover:bg-background-hover hover:text-foreground',
      )}
    >
      {active && (
        <span
          aria-hidden
          className={cn('absolute rounded-full bg-lemon-600', collapsed ? 'bottom-1 left-1/2 h-[3px] w-4 -translate-x-1/2' : 'inset-y-2 left-0 w-[3px]')}
        />
      )}
      <Icon
        className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary dark:text-primary-600' : 'text-foreground-tertiary group-hover:text-foreground-secondary')}
        strokeWidth={1.75}
        aria-hidden
      />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const { profile } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const { account } = useVisibleNav();
  const name = user ? `${user.firstName} ${user.lastName}` : 'Account';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          collapsed ? 'justify-center p-1.5' : 'p-2',
        )}
        aria-label="Account menu"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
          {user ? getInitials(user.firstName, user.lastName) : '·'}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
              <span className="block truncate text-[12px] text-foreground-tertiary">
                {profile?.organization?.name ?? user?.email}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="py-2 font-normal">
          <p className="truncate text-[13px] font-semibold">{name}</p>
          <p className="truncate text-[12px] text-foreground-tertiary">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {account.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="text-[13px]">
              <item.icon className="mr-2 h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem className="text-[13px]" onSelect={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          {resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" aria-hidden /> : <Moon className="mr-2 h-4 w-4" aria-hidden />}
          {resolvedTheme === 'dark' ? 'Light appearance' : 'Dark appearance'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[13px] text-error" onSelect={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Profile and Settings, always visible above the account menu. */
function AccountLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { account } = useVisibleNav();
  return (
    <nav aria-label="Account" className="space-y-1">
      {account.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}) {
  const { primary } = useVisibleNav();

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between px-4')}>
        <Link href={APP_HOME} onClick={onNavigate} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Merline home">
          {collapsed ? <Logo variant="mark" height={28} /> : <Logo variant="full" height={26} />}
        </Link>
        {onToggleCollapsed && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-foreground-tertiary hover:bg-background-hover hover:text-foreground lg:flex"
            aria-label="Collapse navigation"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      <nav aria-label="Primary" className={cn('flex-1 space-y-1 overflow-y-auto py-2', collapsed ? 'px-2' : 'px-3')}>
        {primary.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 border-t border-border-subtle', collapsed ? 'p-2' : 'p-3')}>
        {onToggleCollapsed && collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="mx-auto hidden h-9 w-10 items-center justify-center rounded-md text-foreground-tertiary hover:bg-background-hover hover:text-foreground lg:flex"
            aria-label="Expand navigation"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        )}
        <AccountLinks collapsed={collapsed} onNavigate={onNavigate} />
        <div className="pt-1">
          <AccountMenu collapsed={collapsed} />
        </div>
      </div>
    </div>
  );
}

/** Desktop navigation rail. On smaller screens the same content opens as a drawer from the top bar. */
export function Sidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-sticky hidden border-r border-border-subtle bg-background-surface transition-[width] duration-base ease-standard lg:block',
        collapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
    </aside>
  );
}
