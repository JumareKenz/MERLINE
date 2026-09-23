'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { SidebarContent } from './sidebar';
import { Breadcrumbs } from './breadcrumbs';

/**
 * Top context bar: where you are, and on phones/tablets the way into the
 * same navigation the desktop rail shows (a drawer, not a second menu).
 * Translucent only where supported; see `.glass`.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="glass sticky top-0 z-sticky flex h-14 items-center gap-3 border-b px-4 sm:px-6 lg:h-16 lg:px-8">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-hover lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-navy-deep/30 backdrop-blur-[2px] data-[state=open]:animate-fade-in lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-modal w-[288px] max-w-[85vw] border-r border-border-subtle bg-background-surface shadow-float focus:outline-none data-[state=open]:animate-drawer-in lg:hidden"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute right-3 top-3.5 flex h-9 w-9 items-center justify-center rounded-md text-foreground-tertiary hover:bg-background-hover"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <span className="lg:hidden">
        <Logo variant="mark" height={24} />
      </span>

      <Breadcrumbs />
    </header>
  );
}
