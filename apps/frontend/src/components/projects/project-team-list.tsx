'use client';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';
import type { ProjectTeam } from '@/types/project';

function getRoleVariant(role: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  switch (role) {
    case 'manager': return 'primary';
    case 'contributor': return 'success';
    case 'viewer': return 'default';
    default: return 'default';
  }
}

interface ProjectTeamListProps {
  members?: ProjectTeam[];
  isLoading?: boolean;
}

export function ProjectTeamList({ members, isLoading }: ProjectTeamListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!members?.length) {
    return <EmptyState icon={<Users className="h-8 w-8" />} title="No team members" description="Invite team members to collaborate on this project." />;
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <div className="flex h-full w-full items-center justify-center bg-primary-50 text-primary text-sm font-medium">
              {member.user?.first_name?.charAt(0)}{member.user?.last_name?.charAt(0)}
            </div>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {member.user?.first_name} {member.user?.last_name}
            </p>
            <p className="text-xs text-foreground-secondary truncate">{member.user?.email}</p>
          </div>
          <Badge variant={getRoleVariant(member.role)}>{member.role}</Badge>
        </div>
      ))}
    </div>
  );
}
