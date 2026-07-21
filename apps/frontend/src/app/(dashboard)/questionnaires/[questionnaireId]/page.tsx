'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/hooks/use-questionnaires';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Edit, Eye, FileText } from 'lucide-react';
import Link from 'next/link';

export default function QuestionnaireDetailPage() {
  const { questionnaireId } = useParams<{ questionnaireId: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useQuestionnaire(questionnaireId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const questionnaire = data?.data?.data;
  if (!questionnaire) return <ErrorState message="Questionnaire not found" />;

  const sections = questionnaire.sections || [];
  const allQuestions = questionnaire.questions || [];
  const questionCount = allQuestions.length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <StatusBadge status={questionnaire.status} />
          <span className="text-sm text-foreground-secondary font-mono">{questionnaire.code}</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{questionnaire.title}</h1>
        {questionnaire.description && (
          <p className="text-foreground-secondary mt-2 max-w-2xl">{questionnaire.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/questionnaires/${questionnaireId}/edit`}>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-1" /> Edit Form
          </Button>
        </Link>
        <Link href={`/questionnaires/${questionnaireId}/preview`}>
          <Button size="sm" variant="secondary">
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{sections.length}</p>
              <p className="text-xs text-foreground-secondary">Sections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{questionCount}</p>
              <p className="text-xs text-foreground-secondary">Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{formatDate(questionnaire.created_at)}</p>
              <p className="text-xs text-foreground-secondary">Created</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="pt-4">
          {sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => {
                const sectionQuestions = allQuestions.filter((q) => q.section_id === section.id);
                return (
                  <Card key={section.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sectionQuestions.length > 0 ? (
                        <div className="space-y-1">
                          {sectionQuestions.map((q, i) => (
                            <div key={q.id} className="flex items-center gap-2 py-1 text-sm">
                              <span className="text-foreground-tertiary text-xs">{i + 1}.</span>
                              <span className="flex-1">{q.label}</span>
                              <span className="text-[10px] text-foreground-secondary capitalize">
                                {q.question_type.replace(/_/g, ' ')}
                              </span>
                              {q.required && <span className="text-error text-xs">*</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground-secondary">No questions in this section</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-foreground-secondary mb-4">No sections defined yet</p>
                <Link href={`/questionnaires/${questionnaireId}/edit`}>
                  <Button size="sm">Start Building</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Questionnaire Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-foreground-secondary">Language</p>
                <p className="font-medium">{questionnaire.language || questionnaire.default_language || 'English'}</p>
              </div>
              {questionnaire.target_subject_count && (
                <div>
                  <p className="text-sm text-foreground-secondary">Target Subjects</p>
                  <p className="font-medium">{questionnaire.target_subject_count.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-foreground-secondary">Last Modified</p>
                <p className="font-medium">{formatDate(questionnaire.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
