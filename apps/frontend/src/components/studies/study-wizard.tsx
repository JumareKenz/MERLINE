'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CreateStudyDto, StudyType, StudyMethodology } from '@/types/study';
import type { Project } from '@/types/project';

const STUDY_TYPES: { value: StudyType; label: string }[] = [
  { value: 'baseline', label: 'Baseline' },
  { value: 'midline', label: 'Midline' },
  { value: 'endline', label: 'Endline' },
  { value: 'kis', label: 'KIS (Key Informant Study)' },
  { value: 'formative', label: 'Formative' },
  { value: 'rapid_assessment', label: 'Rapid Assessment' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'needs_assessment', label: 'Needs Assessment' },
  { value: 'feasibility', label: 'Feasibility' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'longitudinal', label: 'Longitudinal' },
  { value: 'cross_sectional', label: 'Cross-Sectional' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'quasi_experimental', label: 'Quasi-Experimental' },
  { value: 'randomized_control', label: 'RCT' },
  { value: 'other', label: 'Other' },
];

const METHODOLOGIES: { value: StudyMethodology; label: string }[] = [
  { value: 'quantitative', label: 'Quantitative' },
  { value: 'qualitative', label: 'Qualitative' },
  { value: 'mixed_method', label: 'Mixed Method' },
  { value: 'desk_review', label: 'Desk Review' },
];

const step1Schema = z.object({
  title: z.string().min(5).max(500),
  study_type: z.string().min(1, 'Select a study type'),
  methodology: z.string().min(1, 'Select a methodology'),
  project_id: z.string().min(1, 'Select a project'),
});

const step2Schema = z.object({
  purpose: z.string().max(2000).optional(),
  objectives: z.string().optional(),
  research_questions: z.string().optional(),
});

const step3Schema = z.object({
  population: z.string().max(1000).optional(),
  sample_size: z.coerce.number().min(1, 'Must be at least 1').optional(),
  location: z.string().max(500).optional(),
});

const step4Schema = z.object({
  ethical_approval_status: z.string().optional(),
  donor_framework: z.string().optional(),
});

interface StudyWizardProps {
  projects?: Project[];
  projectsLoading?: boolean;
  onSubmit: (data: CreateStudyDto) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function StudyWizard({ projects, projectsLoading, onSubmit, isSubmitting, onCancel }: StudyWizardProps) {
  const [step, setStep] = useState(0);
  const [storedData, setStoredData] = useState<Partial<CreateStudyDto>>({});

  const form = useForm({
    resolver: zodResolver(step === 0 ? step1Schema : step === 1 ? step2Schema : step === 2 ? step3Schema : step4Schema),
    defaultValues: { title: '', study_type: '', methodology: '', project_id: '', purpose: '', objectives: '', research_questions: '', population: '', sample_size: undefined, location: '', ethical_approval_status: '', donor_framework: '' },
    mode: 'onBlur',
  });

  const steps = [
    { title: 'Basic Info', description: 'Name, type, and methodology' },
    { title: 'Description', description: 'Purpose and objectives' },
    { title: 'Methodology', description: 'Population and sampling' },
    { title: 'Ethical Review', description: 'Approval and frameworks' },
    { title: 'Review', description: 'Review and submit' },
  ];

  const handleNext = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    const values = form.getValues();
    setStoredData((prev) => ({ ...prev, ...values } as unknown as Partial<CreateStudyDto>));
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    const allData = { ...storedData, ...form.getValues() };
    onSubmit({
      title: allData.title ?? '',
      study_type: allData.study_type as StudyType,
      methodology: allData.methodology as StudyMethodology,
      purpose: allData.purpose || undefined,
      population: allData.population || undefined,
      sample_size: allData.sample_size || undefined,
      location: allData.location || undefined,
      start_date: '',
      end_date: '',
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  i < step ? 'bg-primary text-white' : i === step ? 'bg-primary text-white ring-2 ring-primary-200' : 'bg-neutral-100 text-neutral-400'
                )}
              >
                {i + 1}
              </div>
              <span className={cn('text-xs mt-1 hidden md:block', i === step ? 'font-medium text-primary' : 'text-foreground-secondary')}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-3">
          <div className="absolute top-0 left-0 h-1 bg-neutral-100 rounded-full w-full" />
          <div className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-all" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="bg-background-elevated rounded-lg p-6 shadow-1">
        <h2 className="text-lg font-semibold mb-1">{steps[step].title}</h2>
        <p className="text-sm text-foreground-secondary mb-6">{steps[step].description}</p>

        <Form {...form}>
          <form className="space-y-6">
            {step === 0 && (
              <>
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={projectsLoading ? 'Loading...' : 'Select project'} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Title *</FormLabel>
                    <FormControl><Input placeholder="e.g., Health Baseline Survey 2026" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="study_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Study Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STUDY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="methodology" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Methodology *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select methodology" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {METHODOLOGIES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <FormControl><Textarea placeholder="Describe the purpose of this study" className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="objectives" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives</FormLabel>
                    <FormControl><Textarea placeholder="List the key objectives (one per line)" className="min-h-[80px]" {...field} /></FormControl>
                    <FormDescription>Enter each objective on a new line</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="research_questions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Research Questions</FormLabel>
                    <FormControl><Textarea placeholder="List research questions (one per line)" className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {step === 2 && (
              <>
                <FormField control={form.control} name="population" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Population</FormLabel>
                    <FormControl><Textarea placeholder="Describe the target population" className="min-h-[80px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="sample_size" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Size</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 1200" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="e.g., Nairobi, Kenya" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <FormField control={form.control} name="ethical_approval_status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ethical Approval Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="not_required">Not Required</SelectItem>
                        <SelectItem value="exempt">Exempt</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="donor_framework" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donor Framework</FormLabel>
                    <FormControl><Input placeholder="e.g., USAID PMP, DFID LogFrame" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-medium">Review Study Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries({ ...storedData, ...form.getValues() }).filter(([k]) => !['objectives', 'research_questions'].includes(k)).map(([key, val]) => (
                    val ? <div key={key}><span className="text-foreground-secondary capitalize">{key.replace(/_/g, ' ')}:</span> <span className="font-medium">{String(val)}</span></div> : null
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <div>
            {step > 0 ? (
              <Button variant="secondary" onClick={handleBack}>Back</Button>
            ) : onCancel ? (
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground-secondary">Step {step + 1} of {steps.length}</span>
            {step < steps.length - 1 ? (
              <Button onClick={handleNext}>Continue</Button>
            ) : (
              <Button onClick={handleFinish} loading={isSubmitting}>Submit Study</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
