'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Field, describedBy } from '@/components/ui/field';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useUpdateProfile } from '@/hooks/use-auth';
import { useSession } from '@/hooks/use-session';
import { API } from '@/lib/api-client';
import { describeError } from '@/lib/errors';
import { formatDate, formatDateTime } from '@/lib/utils';

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft sm:p-6">
      <h2 className="type-section">{title}</h2>
      {description && <p className="mt-1 text-[14px] text-foreground-secondary">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = 'Enter your current password.';
    if (next.length < 8) errs.next = 'Use at least 8 characters.';
    if (next !== confirm) errs.confirm = 'The two new passwords don’t match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      await API.auth.changePassword({ currentPassword: current, newPassword: next, newPasswordConfirmation: confirm });
      toast.success('Password changed');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setErrors({ current: describeError(err, 'Your current password is not correct.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field id="pw-current" label="Current password" error={errors.current}>
        <PasswordInput id="pw-current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" error={!!errors.current} aria-describedby={describedBy('pw-current', { error: errors.current })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pw-new" label="New password" error={errors.next} hint="At least 8 characters.">
          <PasswordInput id="pw-new" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" error={!!errors.next} aria-describedby={describedBy('pw-new', { error: errors.next, hint: true })} />
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
          <PasswordInput id="pw-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" error={!!errors.confirm} aria-describedby={describedBy('pw-confirm', { error: errors.confirm })} />
        </Field>
      </div>
      <Button type="submit" variant="secondary" loading={saving}>
        Change password
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const { profile, isLoading, isError } = useSession();
  const update = useUpdateProfile();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile]);

  if (isLoading) return <LoadingState message="Loading profile" rows={3} />;
  if (isError || !profile) return <ErrorState message="Your profile could not be loaded." />;

  const dirty = firstName !== (profile.firstName ?? '') || lastName !== (profile.lastName ?? '') || phone !== (profile.phone ?? '');

  const save = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.first = 'Enter your first name.';
    if (!lastName.trim()) errs.last = 'Enter your last name.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    update.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() },
      {
        onSuccess: () => {
          toast.success('Profile saved');
          queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
        onError: (err) => toast.error(describeError(err, 'Your profile could not be saved')),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Profile"
        description={`${profile.email} · ${profile.roles.map((r) => r.name).join(', ') || 'No role'}${profile.organization ? ` · ${profile.organization.name}` : ''}`}
        actions={
          <Button variant="ghost" asChild>
            <Link href="/admin/settings">
              <Settings className="h-4 w-4" aria-hidden /> Settings
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <Section title="Your details">
          <form onSubmit={save} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="p-first" label="First name" error={errors.first}>
                <Input id="p-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={!!errors.first} aria-describedby={describedBy('p-first', { error: errors.first })} />
              </Field>
              <Field id="p-last" label="Last name" error={errors.last}>
                <Input id="p-last" value={lastName} onChange={(e) => setLastName(e.target.value)} error={!!errors.last} aria-describedby={describedBy('p-last', { error: errors.last })} />
              </Field>
            </div>
            <Field id="p-phone" label="Phone" optional>
              <Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field id="p-email" label="Email" hint="Your sign-in email can’t be changed here.">
              <Input id="p-email" value={profile.email} readOnly disabled aria-describedby="p-email-hint" />
            </Field>
            <Button type="submit" loading={update.isPending} disabled={!dirty}>
              Save changes
            </Button>
          </form>
        </Section>

        <Section title="Password" description="Change the password you use to sign in to the research workspace.">
          <PasswordSection />
        </Section>

        <Section title="Account">
          <dl className="grid gap-4 text-[14px] sm:grid-cols-3">
            <div>
              <dt className="text-foreground-tertiary">Member since</dt>
              <dd className="mt-0.5 font-medium text-foreground">{profile.createdAt ? formatDate(profile.createdAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-foreground-tertiary">Last sign-in</dt>
              <dd className="mt-0.5 font-medium text-foreground">{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-foreground-tertiary">Email</dt>
              <dd className="mt-0.5 font-medium text-foreground">{profile.emailVerifiedAt ? 'Verified' : 'Not verified'}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  );
}
