'use client';

import { Bell, HelpCircle, Menu, Moon, Sun, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumbs } from './breadcrumbs';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-background-elevated/90 backdrop-blur-sm px-4 lg:px-5">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden h-8 w-8">
        <Menu className="h-4 w-4" />
      </Button>

      <Breadcrumbs />

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 text-foreground-tertiary hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-foreground-tertiary hover:text-foreground">
          <Bell className="h-[15px] w-[15px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-error" />
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground-tertiary hover:text-foreground">
          <HelpCircle className="h-[15px] w-[15px]" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-7 w-7 rounded-full p-0">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[11px] font-medium bg-primary-100 text-primary-700">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end" forceMount>
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] leading-none text-foreground-tertiary">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="text-[13px]">
                <User className="mr-2 h-3.5 w-3.5" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-error text-[13px]">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
