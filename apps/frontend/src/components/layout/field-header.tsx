'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/brand/logo';
import { getInitials } from '@/lib/utils';

/**
 * PHASE 2 — field.jrecc.org's own header. No sidebar, no admin/research
 * navigation: field interviewers only ever need "where am I, who am I, how
 * do I get back home, how do I sign out."
 */
export function FieldHeader() {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-background-elevated/95 backdrop-blur-sm px-4">
      <Link href="/" className="flex items-center gap-2">
        <Logo variant="mark" height={26} />
      </Link>
      <div className="flex-1" />
      {user && (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[11px]">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => logout()} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
