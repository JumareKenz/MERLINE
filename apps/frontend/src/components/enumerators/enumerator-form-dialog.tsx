'use client';

import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Field, describedBy } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateEnumerator, useUpdateEnumerator } from '@/hooks/use-enumerators';
import { CODE_VALIDITY_OPTIONS, NIGERIAN_STATES, validateEnumerator, type EnumeratorFormErrors } from '@/lib/enumerator-validation';
import type { CreatedEnumerator, EnumeratorDetail } from '@/types/enumerator';
import { ProjectPicker } from './project-picker';

/** Server messages that belong next to a specific field. */
function fieldErrorFrom(message: string): EnumeratorFormErrors {
  if (/email/i.test(message)) return { email: message };
  if (/phone/i.test(message)) return { phone: message };
  return {};
}

function useFieldRefs() {
  return { id: useId() };
}

/** Create a new enumerator (with their first access code). */
export function CreateEnumeratorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: CreatedEnumerator, name: string) => void;
}) {
  const { id } = useFieldRefs();
  const create = useCreateEnumerator();
  const [values, setValues] = useState({ fullName: '', email: '', phone: '', state: '' });
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [validity, setValidity] = useState('');
  const [errors, setErrors] = useState<EnumeratorFormErrors>({});
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const reset = () => {
    setValues({ fullName: '', email: '', phone: '', state: '' });
    setProjectIds([]);
    setValidity('');
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateEnumerator(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const created = await create.mutateAsync({
        fullName: values.fullName.trim(),
        ...(values.email.trim() && { email: values.email.trim() }),
        phone: values.phone.trim(),
        state: values.state.trim(),
        projectIds,
        ...(validity && { codeValidDays: Number(validity) }),
      });
      const name = values.fullName.trim();
      onOpenChange(false);
      reset();
      onCreated(created, name);
    } catch (err) {
      const message = (err as { message?: string | string[] })?.message;
      setErrors(fieldErrorFrom(Array.isArray(message) ? message.join(' ') : (message ?? '')));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an enumerator</DialogTitle>
          <DialogDescription>
            They get a personal access code for the field app. It opens only their account and the projects you assign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 space-y-4">
          <Field id={`${id}-name`} label="Full name" error={errors.fullName}>
            <Input id={`${id}-name`} value={values.fullName} onChange={set('fullName')} error={!!errors.fullName} aria-describedby={describedBy(`${id}-name`, { error: errors.fullName })} autoComplete="off" maxLength={120} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-phone`} label="Phone number" error={errors.phone} hint="Used to reach them; must be unique.">
              <Input id={`${id}-phone`} type="tel" inputMode="tel" value={values.phone} onChange={set('phone')} error={!!errors.phone} aria-describedby={describedBy(`${id}-phone`, { error: errors.phone, hint: true })} placeholder="+234 803 000 0000" />
            </Field>
            <Field id={`${id}-email`} label="Email" optional error={errors.email}>
              <Input id={`${id}-email`} type="email" value={values.email} onChange={set('email')} error={!!errors.email} aria-describedby={describedBy(`${id}-email`, { error: errors.email })} autoComplete="off" />
            </Field>
          </div>
          <Field id={`${id}-state`} label="State" error={errors.state}>
            <Input id={`${id}-state`} list={`${id}-states`} value={values.state} onChange={set('state')} error={!!errors.state} aria-describedby={describedBy(`${id}-state`, { error: errors.state })} maxLength={80} autoComplete="off" />
            <datalist id={`${id}-states`}>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-foreground">
              Projects <span className="font-normal text-foreground-tertiary">(optional, can be changed later)</span>
            </p>
            <ProjectPicker value={projectIds} onChange={setProjectIds} />
          </div>
          <Field id={`${id}-valid`} label="Code validity" hint="After this the code stops working and a new one must be issued.">
            <NativeSelect id={`${id}-valid`} value={validity} onChange={(e) => setValidity(e.target.value)} aria-describedby={`${id}-valid-hint`}>
              {CODE_VALIDITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create and get code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Edit an enumerator's details. */
export function EditEnumeratorDialog({ enumerator, onClose }: { enumerator: EnumeratorDetail; onClose: () => void }) {
  const { id } = useFieldRefs();
  const update = useUpdateEnumerator(enumerator.id);
  const [values, setValues] = useState({
    fullName: enumerator.fullName,
    email: enumerator.email ?? '',
    phone: enumerator.phone ?? '',
    state: enumerator.state ?? '',
  });
  const [notes, setNotes] = useState(enumerator.notes ?? '');
  const [errors, setErrors] = useState<EnumeratorFormErrors>({});
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateEnumerator(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await update.mutateAsync({
        fullName: values.fullName.trim(),
        ...(values.email.trim() && values.email.trim() !== enumerator.email && { email: values.email.trim() }),
        phone: values.phone.trim(),
        state: values.state.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      const message = (err as { message?: string | string[] })?.message;
      setErrors(fieldErrorFrom(Array.isArray(message) ? message.join(' ') : (message ?? '')));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
          <DialogDescription>Changing details never changes the access code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 space-y-4">
          <Field id={`${id}-name`} label="Full name" error={errors.fullName}>
            <Input id={`${id}-name`} value={values.fullName} onChange={set('fullName')} error={!!errors.fullName} aria-describedby={describedBy(`${id}-name`, { error: errors.fullName })} maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-phone`} label="Phone number" error={errors.phone}>
              <Input id={`${id}-phone`} type="tel" inputMode="tel" value={values.phone} onChange={set('phone')} error={!!errors.phone} aria-describedby={describedBy(`${id}-phone`, { error: errors.phone })} />
            </Field>
            <Field id={`${id}-email`} label="Email" optional error={errors.email}>
              <Input id={`${id}-email`} type="email" value={values.email} onChange={set('email')} error={!!errors.email} aria-describedby={describedBy(`${id}-email`, { error: errors.email })} />
            </Field>
          </div>
          <Field id={`${id}-state`} label="State" error={errors.state}>
            <Input id={`${id}-state`} list={`${id}-states`} value={values.state} onChange={set('state')} error={!!errors.state} aria-describedby={describedBy(`${id}-state`, { error: errors.state })} maxLength={80} />
            <datalist id={`${id}-states`}>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field id={`${id}-notes`} label="Notes" optional>
            <Textarea id={`${id}-notes`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} />
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
