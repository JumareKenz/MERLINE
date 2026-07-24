'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { useUpdateStudy } from '@/hooks/use-studies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowLeft, Calculator, Users, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { computeN } from '@/hooks/use-study-design';
import type { SamplingMethod } from '@/hooks/use-study-design';

const SAMPLING_METHODS: { value: SamplingMethod; label: string; desc: string }[] = [
  { value: 'simple_random', label: 'Simple Random Sampling', desc: 'Every member of the population has an equal chance of selection.' },
  { value: 'systematic', label: 'Systematic Sampling', desc: 'Select every nth element from a list.' },
  { value: 'stratified', label: 'Stratified Sampling', desc: 'Divide population into subgroups, sample from each.' },
  { value: 'cluster', label: 'Cluster Sampling', desc: 'Divide into clusters, randomly select entire clusters.' },
  { value: 'purposive', label: 'Purposive Sampling', desc: 'Deliberately select participants based on specific criteria.' },
  { value: 'snowball', label: 'Snowball Sampling', desc: 'Existing participants recruit future ones. For hard-to-reach populations.' },
  { value: 'convenience', label: 'Convenience Sampling', desc: 'Select based on availability. Lower representativeness.' },
];

export default function MethodologyStep() {
  const { study, design, setDesign, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const updateStudy = useUpdateStudy();
  const router = useRouter();

  const recommendedN = useMemo(() => computeN(design.sampleSize), [design.sampleSize]);

  const update = (path: string[], value: unknown) => {
    setDesign((prev) => {
      const next = { ...prev };
      let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        obj[path[i]] = { ...(obj[path[i]] as object) };
        obj = obj[path[i]] as Record<string, unknown>;
      }
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleProceed = () => {
    setDesign((prev) => ({
      ...prev,
      sampleSize: { ...prev.sampleSize, recommendedN },
    }));
    markStepComplete('methodology');
    router.push(`/studies/${studyId}/design/toc`);
  };

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">Methodology</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Define how data will be collected, from whom, and at what scale.
        </p>
      </div>

      {/* Population */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Study Population</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Target Population Description</Label>
            <Textarea
              value={design.population.description}
              onChange={(e) => update(['population', 'description'], e.target.value)}
              placeholder="Who are you studying? e.g., Households with children under 5 in urban Nairobi"
              rows={2}
              className="text-[13px] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Geographic Location</Label>
              <Input
                value={design.population.location}
                onChange={(e) => update(['population', 'location'], e.target.value)}
                placeholder="e.g., Nairobi County, Kenya"
                className="text-[13px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Total Population Size (if known)</Label>
              <Input
                type="number"
                value={design.sampleSize.populationSize ?? ''}
                onChange={(e) => update(['sampleSize', 'populationSize'], e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 50000"
                className="text-[13px] h-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Key Characteristics / Inclusion Criteria</Label>
            <Textarea
              value={design.population.characteristics}
              onChange={(e) => update(['population', 'characteristics'], e.target.value)}
              placeholder="Key characteristics, inclusion/exclusion criteria…"
              rows={2}
              className="text-[13px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sample Size Calculator */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Sample Size Calculator</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Confidence Level</Label>
              <Select
                value={String(design.sampleSize.confidenceLevel)}
                onValueChange={(v) => update(['sampleSize', 'confidenceLevel'], Number(v))}
              >
                <SelectTrigger className="text-[13px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90" className="text-[13px]">90% (less precise, smaller n)</SelectItem>
                  <SelectItem value="95" className="text-[13px]">95% (standard)</SelectItem>
                  <SelectItem value="99" className="text-[13px]">99% (high precision, larger n)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Margin of Error (%)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={design.sampleSize.marginOfError}
                onChange={(e) => update(['sampleSize', 'marginOfError'], Number(e.target.value))}
                className="text-[13px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Expected Proportion (%) <span className="text-foreground-tertiary font-normal">— use 50% if unknown</span></Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={design.sampleSize.expectedProportion}
                onChange={(e) => update(['sampleSize', 'expectedProportion'], Number(e.target.value))}
                className="text-[13px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Design Effect <span className="text-foreground-tertiary font-normal">— 1 for SRS, 1.5-2 for cluster</span></Label>
              <Input
                type="number"
                min={1}
                step={0.1}
                value={design.sampleSize.designEffect}
                onChange={(e) => update(['sampleSize', 'designEffect'], Number(e.target.value))}
                className="text-[13px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Expected Attrition / Non-response (%)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={design.sampleSize.attritionRate}
                onChange={(e) => update(['sampleSize', 'attritionRate'], Number(e.target.value))}
                className="text-[13px] h-8"
              />
            </div>
          </div>

          {/* Result */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
            <div>
              <p className="text-[12px] text-foreground-tertiary">Recommended Sample Size</p>
              <p className="text-[32px] font-semibold tracking-tight text-primary leading-none mt-1">
                {recommendedN.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 text-[12px] text-foreground-secondary space-y-0.5">
              <p>Confidence: {design.sampleSize.confidenceLevel}% | Margin of error: ±{design.sampleSize.marginOfError}%</p>
              {design.sampleSize.populationSize && (
                <p>Finite population correction applied (N = {design.sampleSize.populationSize.toLocaleString()})</p>
              )}
              <p>Design effect: {design.sampleSize.designEffect}× | Attrition: {design.sampleSize.attritionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sampling Strategy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Sampling Strategy</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {SAMPLING_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => update(['samplingStrategy', 'method'], m.value)}
                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                  design.samplingStrategy.method === m.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-background-hover'
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  design.samplingStrategy.method === m.value ? 'border-primary' : 'border-border'
                }`}>
                  {design.samplingStrategy.method === m.value && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-medium">{m.label}</p>
                  <p className="text-[12px] text-foreground-tertiary mt-0.5">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {design.samplingStrategy.method === 'stratified' && (
            <div className="space-y-1.5">
              <Label className="text-[13px]">Strata (one per line)</Label>
              <Textarea
                value={design.samplingStrategy.strata.join('\n')}
                onChange={(e) => update(['samplingStrategy', 'strata'], e.target.value.split('\n').filter(Boolean))}
                placeholder="e.g.&#10;Urban households&#10;Rural households&#10;Peri-urban households"
                rows={3}
                className="text-[13px] resize-none"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[13px]">Rationale</Label>
            <Textarea
              value={design.samplingStrategy.rationale}
              onChange={(e) => update(['samplingStrategy', 'rationale'], e.target.value)}
              placeholder="Justify your sampling approach…"
              rows={2}
              className="text-[13px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/research`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Research
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={handleProceed}>
          Theory of Change <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
