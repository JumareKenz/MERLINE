'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { useResetPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [success, setSuccess] = useState(false);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, email, password: '', password_confirmation: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword.mutateAsync(data);
      setSuccess(true);
    } catch {
      // handled by mutation
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-success mx-auto" />
        <h2 className="text-xl font-semibold">Password reset successful</h2>
        <p className="text-sm text-foreground-secondary">
          Your password has been updated. You can now sign in.
        </p>
        <Link href="/login">
          <Button className="mt-2">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Set new password</h2>
        <p className="text-sm text-foreground-secondary mt-1">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('token')} />
        <input type="hidden" {...register('email')} />

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Min. 8 characters"
            {...register('password')}
            error={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-error">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat password"
            {...register('password_confirmation')}
            error={!!errors.password_confirmation}
          />
          {errors.password_confirmation && (
            <p className="text-xs text-error">{errors.password_confirmation.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={resetPassword.isPending}
        >
          Reset Password
        </Button>
      </form>
    </div>
  );
}
