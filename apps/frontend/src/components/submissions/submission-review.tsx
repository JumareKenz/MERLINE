'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Flag } from 'lucide-react';
import type { Submission } from '@/types/submission';
import { useApproveSubmission, useRejectSubmission, useFlagAnswer } from '@/hooks/use-submissions';

interface SubmissionReviewProps {
  submission: Submission;
}

export function SubmissionReview({ submission }: SubmissionReviewProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagQuestionId, setFlagQuestionId] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const approveMutation = useApproveSubmission();
  const rejectMutation = useRejectSubmission();
  const flagMutation = useFlagAnswer();

  const canReview = submission.status === 'completed' || submission.status === 'synced' || submission.status === 'flagged';
  const isReviewed = submission.status === 'approved' || submission.status === 'rejected';

  if (isReviewed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {submission.status === 'approved' ? (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <CheckCircle className="h-4 w-4" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-error">
                <XCircle className="h-4 w-4" /> Rejected
              </span>
            )}
          </div>
          {submission.notes && <p className="text-sm mt-2">{submission.notes}</p>}
        </CardContent>
      </Card>
    );
  }

  if (!canReview) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate(submission.id)}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowRejectDialog(true)}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowFlagDialog(true)}
            >
              <Flag className="h-4 w-4 mr-1" />
              Flag Answer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="rej-reason">Reason *</Label>
            <Textarea
              id="rej-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                rejectMutation.mutate({ id: submission.id, reason: rejectReason });
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Answer</DialogTitle>
            <DialogDescription>Select a question and provide a reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label htmlFor="flag-question">Question ID</Label>
            <Input
              id="flag-question"
              value={flagQuestionId}
              onChange={(e) => setFlagQuestionId(e.target.value)}
              placeholder="Question code or ID..."
            />
            <Label htmlFor="flag-reason">Reason *</Label>
            <Textarea
              id="flag-reason"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why is this answer suspicious?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowFlagDialog(false)}>Cancel</Button>
            <Button
              disabled={!flagQuestionId.trim() || !flagReason.trim() || flagMutation.isPending}
              onClick={() => {
                flagMutation.mutate({
                  submissionId: submission.id,
                  questionId: flagQuestionId,
                  reason: flagReason,
                });
                setShowFlagDialog(false);
                setFlagQuestionId('');
                setFlagReason('');
              }}
            >
              {flagMutation.isPending ? 'Flagging...' : 'Flag Answer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
