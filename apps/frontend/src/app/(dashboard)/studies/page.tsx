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
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Studies</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">Browse and manage all studies</p>
        </div>
        <Link href="/studies/new">
          <Button size="sm" className="h-8 px-3 text-[13px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Study
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
