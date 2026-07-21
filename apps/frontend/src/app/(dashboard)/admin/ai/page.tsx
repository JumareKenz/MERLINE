'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiMetricsDashboard } from '@/components/ai/ai-metrics-dashboard';
import { AiInferenceLog } from '@/components/ai/ai-inference-log';
import { AiDocumentManager } from '@/components/ai/ai-document-manager';
import { AiPromptEditor } from '@/components/ai/ai-prompt-editor';

export default function AiAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Settings</h1>
        <p className="text-foreground-secondary mt-1">
          Monitor AI usage, manage documents, and review system prompts
        </p>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Usage Metrics</TabsTrigger>
          <TabsTrigger value="inferences">Inference Log</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="pt-4">
          <AiMetricsDashboard />
        </TabsContent>

        <TabsContent value="inferences" className="pt-4">
          <AiInferenceLog />
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <AiDocumentManager />
        </TabsContent>

        <TabsContent value="prompts" className="pt-4">
          <AiPromptEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
