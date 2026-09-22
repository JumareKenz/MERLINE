'use client';

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { WifiOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

const GROUP_LENGTH = 5;
const CODE_LENGTH = GROUP_LENGTH * 2;

function sanitize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * PHASE 2 — field.jrecc.org signs in with an access code an admin issues
 * (Users -> Field Access), not email/password. Two segmented 5-character
 * inputs rather than one long field: easier to read back, easier to verify
 * at a glance, and the visual "chunking" itself communicates that this is a
 * short code, not a password, before the user reads a word of copy.
 */
export function FieldLoginForm() {
  const { fieldLogin } = useAuth();
  const [groupA, setGroupA] = useState('');
  const [groupB, setGroupB] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  const code = `${groupA}${groupB}`;
  const isComplete = code.length === CODE_LENGTH;

  const handleChangeA = (value: string) => {
    const clean = sanitize(value).slice(0, GROUP_LENGTH);
    setGroupA(clean);
    setError(null);
    if (clean.length === GROUP_LENGTH) inputBRef.current?.focus();
  };

  const handleChangeB = (value: string) => {
    const clean = sanitize(value).slice(0, GROUP_LENGTH);
    setGroupB(clean);
    setError(null);
  };

  const handleKeyDownB = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && groupB.length === 0) {
      inputARef.current?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = sanitize(e.clipboardData.getData('text'));
    if (pasted.length >= GROUP_LENGTH) {
      e.preventDefault();
      setGroupA(pasted.slice(0, GROUP_LENGTH));
      setGroupB(pasted.slice(GROUP_LENGTH, CODE_LENGTH));
      if (pasted.length >= CODE_LENGTH) {
        inputBRef.current?.blur();
      } else {
        inputBRef.current?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      return;
    }
    if (!isComplete) return;
    try {
      setIsLoading(true);
      setError(null);
      await fieldLogin(code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired access code';
      setError(message);
      setGroupB('');
      inputBRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg bg-warning-bg text-warning px-3 py-2.5 text-[13px]">
          <WifiOff className="h-4 w-4 shrink-0" />
          No connection — you&apos;ll need one to sign in.
        </div>
      )}

      {error && !isOffline && (
        <div className="rounded-lg bg-error-bg border border-error/20 px-3 py-2.5 text-[13px] text-error text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-[13px] font-medium text-foreground-secondary mb-2 text-center">
          Access code
        </label>
        <div
          className="flex items-center justify-center gap-2.5"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            ref={inputARef}
            value={groupA}
            onChange={(e) => handleChangeA(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === 'Enter' && inputBRef.current?.focus()}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            aria-label="Access code, first 5 characters"
            className="w-[132px] h-14 rounded-xl border border-border bg-background-inset text-center text-[22px] font-semibold tracking-[0.25em] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background"
            placeholder="•••••"
          />
          <span className="text-foreground-tertiary text-lg select-none">–</span>
          <input
            ref={inputBRef}
            value={groupB}
            onChange={(e) => handleChangeB(e.target.value)}
            onKeyDown={handleKeyDownB}
            onPaste={handlePaste}
            onKeyUp={(e) => e.key === 'Enter' && isComplete && handleSubmit()}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Access code, last 5 characters"
            className="w-[132px] h-14 rounded-xl border border-border bg-background-inset text-center text-[22px] font-semibold tracking-[0.25em] uppercase text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background"
            placeholder="•••••"
          />
        </div>
        <p className="text-center text-[12px] text-foreground-tertiary mt-3">
          Ask your research lead or admin for a code, from Users → Field Access.
        </p>
      </div>

      <Button
        type="button"
        className="w-full h-12 text-[15px]"
        disabled={!isComplete}
        loading={isLoading}
        onClick={handleSubmit}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
        {!isLoading && <ArrowRight className="h-4 w-4 ml-1.5" />}
      </Button>
    </div>
  );
}
