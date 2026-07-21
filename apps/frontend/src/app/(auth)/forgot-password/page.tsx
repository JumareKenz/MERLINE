'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations';
import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword.mutateAsync(data);
      setSent(true);
    } catch {
      // error handled by mutation
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-success mx-auto" />
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-foreground-secondary">
          If an account exists with that email, we&apos;ve sent password reset instructions.
        </p>
        <Link href="/login" className="inline-flex items-center text-sm text-foreground-link hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Forgot password?</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Enter your email and we&apos;ll send you reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@organization.org"
            {...register('email')}
            error={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-error">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={forgotPassword.isPending}
        >
          Send Reset Instructions
        </Button>
      </form>

      <p className="text-center text-sm text-foreground-secondary">
        <Link href="/login" className="text-foreground-link hover:underline inline-flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to login
        </Link>
      </p>
    </div>
  );
}
