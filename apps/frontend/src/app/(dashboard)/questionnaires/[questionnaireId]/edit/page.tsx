'use client';

import { useParams } from 'next/navigation';
import { useQuestionnaire } from '@/hooks/use-questionnaires';
import { FormBuilderLayout } from '@/components/forms/form-builder-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export default function EditQuestionnairePage() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const { data, isLoading, isError, error, refetch } = useQuestionnaire(questionnaireId);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <Skeleton className="h-12 shrink-0" />
        <div className="flex-1 grid grid-cols-[280px_1fr_320px] gap-px bg-border">
          <Skeleton className="h-full rounded-none" />
          <Skeleton className="h-full rounded-none" />
          <Skeleton className="h-full rounded-none" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const questionnaire = data?.data?.data;
  if (!questionnaire) return <ErrorState message="Questionnaire not found" />;

  return (
    <FormBuilderLayout
      questionnaireId={questionnaireId}
      initialTitle={questionnaire.title}
      initialSections={questionnaire.sections || []}
      initialQuestions={questionnaire.questions || []}
    />
  );
}
