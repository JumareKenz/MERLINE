'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QuestionnaireTable } from '@/components/questionnaires/questionnaire-table';
import { useQuestionnaires } from '@/hooks/use-questionnaires';
import { Button } from '@/components/ui/button';
import { Plus, ClipboardList } from 'lucide-react';

export default function QuestionnairesPage() {
  const { data, isLoading, isError, error, refetch } = useQuestionnaires();

  const questionnaires = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Questionnaires</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">Design and manage data collection instruments</p>
        </div>
        <Link href="/questionnaires/new">
          <Button size="sm" className="h-8 px-3 text-[13px]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Questionnaire
          </Button>
        </Link>
      </div>

      <QuestionnaireTable
        data={questionnaires}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
