'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSilentUpdateStudy } from '@/hooks/use-studies';
import type { Study } from '@/types/study';

export type SamplingMethod = 'simple_random' | 'systematic' | 'stratified' | 'cluster' | 'purposive' | 'snowball' | 'convenience';

export interface SampleSizeCalc {
  populationSize?: number;
  confidenceLevel: 95 | 90 | 99;
  marginOfError: number;
  expectedProportion: number;
  designEffect: number;
  attritionRate: number;
  calculatedN?: number;
  recommendedN?: number;
}

export interface StudyDesignData {
  problemStatement: string;
  researchContext: string;
  researchQuestions: string[];
  objectives: { id: string; text: string; type: 'general' | 'specific' }[];
  methodology: {
    type: string;
    approach: string;
    ethicalStatus: 'approved' | 'pending' | 'not_required' | 'exempt' | '';
    ethicalRef: string;
  };
  population: {
    description: string;
    location: string;
    size?: number;
    characteristics: string;
  };
  sampleSize: SampleSizeCalc;
  samplingStrategy: {
    method: SamplingMethod | '';
    rationale: string;
    strata: string[];
  };
  toc: unknown;
  completedSteps: Record<string, boolean>;
}

const DEFAULT_DESIGN: StudyDesignData = {
  problemStatement: '',
  researchContext: '',
  researchQuestions: [],
  objectives: [],
  methodology: { type: '', approach: '', ethicalStatus: '', ethicalRef: '' },
  population: { description: '', location: '', characteristics: '' },
  sampleSize: {
    confidenceLevel: 95,
    marginOfError: 5,
    expectedProportion: 50,
    designEffect: 1,
    attritionRate: 10,
  },
  samplingStrategy: { method: '', rationale: '', strata: [] },
  toc: null,
  completedSteps: {},
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function parseDesign(raw: unknown): StudyDesignData {
  if (!raw || typeof raw !== 'object') return DEFAULT_DESIGN;
  const r = raw as Record<string, unknown>;
  return {
    ...DEFAULT_DESIGN,
    ...r,
    researchQuestions: Array.isArray(r.researchQuestions) ? (r.researchQuestions as string[]) : [],
    objectives: Array.isArray(r.objectives)
      ? (r.objectives as StudyDesignData['objectives'])
      : [],
    methodology: { ...DEFAULT_DESIGN.methodology, ...(r.methodology as object || {}) },
    population: { ...DEFAULT_DESIGN.population, ...(r.population as object || {}) },
    sampleSize: { ...DEFAULT_DESIGN.sampleSize, ...(r.sampleSize as object || {}) },
    samplingStrategy: { ...DEFAULT_DESIGN.samplingStrategy, ...(r.samplingStrategy as object || {}) },
    completedSteps: (r.completedSteps as Record<string, boolean>) || {},
  };
}

export function useStudyDesign(study: Study | undefined) {
  const [design, setDesignState] = useState<StudyDesignData>(() =>
    parseDesign(study?.studyDesign)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const updateStudy = useSilentUpdateStudy();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyId = study?.id;

  useEffect(() => {
    if (study?.studyDesign) {
      setDesignState(parseDesign(study.studyDesign));
    }
  }, [study?.id]);

  const persist = useCallback(
    (next: StudyDesignData) => {
      if (!studyId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setSaveStatus('saving');
      saveTimer.current = setTimeout(() => {
        updateStudy.mutate(
          { id: studyId, data: { studyDesign: next as unknown as Record<string, unknown> } },
          {
            onSuccess: () => {
              setSaveStatus('saved');
              resetTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
            },
            onError: () => setSaveStatus('error'),
          },
        );
      }, 800);
    },
    [studyId, updateStudy],
  );

  const setDesign = useCallback(
    (updater: StudyDesignData | ((prev: StudyDesignData) => StudyDesignData)) => {
      setDesignState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markStepComplete = useCallback(
    (step: string, complete = true) => {
      setDesign((prev) => ({
        ...prev,
        completedSteps: { ...prev.completedSteps, [step]: complete },
      }));
    },
    [setDesign],
  );

  return { design, setDesign, saveStatus, markStepComplete };
}

export function computeN(calc: SampleSizeCalc): number {
  const z = calc.confidenceLevel === 99 ? 2.576 : calc.confidenceLevel === 90 ? 1.645 : 1.96;
  const p = calc.expectedProportion / 100;
  const e = calc.marginOfError / 100;
  const n0 = (z * z * p * (1 - p)) / (e * e);

  let n = n0;
  if (calc.populationSize && calc.populationSize > 0) {
    n = (n0 * calc.populationSize) / (n0 + calc.populationSize - 1);
  }
  n = n * (calc.designEffect || 1);
  n = n / (1 - (calc.attritionRate || 0) / 100);
  return Math.ceil(n);
}
