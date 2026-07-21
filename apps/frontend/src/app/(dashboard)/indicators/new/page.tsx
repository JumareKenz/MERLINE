'use client';

import { useRouter } from 'next/navigation';
import { IndicatorForm } from '@/components/indicators/indicator-form';
import { useCreateIndicator } from '@/hooks/use-indicators';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreateIndicatorDto } from '@/types/indicator';
import { toast } from 'sonner';

export default function NewIndicatorPage() {
  const router = useRouter();
  const createIndicator = useCreateIndicator();

  const handleSubmit = async (data: CreateIndicatorDto) => {
    try {
      const result = await createIndicator.mutateAsync(data);
      toast.success('Indicator created successfully');
      router.push(`/indicators/${result.data.data.id}`);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">New Indicator</h1>
        <p className="text-foreground-secondary mt-1">Create a new indicator for the library</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Indicator Details</CardTitle>
        </CardHeader>
        <CardContent>
          <IndicatorForm onSubmit={handleSubmit} isSubmitting={createIndicator.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
