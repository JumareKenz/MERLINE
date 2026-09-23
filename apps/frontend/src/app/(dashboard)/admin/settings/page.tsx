'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, describedBy } from '@/components/ui/field';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organizations';
import { useSession } from '@/hooks/use-session';

/**
 * Organization details. Deliberately short: this page previously offered
 * "require two-factor", "allow public registration" and "email
 * notifications" switches that nothing on the server read or enforced —
 * a security setting that silently does nothing is worse than none.
 */
export default function OrganizationSettingsPage() {
  const { data: org, isLoading, isError, error, refetch } = useOrganization();
  const update = useUpdateOrganization();
  const session = useSession();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();

  useEffect(() => {
    if (org) setName(org.name ?? '');
  }, [org]);

  if (isLoading) return <LoadingState message="Loading organization" rows={2} />;
  if (isError || !org) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'Organization details could not be loaded.'} status={e?.status} onRetry={() => refetch()} />;
  }

  const canEdit = !session.isResolved || session.can('edit.organizations');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError('The organization name needs at least 2 characters.');
      return;
    }
    setNameError(undefined);
    update.mutate({ id: org.id, data: { name: name.trim() } });
  };

  return (
    <div className="max-w-xl">
      <h2 className="type-section">Organization</h2>
      <p className="mt-1 text-[14px] text-foreground-secondary">Shown to your team across Merline.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-5">
        <Field id="org-name" label="Name" error={nameError}>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            error={!!nameError}
            aria-describedby={describedBy('org-name', { error: nameError })}
            maxLength={200}
          />
        </Field>
        <Field id="org-slug" label="Identifier" hint="Used internally; it cannot be changed here.">
          <Input id="org-slug" value={org.slug} readOnly disabled aria-describedby="org-slug-hint" />
        </Field>
        {canEdit && (
          <Button type="submit" loading={update.isPending} disabled={name.trim() === org.name}>
            Save changes
          </Button>
        )}
      </form>
    </div>
  );
}
