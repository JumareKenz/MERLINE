'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { describeError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Field, describedBy } from '@/components/ui/field';
import { useAuth } from '@/providers/auth-provider';

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
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setError(describeError(err, 'That email and password don’t match an account.'));
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">Sign in to Merline</h1>
        <p className="mt-2 text-[15px] text-foreground-secondary">Research workspace for your organization.</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-error/25 bg-error-bg px-3.5 py-3 text-[14px] text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
          {error}
        </div>
      )}

      <Field id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          inputMode="email"
          placeholder="you@organization.org"
          autoComplete="username"
          autoFocus
          error={!!errors.email}
          aria-describedby={describedBy('email', { error: errors.email })}
          {...register('email')}
        />
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-[14px] font-medium text-foreground">
            Password
          </label>
          <Link href="/forgot-password" className="text-[13px] font-medium text-foreground-link hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          placeholder="Your password"
          autoComplete="current-password"
          error={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-[13px] text-foreground-error">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="pt-2 text-center text-[14px] text-foreground-secondary">
        Doing fieldwork?{' '}
        <a href="https://field.jrecc.org" className="font-medium text-foreground-link hover:underline">
          Open the field app
        </a>
      </p>
    </form>
  );
}
