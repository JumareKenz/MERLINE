'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStudy } from '@/hooks/use-studies';
import { useReports, useCreateReport, useReportTemplates } from '@/hooks/use-reports';
import { useIndicators } from '@/hooks/use-indicators';
import { useSubmissions } from '@/hooks/use-submissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { ReportTable } from '@/components/reports/report-table';
import { StatusBadge } from '@/components/shared/status-badge';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Plus, Sparkles, Send, Calendar,
  Users, BarChart3, Download, Share2, Loader2, Check,
} from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/lib/utils';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AUDIENCE_TYPES = [
  { value: 'executive', label: 'Executive Summary', desc: 'For senior leadership and donors. Concise, impact-focused.' },
  { value: 'technical', label: 'Technical Report', desc: 'For researchers and M&E teams. Detailed methodology and findings.' },
  { value: 'donor', label: 'Donor Report', desc: 'For funding organizations. Aligned with grant objectives.' },
  { value: 'stakeholder', label: 'Stakeholder Report', desc: 'For community and program partners. Accessible language.' },
];

const REPORT_SECTIONS = [
  { id: 'executive_summary', label: 'Executive Summary', default: true },
  { id: 'introduction', label: 'Introduction & Context', default: true },
  { id: 'methodology', label: 'Methodology', default: true },
  { id: 'findings', label: 'Key Findings', default: true },
  { id: 'indicators', label: 'Indicator Performance', default: true },
  { id: 'data_quality', label: 'Data Quality', default: false },
  { id: 'recommendations', label: 'Recommendations', default: true },
  { id: 'conclusion', label: 'Conclusion', default: true },
  { id: 'annexes', label: 'Annexes', default: false },
];

