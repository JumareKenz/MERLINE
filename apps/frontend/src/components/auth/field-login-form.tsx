'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, WifiOff } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/auth-provider';

/**
 * PHASE 2 — field.jrecc.org's own login. Reuses the same auth flow
 * (useAuth().login, same validation schema, same API) as the admin login —
 * only the presentation differs: no remember-me, no SSO, no self-registration
 * (field accounts are provisioned by an admin), larger controls, a password
 * visibility toggle, and offline awareness up front rather than only on
 * failure.
 */
export function FieldLoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await login(data.email, data.password, true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-md bg-warning-bg text-warning px-3 py-2.5 text-[13px]">
          <WifiOff className="h-4 w-4 shrink-0" />
          No connection — you&apos;ll need one to sign in.
        </div>
      )}

      {error && !isOffline && (
        <div className="rounded-md bg-error-bg border border-error/20 px-3 py-2.5 text-[13px] text-error">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="field-email" className="text-[13px]">
          Email
        </Label>
        <Input
          id="field-email"
          type="email"
          inputMode="email"
          placeholder="you@organization.org"
          className="h-12 text-[15px]"
          {...register('email')}
          error={!!errors.email}
          autoComplete="email"
        />
        {errors.email && <p className="text-xs text-error">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="field-password" className="text-[13px]">
          Password
        </Label>
        <div className="relative">
          <Input
            id="field-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="h-12 text-[15px] pr-11"
            {...register('password')}
            error={!!errors.password}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-0 top-0 h-12 w-11 flex items-center justify-center text-foreground-tertiary hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-error">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full h-12 text-[15px]" loading={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
