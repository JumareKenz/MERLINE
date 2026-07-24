'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { TheoryOfChangeBuilder } from '@/components/studies/theory-of-change-builder';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function TocStep() {
  const { study, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const proceed = () => {
    markStepComplete('toc');
    router.push(`/studies/${studyId}/design/logframe`);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">Theory of Change</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Map the causal pathway from inputs to long-term impact. Ask the AI Copilot to review and suggest missing links.
        </p>
      </div>

      <TheoryOfChangeBuilder studyId={studyId} studyDesign={study.studyDesign} />

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/methodology`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Methodology
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={proceed}>
          Logframe <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