export default function ReportPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const { data: studyData, isLoading: studyLoading } = useStudy(studyId);
  const { data: reportsData, isLoading: reportsLoading, isError, error, refetch } = useReports({ study_id: studyId });
  const { data: templatesData } = useReportTemplates();
  const { data: indicatorsData } = useIndicators({ study_id: studyId });
  const { data: submissionsData } = useSubmissions({ study_id: studyId, per_page: 5 });
  const createReport = useCreateReport();

  const [step, setStep] = useState<'list' | 'create'>('list');
  const [reportTitle, setReportTitle] = useState('');
  const [audience, setAudience] = useState('executive');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    REPORT_SECTIONS.filter((s) => s.default).map((s) => s.id)
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiNarrative, setAiNarrative] = useState('');

  const study = studyData?.data?.data;
  const reports = reportsData?.data?.data || [];
  const templates = templatesData?.data?.data || [];
  const indicators = indicatorsData?.data?.data || [];
  const submissions = submissionsData?.data?.data || [];

  if (studyLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!study) return <ErrorState message="Study not found" />;

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const generateAiNarrative = async () => {
    setAiGenerating(true);
    setAiNarrative('');
    try {
      const res = await API.ai.chat({
        message: `Generate a ${audience} report narrative for this study. Use the following context:\n\nStudy: ${study.title}\nType: ${study.study_type ?? study.type}\nSubmissions: ${submissions.length}\nIndicators tracked: ${indicators.length}\n\nInstructions: ${customInstructions || 'Focus on key findings and recommendations.'}\n\nGenerate a professional narrative for sections: ${selectedSections.join(', ')}.`,
        agent_id: 'reporting',
        context: {
          studyId,
          studyTitle: study.title,
          audience,
          indicatorCount: indicators.length,
          submissionCount: submissions.length,
        },
      });
      const content = res.data?.data?.message?.content ?? '';
      setAiNarrative(content);
    } catch {
      toast.error('AI narrative generation failed. Check your API configuration in Admin → AI Settings.');
      setAiNarrative('AI generation requires an API key. Configure one in Admin → AI Settings, then try again.\n\nIn the meantime, you can write the narrative manually below.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateReport = () => {
    const title = reportTitle || `${study.title} — ${AUDIENCE_TYPES.find((a) => a.value === audience)?.label ?? 'Report'}`;
    createReport.mutate(
      {
        title,
        study_id: studyId,
        type: audience,
        description: aiNarrative || customInstructions || undefined,
        config: { sections: selectedSections, audience, customInstructions },
      } as any,
      {
        onSuccess: (res) => {
          toast.success('Report created');
          const id = res?.data?.data?.id;
          if (id) router.push(`/reports/${id}/edit`);
          else { refetch(); setStep('list'); }
        },
      }
    );
  };

  if (step === 'create') {
    return (
      <div className="p-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('list')} className="text-foreground-tertiary hover:text-foreground text-[12px] flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight">Generate Report</h1>
        </div>

        {/* Report basics */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Report Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Report Title</Label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={`${study.title} — Evaluation Report`}
                className="text-[13px] h-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Audience */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Target Audience</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {AUDIENCE_TYPES.map((a) => (
              <button
                key={a.value}
                onClick={() => setAudience(a.value)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border text-left transition-colors',
                  audience === a.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                )}
              >
                <div className={cn(
                  'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                  audience === a.value ? 'border-primary' : 'border-border',
                )}>
                  {audience === a.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-[13px] font-medium">{a.label}</p>
                  <p className="text-[12px] text-foreground-tertiary mt-0.5">{a.desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Report Sections</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(s.id)}
                    onChange={() => toggleSection(s.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-[13px]">{s.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI narrative */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">AI Narrative</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-[12px] gap-1.5"
                onClick={generateAiNarrative}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                {aiGenerating ? 'Generating…' : 'Generate with AI'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Custom Instructions (optional)</Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Focus on nutrition outcomes, compare against baseline, highlight gender disaggregation…"
                rows={2}
                className="text-[13px] resize-none"
              />
            </div>
            {aiNarrative && (
              <div className="space-y-1.5">
                <Label className="text-[13px]">Generated Narrative (editable)</Label>
                <Textarea
                  value={aiNarrative}
                  onChange={(e) => setAiNarrative(e.target.value)}
                  rows={10}
                  className="text-[12px] resize-none font-mono"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 justify-end border-t border-border pt-4">
          <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={() => setStep('list')}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-[13px]"
            disabled={createReport.isPending}
            onClick={handleCreateReport}
          >
            {createReport.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Create Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/studies/${studyId}`} className="text-foreground-tertiary hover:text-foreground text-[12px] flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {study.title}
            </Link>
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight">Reports</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            Generate and share evidence-based reports for stakeholders
          </p>
        </div>
        <Button size="sm" className="h-8 text-[13px]" onClick={() => setStep('create')}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate Report
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-background-subtle border border-border p-4">
          <p className="text-[22px] font-semibold">{reports.length}</p>
          <p className="text-[12px] text-foreground-tertiary">Total Reports</p>
        </div>
        <div className="rounded-lg bg-background-subtle border border-border p-4">
          <p className="text-[22px] font-semibold">{reports.filter((r: any) => r.status === 'published').length}</p>
          <p className="text-[12px] text-foreground-tertiary">Published</p>
        </div>
        <div className="rounded-lg bg-background-subtle border border-border p-4">
          <p className="text-[22px] font-semibold">{reports.filter((r: any) => r.status === 'draft').length}</p>
          <p className="text-[12px] text-foreground-tertiary">Drafts</p>
        </div>
      </div>

      {/* AI hint */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[12px] text-foreground-secondary">
          Click <strong>Generate Report</strong> to create an AI-assisted report with executive summaries, indicator performance, and recommendations tailored to your chosen audience.
        </p>
      </div>

      {/* Reports list */}
      {reportsLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<FileText className="h-9 w-9" strokeWidth={1.5} />}
              title="No reports yet"
              description="Generate your first report to share findings with stakeholders. AI can write the narrative, you review and publish."
              action={
                <Button size="sm" className="h-8 text-[13px]" onClick={() => setStep('create')}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Generate First Report
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <ReportTable
          data={reports}
          isLoading={reportsLoading}
          isError={isError}
          error={error}
          onRetry={() => refetch()}
        />
      )}
    </div>
  );
}
