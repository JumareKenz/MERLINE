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
          <h1 className="text-3xl font-bold text-foreground">Questionnaires</h1>
          <p className="text-foreground-secondary mt-1">Design and manage data collection instruments</p>
        </div>
        <Link href="/questionnaires/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Questionnaire
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
