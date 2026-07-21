'use client';

import { useParams } from 'next/navigation';
import { useQuestionnaire } from '@/hooks/use-questionnaires';
import { FormPreview } from '@/components/forms/form-preview';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export default function PreviewQuestionnairePage() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const { data, isLoading, isError, error, refetch } = useQuestionnaire(questionnaireId);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Skeleton className="h-12 shrink-0" />
        <Skeleton className="flex-1 m-4" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const questionnaire = data?.data?.data;
  if (!questionnaire) return <ErrorState message="Questionnaire not found" />;

  return (
    <FormPreview
      title={questionnaire.title}
      sections={questionnaire.sections || []}
      questions={questionnaire.questions || []}
    />
  );
}
