'use client';

import { useRouter } from 'next/navigation';
import { QuestionnaireForm } from '@/components/questionnaires/questionnaire-form';
import { useCreateQuestionnaire } from '@/hooks/use-questionnaires';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreateQuestionnaireDto } from '@/types/questionnaire';
import { toast } from 'sonner';

export default function NewQuestionnairePage() {
  const router = useRouter();
  const createQuestionnaire = useCreateQuestionnaire();

  const handleSubmit = async (data: CreateQuestionnaireDto) => {
    try {
      const result = await createQuestionnaire.mutateAsync(data);
      toast.success('Questionnaire created successfully');
      router.push(`/questionnaires/${result.data.data.id}/edit`);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">New Questionnaire</h1>
        <p className="text-foreground-secondary mt-1">Create a new data collection instrument</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Details</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionnaireForm onSubmit={handleSubmit} isSubmitting={createQuestionnaire.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
