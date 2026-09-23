'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { LogOut, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { summarizeOutbox, useFieldOutbox } from '@/stores/field-outbox-store';
import { getInitials } from '@/lib/utils';

/**
 * Who is signed in, and sign-out. Signing out with recordings still on the
 * phone is allowed (a phone may be handed back at the end of a shift) but
 * never silent: the recordings stay on the device and upload the next time
 * the same person signs in.
 */
export function AccountSheet() {
  const { user, logout } = useAuth();
  const { pending } = summarizeOutbox(useFieldOutbox((s) => s.recordings));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <DialogPrimitive.Root onOpenChange={() => setConfirming(false)}>
      <DialogPrimitive.Trigger
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lemon"
        aria-label="Account"
      >
        {user ? getInitials(user.firstName, user.lastName) : <UserRound className="h-5 w-5" aria-hidden />}
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-navy-deep/40 data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="pb-safe fixed inset-x-0 bottom-0 z-modal mx-auto max-w-xl rounded-t-3xl bg-field-card p-6 shadow-float focus:outline-none data-[state=open]:animate-rise-in">
          <div className="flex items-start justify-between">
            <div>
              <DialogPrimitive.Title className="text-[20px] font-semibold text-foreground">
                {user ? `${user.firstName} ${user.lastName}` : 'Account'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-[15px] text-foreground-secondary">Field interviewer</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="flex h-11 w-11 items-center justify-center rounded-full text-foreground-tertiary hover:bg-background-hover" aria-label="Close">
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          {confirming && pending > 0 && (
            <p className="mt-5 rounded-2xl bg-warning-bg px-4 py-3 text-[15px] leading-relaxed text-foreground" role="alert">
              {pending} recording{pending === 1 ? ' is' : 's are'} still on this phone and not uploaded. They stay here and will upload the next time
              you sign in on this phone. Anyone else who signs in cannot see or upload them.
            </p>
          )}

          <Button
            variant={confirming ? 'danger' : 'secondary'}
            size="xl"
            className="mt-6 w-full"
            loading={busy}
            onClick={async () => {
              if (pending > 0 && !confirming) {
                setConfirming(true);
                return;
              }
              setBusy(true);
              await logout();
            }}
          >
            <LogOut className="h-5 w-5" aria-hidden /> {confirming ? 'Sign out anyway' : 'Sign out'}
          </Button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
