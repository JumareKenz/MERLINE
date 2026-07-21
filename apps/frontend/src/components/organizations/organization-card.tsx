import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Organization } from '@/types/organization';

interface OrganizationCardProps {
  organization: Organization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <Card className="hover:shadow-2 transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{organization.name}</CardTitle>
              <p className="text-sm text-foreground-secondary">@{organization.slug}</p>
            </div>
          </div>
          <Badge variant={organization.org_type === 'NGO' ? 'primary' : 'default'}>
            {organization.org_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-foreground-secondary">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{organization.member_count} members</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Created {formatDate(organization.created_at)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
