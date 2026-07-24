'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';

export function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await login(data.email, data.password, data.remember);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="mb-7">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-[13px] text-foreground-tertiary mt-1">
          Enter your credentials to access your workspace
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-error-bg border border-error/20 px-3 py-2.5 text-[13px] text-error">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@organization.org"
          {...register('email')}
          error={!!errors.email}
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-foreground-link hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={!!errors.password}
          autoComplete="current-password"
        />
        {errors.password && (
          <p className="text-xs text-error">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remember"
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          {...register('remember')}
        />
        <Label htmlFor="remember" className="text-sm font-normal">
          Remember me
        </Label>
      </div>

      <Button type="submit" className="w-full" loading={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border-subtle" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[11px] text-foreground-tertiary uppercase tracking-wide">
            or
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full text-[13px]"
        onClick={() => {}}
      >
        Continue with SSO
      </Button>

      <p className="text-center text-[13px] text-foreground-tertiary pt-1">
        No account?{' '}
        <Link href="/register" className="text-foreground-link hover:underline font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}
