'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFindings, useCreateFinding, useAddQuotation } from '@/hooks/use-findings';
import { segmentText, type TranscriptSegment } from '@/types/transcript';

interface QuoteSegmentDialogProps {
  segment: TranscriptSegment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteSegmentDialog({ segment, open, onOpenChange }: QuoteSegmentDialogProps) {
  const router = useRouter();
  // The corrected text when there is one: that is what the API checks the excerpt against.
  const [excerpt, setExcerpt] = useState(segmentText(segment));
  const [title, setTitle] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [existingFindingId, setExistingFindingId] = useState('');

  const { data: findingsData } = useFindings();
  const createFinding = useCreateFinding();
  const addQuotation = useAddQuotation();

  const findings = (findingsData?.data?.data || []).filter((f) => f.status !== 'PUBLISHED' && f.status !== 'ARCHIVED');
  const isPending = createFinding.isPending || addQuotation.isPending;

  const handleCreateNew = async () => {
    if (!title || !interpretation || !excerpt) return;
    const result = await createFinding.mutateAsync({ title, interpretation });
    const finding = result.data.data;
    await addQuotation.mutateAsync({
      id: finding.id,
      data: { transcriptSegmentId: segment.id, excerpt },
    });
    onOpenChange(false);
    router.push(`/findings/${finding.id}`);
  };

  const handleAddToExisting = async () => {
    if (!existingFindingId || !excerpt) return;
    await addQuotation.mutateAsync({
      id: existingFindingId,
      data: { transcriptSegmentId: segment.id, excerpt },
    });
    onOpenChange(false);
    router.push(`/findings/${existingFindingId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quote this segment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Excerpt</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="text-[13px] resize-none"
            />
            <p className="text-[13px] text-foreground-tertiary">
              Must be an exact excerpt from the transcript — trim it, but don&apos;t rewrite it.
            </p>
          </div>

          <Tabs defaultValue="new">
            <TabsList>
              <TabsTrigger value="new">New finding</TabsTrigger>
              <TabsTrigger value="existing">Existing finding</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="pt-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Interpretation *</Label>
                <Textarea
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  rows={3}
                  className="text-[13px] resize-none"
                  placeholder="What does this quote suggest?"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-8 text-[13px]"
                  disabled={!title || !interpretation || !excerpt}
                  loading={isPending}
                  onClick={handleCreateNew}
                >
                  Create Finding
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="existing" className="pt-3 space-y-3">
              {findings.length === 0 ? (
                <p className="text-[13px] text-foreground-secondary py-4 text-center">
                  No draft or in-review findings to add to. Create a new one instead.
                </p>
              ) : (
                <>
                  <Select value={existingFindingId} onValueChange={setExistingFindingId}>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue placeholder="Select a finding" />
                    </SelectTrigger>
                    <SelectContent>
                      {findings.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-[13px]"
                      disabled={!existingFindingId || !excerpt}
                      loading={isPending}
                      onClick={handleAddToExisting}
                    >
                      Add Quotation
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
