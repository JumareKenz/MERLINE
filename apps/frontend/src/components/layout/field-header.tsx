'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/brand/logo';
import { NetworkStatus } from '@/components/shared/network-status';
import { getInitials } from '@/lib/utils';

/**
 * PHASE 2 — field.jrecc.org's own header. Navy, not the admin app's light
 * chrome — this is the single most immediate visual signal that you're in a
 * different product, present on every screen. No sidebar, no admin/research
 * navigation: field interviewers only ever need "where am I, am I online,
 * who am I, how do I sign out."
 */
export function FieldHeader() {
  const { user, logout } = useAuthStore();

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 shadow-2"
      style={{ backgroundColor: 'hsl(var(--brand-navy))' }}
    >
      <Link href="/" className="flex items-center gap-2">
        <Logo variant="mark" theme="dark" height={26} />
      </Link>
      <NetworkStatus />
      <div className="flex-1" />
      {user && (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7 ring-2 ring-white/15">
            <AvatarFallback className="text-[11px] bg-white/10 text-white">
              {getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
