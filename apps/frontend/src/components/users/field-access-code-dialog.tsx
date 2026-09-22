'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, KeyRound } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useGenerateFieldAccessCode, useRevokeFieldAccessCode } from '@/hooks/use-users';
import type { Member } from '@/types/user';
import { toast } from 'sonner';

interface FieldAccessCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Member | null;
}

/**
 * PHASE 2 — the admin-facing half of the field-worker access-code login.
 * The backend endpoints (`POST`/`DELETE /users/:id/field-access-code`) and
 * the field login screen already existed; there was no way to actually
 * reach them from the product. A generated code is shown here once, in
 * plaintext — it is not retrievable again afterward (the backend does not
 * store it recoverably; see users.service.ts).
 */
export function FieldAccessCodeDialog({ open, onOpenChange, user }: FieldAccessCodeDialogProps) {
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const generate = useGenerateFieldAccessCode();
  const revoke = useRevokeFieldAccessCode();

  const hasCode = !!user?.fieldAccessCodeIssuedAt;

  const handleClose = (next: boolean) => {
    if (!next) {
      setRevealedCode(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (!user) return;
    try {
      const response = await generate.mutateAsync(user.id);
      setRevealedCode(response.data.data.code);
    } catch {
      // toast handled by the hook
    }
  };

  const handleRevoke = async () => {
    if (!user) return;
    try {
      await revoke.mutateAsync(user.id);
      setRevealedCode(null);
      onOpenChange(false);
    } catch {
      // toast handled by the hook
    }
  };

  const handleCopy = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select and copy the code manually');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-foreground-tertiary" />
            Field Access Code
          </DialogTitle>
          <DialogDescription>
            {user ? `For ${user.firstName} ${user.lastName} — used to sign in at the field app instead of a password.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {revealedCode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-background-inset py-5">
                <span className="text-[22px] font-semibold tracking-[0.2em] text-foreground">
                  {revealedCode}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleCopy}
              >
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy code'}
              </Button>
              <p className="text-xs text-foreground-tertiary text-center">
                This code is shown once. Share it with the field worker now — it cannot be
                retrieved again, only revoked and reissued.
              </p>
            </div>
          ) : hasCode ? (
            <div className="rounded-lg bg-warning-bg text-warning px-3 py-2.5 text-[13px]">
              A code was issued {formatDateTime(user!.fieldAccessCodeIssuedAt!)}. Generating a
              new one immediately invalidates it.
            </div>
          ) : (
            <p className="text-[13px] text-foreground-secondary">
              No access code has been issued for this user yet.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          {hasCode && !revealedCode && (
            <Button
              type="button"
              variant="ghost"
              className="text-error"
              loading={revoke.isPending}
              onClick={handleRevoke}
            >
              Revoke code
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              {revealedCode ? 'Done' : 'Close'}
            </Button>
            {!revealedCode && (
              <Button type="button" loading={generate.isPending} onClick={handleGenerate}>
                {hasCode ? 'Generate new code' : 'Generate code'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
