'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { organizationSchema, type OrganizationFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrganizationFormProps {
  initialData?: Partial<OrganizationFormData>;
  onSubmit: (data: OrganizationFormData) => Promise<void>;
  isLoading?: boolean;
}

export function OrganizationForm({ initialData, onSubmit, isLoading }: OrganizationFormProps) {
  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initialData?.name || '',
      org_type: initialData?.org_type || '',
      country: initialData?.country || '',
      website: initialData?.website || '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Organization Name</Label>
        <Input {...form.register('name')} error={!!form.formState.errors.name} />
        {form.formState.errors.name && (
          <p className="text-xs text-error">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            onValueChange={(v) => form.setValue('org_type', v)}
            value={form.watch('org_type')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NGO">NGO</SelectItem>
              <SelectItem value="INGO">International NGO</SelectItem>
              <SelectItem value="government">Government</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="multilateral">Multilateral</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.org_type && (
            <p className="text-xs text-error">{form.formState.errors.org_type.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select
            onValueChange={(v) => form.setValue('country', v)}
            value={form.watch('country')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KE">Kenya</SelectItem>
              <SelectItem value="UG">Uganda</SelectItem>
              <SelectItem value="TZ">Tanzania</SelectItem>
              <SelectItem value="ET">Ethiopia</SelectItem>
              <SelectItem value="NG">Nigeria</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.country && (
            <p className="text-xs text-error">{form.formState.errors.country.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Website (optional)</Label>
        <Input {...form.register('website')} placeholder="https://example.org" error={!!form.formState.errors.website} />
        {form.formState.errors.website && (
          <p className="text-xs text-error">{form.formState.errors.website.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Organization' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
