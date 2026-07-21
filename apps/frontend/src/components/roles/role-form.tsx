'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleSchema, type RoleFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RoleFormProps {
  initialData?: Partial<RoleFormData>;
  onSubmit: (data: RoleFormData) => Promise<void>;
  isLoading?: boolean;
}

export function RoleForm({ initialData, onSubmit, isLoading }: RoleFormProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      permission_ids: initialData?.permission_ids || [],
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Role Name</Label>
        <Input {...form.register('name')} error={!!form.formState.errors.name} />
        {form.formState.errors.name && (
          <p className="text-xs text-error">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...form.register('description')} rows={3} />
        {form.formState.errors.description && (
          <p className="text-xs text-error">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Role' : 'Create Role'}
        </Button>
      </div>
    </form>
  );
}
