'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { AssignmentProgress } from './assignment-progress';
import { formatDate, getInitials } from '@/lib/utils';
import { Calendar, User } from 'lucide-react';
import Link from 'next/link';
import type { Assignment } from '@/types/assignment';

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  return (
    <Link href={`/assignments/${assignment.id}`}>
      <Card className="hover:shadow-2 transition-shadow cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-medium text-sm leading-tight">
                {assignment.questionnaire?.title || 'Untitled Questionnaire'}
              </p>
              {assignment.enumerator && (
                <div className="flex items-center gap-1 text-sm text-foreground-secondary">
                  <User className="h-3 w-3" />
                  <span>{getInitials(assignment.enumerator.firstName, assignment.enumerator.lastName)}</span>
                </div>
              )}
            </div>
            <StatusBadge status={assignment.status} />
          </div>
          <AssignmentProgress target={assignment.target_count} completed={assignment.completed_count} />
          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            {assignment.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(assignment.due_date)}</span>
              </div>
            )}
            <span>{formatDate(assignment.assigned_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
