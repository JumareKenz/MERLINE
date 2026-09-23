'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateParticipant } from '@/hooks/use-participants';
import { useFieldOutbox } from '@/stores/field-outbox-store';

export default function FieldRegisterParticipantPage() {
  const router = useRouter();
  const create = useCreateParticipant();
  const online = useFieldOutbox((s) => s.online);
  const [name, setName] = useState('');
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a name, pseudonym or code.');
      return;
    }
    const result = await create.mutateAsync({ displayName: name.trim(), externalRef: ref.trim() || undefined }).catch(() => null);
    if (result) router.push(`/field/participants/${result.data.data.id}?consent=1`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <Link href="/field/participants" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> People
        </Link>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">Register a participant</h1>
        <p className="mt-1 text-[16px] text-foreground-secondary">Next you’ll record their consent.</p>
      </div>

      {!online && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-navy px-4 py-3.5 text-[15px] text-white" role="status">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-lemon" aria-hidden />
          Registering a participant needs a connection, so their consent is checked by the server before any recording.
        </p>
      )}

      <div>
        <label htmlFor="p-name" className="mb-1.5 block text-[16px] font-semibold text-foreground">
          Name or pseudonym
        </label>
        <Input
          id="p-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-control-lg"
          autoComplete="off"
          error={!!error}
          aria-describedby={error ? 'p-name-error' : 'p-name-hint'}
          maxLength={200}
        />
        {error ? (
          <p id="p-name-error" className="mt-1.5 text-[14px] text-foreground-error">
            {error}
          </p>
        ) : (
          <p id="p-name-hint" className="mt-1.5 text-[14px] text-foreground-secondary">
            Use a code such as “P-014” if your protocol avoids real names.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="p-ref" className="mb-1.5 block text-[16px] font-semibold text-foreground">
          Roster ID <span className="font-normal text-foreground-tertiary">(optional)</span>
        </label>
        <Input id="p-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="h-control-lg" autoComplete="off" maxLength={200} />
      </div>

      <Button type="submit" size="xl" className="w-full" loading={create.isPending} disabled={!online}>
        Continue to consent
      </Button>
    </form>
  );
}
