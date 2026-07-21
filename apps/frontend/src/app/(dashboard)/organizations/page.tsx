'use client';

import { useState } from 'react';
import { OrganizationList } from '@/components/organizations/organization-list';
import { OrganizationForm } from '@/components/organizations/organization-form';
import { useOrganization, useUpdateOrganization } from '@/hooks/use-organizations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function OrganizationsPage() {
  const [showEdit, setShowEdit] = useState(false);
  const { data } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const org = data?.data?.data;

  const handleEdit = async () => {
    if (!org) return;
    setShowEdit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organizations</h1>
          <p className="text-foreground-secondary mt-1">Manage your organization profile</p>
        </div>
        <Button onClick={handleEdit}>
          <Plus className="mr-2 h-4 w-4" /> Edit Organization
        </Button>
      </div>

      <OrganizationList />

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <OrganizationForm
            initialData={org ? { name: org.name, org_type: org.org_type, country: org.country, website: org.website } : undefined}
            onSubmit={async (formData) => {
              if (!org) return;
              await updateOrg.mutateAsync({ id: org.id, data: formData });
              setShowEdit(false);
            }}
            isLoading={updateOrg.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
