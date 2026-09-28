'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { describeError } from '@/lib/errors';
import { cn } from '@/lib/utils';

/** Access codes are 4 characters; older ones were 10 (XXXXX-XXXXX) and still work. */
const LENGTH = 4;
const LEGACY_LENGTH = 10;

function sanitize(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Access-code sign-in. One large field: 4 characters are quick to type
 * outdoors and easy to read out to a team. A whole team can share a code;
 * each interview asks who is conducting it.
 */
export function FieldLoginForm() {
  const { fieldLogin } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const complete = code.length === LENGTH || code.length === LEGACY_LENGTH;

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
      setCode('');
      ref.current?.focus();
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <label htmlFor="code" className="block text-[17px] font-semibold text-foreground">
          Access code
        </label>
        <p id="code-hint" className="mt-1 text-[15px] text-foreground-secondary">
          4 letters and numbers, e.g. <span className="whitespace-nowrap font-mono">K7Q2</span>
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

      <input
        id="code"
        ref={ref}
        value={code.length === LEGACY_LENGTH ? `${code.slice(0, 5)}-${code.slice(5)}` : code}
        onChange={(e) => {
          setCode(sanitize(e.target.value).slice(0, LEGACY_LENGTH));
          setError(null);
        }}
        aria-describedby={error ? 'code-error' : 'code-hint'}
        aria-invalid={!!error || undefined}
        autoCapitalize="characters"
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        maxLength={11}
        placeholder="••••"
        className={cn(
          'h-20 w-full rounded-2xl border bg-background-elevated text-center font-mono text-[36px] font-semibold uppercase tracking-[0.4em] text-foreground placeholder:text-foreground-tertiary/50',
          'focus-visible:border-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy/15',
          error ? 'border-error' : 'border-field-line',
        )}
      />

      <Button type="submit" size="xl" className="w-full" disabled={!complete} loading={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
        {!loading && <ArrowRight className="h-5 w-5" aria-hidden />}
      </Button>
    </form>
  );
}
