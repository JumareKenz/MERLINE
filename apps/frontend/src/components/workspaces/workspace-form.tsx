'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workspaceSchema, type WorkspaceFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface WorkspaceFormProps {
  initialData?: Partial<WorkspaceFormData>;
  onSubmit: (data: WorkspaceFormData) => Promise<void>;
  isLoading?: boolean;
}

export function WorkspaceForm({ initialData, onSubmit, isLoading }: WorkspaceFormProps) {
  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      is_default: initialData?.is_default || false,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Workspace Name</Label>
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

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          className="h-4 w-4 rounded border-border text-primary"
          {...form.register('is_default')}
        />
        <Label htmlFor="isDefault" className="text-sm font-normal">
          Set as default workspace
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Workspace' : 'Create Workspace'}
        </Button>
      </div>
    </form>
  );
}
