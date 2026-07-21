'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { useState } from 'react';

const ORGANIZATION_TYPES = [
  { value: 'NGO', label: 'Non-Governmental Organization' },
  { value: 'INGO', label: 'International NGO' },
  { value: 'government', label: 'Government Agency' },
  { value: 'academic', label: 'Academic Institution' },
  { value: 'private', label: 'Private Sector' },
  { value: 'multilateral', label: 'Multilateral Organization' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'other', label: 'Other' },
];

const COUNTRIES = [
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'SN', label: 'Senegal' },
  { value: 'CD', label: 'DRC' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'other', label: 'Other' },
];

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
      organization_name: '',
      organization_type: '',
      country: '',
      accept_terms: false as unknown as true,
    },
  });

  // Type assertion for accept_terms
  const acceptTermsValue = form.watch('accept_terms');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await registerUser({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        organization_name: data.organization_name,
        organization_type: data.organization_type,
        country: data.country,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-error-bg border border-error/20 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Organization Name</Label>
        <Input
          placeholder="e.g., AMREF Health Africa"
          {...form.register('organization_name')}
          error={!!form.formState.errors.organization_name}
        />
        {form.formState.errors.organization_name && (
          <p className="text-xs text-error">{form.formState.errors.organization_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Jane"
            {...form.register('first_name')}
            error={!!form.formState.errors.first_name}
          />
          {form.formState.errors.first_name && (
            <p className="text-xs text-error">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Researcher"
            {...form.register('last_name')}
            error={!!form.formState.errors.last_name}
          />
          {form.formState.errors.last_name && (
            <p className="text-xs text-error">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="regEmail">Email</Label>
        <Input
          id="regEmail"
          type="email"
          placeholder="jane@organization.org"
          {...form.register('email')}
          error={!!form.formState.errors.email}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="regPassword">Password</Label>
          <Input
            id="regPassword"
            type="password"
            placeholder="Min. 8 characters"
            {...form.register('password')}
            error={!!form.formState.errors.password}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-error">{form.formState.errors.password.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat password"
            {...form.register('confirm_password')}
            error={!!form.formState.errors.confirm_password}
          />
          {form.formState.errors.confirm_password && (
            <p className="text-xs text-error">{form.formState.errors.confirm_password.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Organization Type</Label>
          <Select
            onValueChange={(value) => form.setValue('organization_type', value)}
            value={form.watch('organization_type')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.organization_type && (
            <p className="text-xs text-error">{form.formState.errors.organization_type.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select
            onValueChange={(value) => form.setValue('country', value)}
            value={form.watch('country')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.country && (
            <p className="text-xs text-error">{form.formState.errors.country.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id="acceptTerms"
          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          {...form.register('accept_terms')}
        />
        <Label htmlFor="acceptTerms" className="text-sm font-normal">
          I accept the{' '}
          <Link href="/terms" className="text-foreground-link hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-foreground-link hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {form.formState.errors.accept_terms && (
        <p className="text-xs text-error">{form.formState.errors.accept_terms.message}</p>
      )}

      <Button type="submit" className="w-full" size="lg" loading={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-foreground-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground-link hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
