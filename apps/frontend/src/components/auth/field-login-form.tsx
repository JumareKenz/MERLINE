'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowRight, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const GROUP = 5;
const LENGTH = GROUP * 2;

function sanitize(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Access-code sign-in (XXXXX-XXXXX, issued by an admin from Settings →
 * Members). Two chunked fields read back easily outdoors; paste of the
 * whole code fills both.
 */
export function FieldLoginForm() {
  const { fieldLogin } = useAuth();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const refA = useRef<HTMLInputElement>(null);
  const refB = useRef<HTMLInputElement>(null);
  const code = a + b;
  const complete = code.length === LENGTH;

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = sanitize(e.clipboardData.getData('text'));
    if (pasted.length > GROUP) {
      e.preventDefault();
      setA(pasted.slice(0, GROUP));
      setB(pasted.slice(GROUP, LENGTH));
      refB.current?.focus();
    }
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!complete || loading) return;
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await fieldLogin(code);
    } catch (err) {
      setError(describeError(err, 'That code isn’t valid. Check it with your research lead.'));
      setB('');
      refB.current?.focus();
      setLoading(false);
    }
  };

  const inputClass = (invalid: boolean) =>
    cn(
      'h-16 w-full min-w-0 rounded-2xl border bg-background-elevated text-center font-mono text-[24px] font-semibold uppercase tracking-[0.2em] text-foreground',
      'focus-visible:border-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy/15',
      invalid ? 'border-error' : 'border-field-line',
    );

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <label htmlFor="code-a" className="block text-[17px] font-semibold text-foreground">
          Access code
        </label>
        <p id="code-hint" className="mt-1 text-[15px] text-foreground-secondary">
          10 letters and numbers, e.g. <span className="whitespace-nowrap font-mono">K7Q2M-9XH4P</span>
        </p>
      </div>

      {offline && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-warning-bg px-4 py-3 text-[15px] text-foreground" role="alert">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          Signing in needs a connection once. After that, you can record offline.
        </p>
      )}
      {error && !offline && (
        <p id="code-error" className="rounded-2xl bg-error-bg px-4 py-3 text-[15px] text-foreground" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          id="code-a"
          ref={refA}
          value={a}
          onChange={(e) => {
            const v = sanitize(e.target.value).slice(0, GROUP);
            setA(v);
            setError(null);
            if (v.length === GROUP) refB.current?.focus();
          }}
          onPaste={onPaste}
          aria-label="Access code, first 5 characters"
          aria-describedby={error ? 'code-error' : 'code-hint'}
          aria-invalid={!!error || undefined}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="next"
          className={inputClass(!!error)}
        />
        <span aria-hidden className="text-[22px] font-semibold text-foreground-tertiary">
          –
        </span>
        <input
          ref={refB}
          value={b}
          onChange={(e) => {
            setB(sanitize(e.target.value).slice(0, GROUP));
            setError(null);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && b.length === 0) refA.current?.focus();
          }}
          onPaste={onPaste}
          aria-label="Access code, last 5 characters"
          aria-invalid={!!error || undefined}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="go"
          className={inputClass(!!error)}
        />
      </div>

      <Button type="submit" size="xl" className="w-full" disabled={!complete} loading={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
        {!loading && <ArrowRight className="h-5 w-5" aria-hidden />}
      </Button>
    </form>
  );
}
