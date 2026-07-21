'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';
import type { Assignment } from '@/types/assignment';
import { useApproveAssignment, useRejectAssignment } from '@/hooks/use-assignments';

interface AssignmentActionsProps {
  assignment: Assignment;
}

export function AssignmentActions({ assignment }: AssignmentActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const approveMutation = useApproveAssignment();
  const rejectMutation = useRejectAssignment();

  const canApprove = assignment.status === 'completed';
  const canReject = assignment.status === 'completed' || assignment.status === 'in_progress';

  if (!canApprove && !canReject) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-tertiary">No actions available</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canApprove && (
          <Button
            size="sm"
            variant="default"
            onClick={() => approveMutation.mutate(assignment.id)}
            disabled={approveMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )}
        {canReject && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowRejectDialog(true)}
            disabled={rejectMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        )}
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Assignment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="rejectReason">Reason *</Label>
            <Input
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this is being rejected..."
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                rejectMutation.mutate({ id: assignment.id, reason: rejectReason });
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
