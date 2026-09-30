'use client';

import { useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

const FIELD_APP_URL = 'field.jrecc.org';

/**
 * Shows a freshly issued code. This is the only time it is ever displayed:
 * the server keeps a one-way hash, so nothing can show it again. The dialog
 * says so, and closing it is deliberate (a Done button).
 */
export function CodeRevealDialog({
  name,
  code,
  expiresAt,
  uniqueId,
  onClose,
}: {
  name: string;
  code: string;
  expiresAt: string | null;
  uniqueId?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Access code for {name}</DialogTitle>
          <DialogDescription>
            Give it to {name} only. It opens their account in the field app, and no one else&apos;s.
          </DialogDescription>
        </DialogHeader>
        <div className="my-3 flex items-center justify-between gap-3 rounded-xl bg-navy px-5 py-4">
          <code className="font-mono text-[26px] font-semibold tracking-[0.18em] text-white sm:text-[30px]" aria-label={`Access code ${code.split('').join(' ')}`}>
            {code}
          </code>
          <Button
            variant="accent"
            size="sm"
            onClick={async () => {
              await navigator.clipboard?.writeText(code).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-[13.5px] text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>
            This is the only time the code is shown. Merline stores it in a form that cannot be read back. If it is lost, issue a new one from this
            enumerator&apos;s page.
          </span>
        </p>
        <dl className="mt-3 space-y-1 text-[13.5px] text-foreground-secondary">
          {uniqueId && (
            <div className="flex gap-2">
              <dt className="text-foreground-tertiary">Enumerator ID</dt>
              <dd className="font-medium text-foreground">{uniqueId}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-foreground-tertiary">Valid until</dt>
            <dd className="font-medium text-foreground">{expiresAt ? formatDate(expiresAt) : 'Until revoked or replaced'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-foreground-tertiary">Sign in at</dt>
            <dd className="font-medium text-foreground">{FIELD_APP_URL}</dd>
          </div>
        </dl>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>I have passed it on</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
