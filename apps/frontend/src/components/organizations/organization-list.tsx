'use client';

import { useOrganization } from '@/hooks/use-organizations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Globe, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';

export function OrganizationList() {
  const { data, isLoading, isError, error, refetch } = useOrganization();

  if (isLoading) return <LoadingState message="Loading organization..." />;
  if (isError) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const org = data?.data?.data;

  if (!org) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <Building2 className="h-12 w-12 text-foreground-tertiary mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Organization Found</h3>
            <p className="text-sm text-foreground-secondary mb-4">
              Create an organization to get started.
            </p>
            <Button>Create Organization</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Organization Profile</CardTitle>
        <Button variant="secondary" size="sm">Edit</Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Name</p>
            <p className="font-medium">{org.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Slug</p>
            <p className="font-medium">{org.slug}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Type</p>
            <p className="font-medium capitalize">{org.org_type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Country</p>
            <p className="font-medium">{org.country}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Members</p>
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="h-4 w-4 text-foreground-tertiary" />
              {org.member_count}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-foreground-secondary">Created</p>
            <p className="font-medium">{formatDate(org.created_at)}</p>
          </div>
          {org.website && (
            <div className="space-y-1">
              <p className="text-sm text-foreground-secondary">Website</p>
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-medium text-foreground-link hover:underline">
                <Globe className="h-4 w-4" />
                {org.website}
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
