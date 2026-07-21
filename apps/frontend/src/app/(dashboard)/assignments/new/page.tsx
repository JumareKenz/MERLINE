'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateAssignment, useBatchAssign } from '@/hooks/use-assignments';
import { AssignmentForm } from '@/components/assignments/assignment-form';
import { AssignmentBatchForm } from '@/components/assignments/assignment-batch-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewAssignmentPage() {
  const router = useRouter();
  const createMutation = useCreateAssignment();
  const batchMutation = useBatchAssign();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Assignment</h1>
        <p className="text-foreground-secondary mt-1">Assign questionnaires to enumerators.</p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single Assignment</TabsTrigger>
          <TabsTrigger value="batch">Batch Assign</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="pt-4">
          <AssignmentForm
            onSubmit={(data) => {
              createMutation.mutate(data, {
                onSuccess: () => router.push('/assignments'),
              });
            }}
            isSubmitting={createMutation.isPending}
          />
        </TabsContent>
        <TabsContent value="batch" className="pt-4">
          <AssignmentBatchForm
            onSubmit={(data) => {
              batchMutation.mutate(data, {
                onSuccess: () => router.push('/assignments'),
              });
            }}
            isSubmitting={batchMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
