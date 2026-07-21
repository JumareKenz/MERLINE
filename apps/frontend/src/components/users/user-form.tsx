'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Role } from '@/types/role';

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  roles: Role[];
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
}

export function UserForm({ initialData, roles, onSubmit, isLoading }: UserFormProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: initialData?.email || '',
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      role_id: initialData?.role_id || '',
      send_invite: initialData?.send_invite ?? true,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input {...form.register('first_name')} error={!!form.formState.errors.first_name} />
          {form.formState.errors.first_name && (
            <p className="text-xs text-error">{form.formState.errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input {...form.register('last_name')} error={!!form.formState.errors.last_name} />
          {form.formState.errors.last_name && (
            <p className="text-xs text-error">{form.formState.errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" {...form.register('email')} error={!!form.formState.errors.email} />
        {form.formState.errors.email && (
          <p className="text-xs text-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          onValueChange={(v) => form.setValue('role_id', v)}
          value={form.watch('role_id')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.role_id && (
          <p className="text-xs text-error">{form.formState.errors.role_id.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="sendInvite"
          className="h-4 w-4 rounded border-border text-primary"
          {...form.register('send_invite')}
        />
        <Label htmlFor="sendInvite" className="text-sm font-normal">
          Send invitation email
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update User' : 'Add User'}
        </Button>
      </div>
    </form>
  );
}
