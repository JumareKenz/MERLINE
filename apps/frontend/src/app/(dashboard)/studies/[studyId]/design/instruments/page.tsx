'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { useQuestionnaires } from '@/hooks/use-questionnaires';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { ArrowRight, ArrowLeft, ClipboardList, Plus, Edit, Eye, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function InstrumentsStep() {
  const { study, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuestionnaires({ study_id: studyId });
  const questionnaires = data?.data?.data || [];

  const proceed = () => {
    if (questionnaires.length > 0) markStepComplete('instruments');
    router.push(`/studies/${studyId}/design/review`);
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Research Instruments</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            Design and validate the questionnaires that will be used for data collection.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/questionnaires/new?study_id=${studyId}`}>
            <Button size="sm" className="h-8 px-3 text-[13px]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Questionnaire
            </Button>
          </Link>
        </div>
      </div>

      {/* AI hint */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[12px] text-foreground-secondary">
          Open the <strong>AI Copilot</strong> and ask it to review your questionnaire structure, detect missing questions, check for response bias, or estimate interview time.
        </p>
      </div>

      {/* Questionnaires */}
      {isLoading ? (
        <div className="space-y-3">{[1,2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : questionnaires.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<ClipboardList className="h-9 w-9" strokeWidth={1.5} />}
              title="No questionnaires yet"
              description="Create your first data collection instrument. The AI Copilot can help you design questions aligned with your indicators and objectives."
              action={
                <Link href={`/questionnaires/new?study_id=${studyId}`}>
                  <Button size="sm" className="h-8 px-3 text-[13px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Questionnaire
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questionnaires.map((q: any) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={q.status} />
                      <span className="text-[12px] text-foreground-tertiary font-mono">v{q.version ?? 1}</span>
                    </div>
                    <p className="text-[14px] font-medium">{q.title}</p>
                    {q.description && (
                      <p className="text-[12px] text-foreground-tertiary mt-0.5 truncate">{q.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[12px] text-foreground-tertiary">
                      <span>{q.section_count ?? q.sections?.length ?? 0} sections</span>
                      <span>{q.question_count ?? q.questions?.length ?? 0} questions</span>
                      {q.estimated_duration_minutes && (
                        <span>~{q.estimated_duration_minutes} min</span>
                      )}
                      {q.primary_language && (
                        <span className="uppercase">{q.primary_language}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/questionnaires/${q.id}/preview`}>
                      <Button size="xs" variant="ghost" className="h-7 px-2 text-[12px]">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                    </Link>
                    <Link href={`/questionnaires/${q.id}/edit`}>
                      <Button size="xs" variant="outline" className="h-7 px-2 text-[12px]">
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Instrument quality indicators */}
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                  {['Skip logic', 'Validation rules', 'Translations'].map((feat) => {
                    const hasFeature = feat === 'Skip logic'
                      ? false // TODO: check skip logic count
                      : feat === 'Validation rules'
                      ? false
                      : false;
                    return (
                      <span
                        key={feat}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          hasFeature
                            ? 'bg-success/10 text-success'
                            : 'bg-background-subtle text-foreground-tertiary border border-border/50'
                        }`}
                      >
                        {hasFeature ? '✓' : '○'} {feat}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/indicators`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Indicators
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={proceed}>
          Review & Approve <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
