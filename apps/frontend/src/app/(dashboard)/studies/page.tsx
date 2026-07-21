'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StudyTable } from '@/components/studies/study-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useStudies, useDeleteStudy } from '@/hooks/use-studies';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Study } from '@/types/study';
import { toast } from 'sonner';

export default function StudiesPage() {
  const [showDelete, setShowDelete] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);

  const { data, isLoading, isError, error, refetch } = useStudies();
  const deleteStudy = useDeleteStudy();

  const studies = data?.data?.data || [];

  const handleDelete = async () => {
    if (!selectedStudy) return;
    try {
      await deleteStudy.mutateAsync(selectedStudy.id);
      toast.success('Study deleted');
    } catch {
      toast.error('Failed to delete study');
    }
    setShowDelete(false);
    setSelectedStudy(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Studies</h1>
          <p className="text-foreground-secondary mt-1">Browse and manage all studies</p>
        </div>
        <Link href="/studies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Study
          </Button>
        </Link>
      </div>

      <StudyTable
        data={studies}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Study"
        description={`Are you sure you want to delete "${selectedStudy?.title}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={deleteStudy.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
