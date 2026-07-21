'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Upload, FileText, Trash2, Database, Loader2 } from 'lucide-react';
import { useRagDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-ai';
import { formatRelativeTime, cn } from '@/lib/utils';

export function AiDocumentManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, error, refetch } = useRagDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const documents = data?.data?.data || [];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    uploadMutation.mutate(formData, {
      onSuccess: () => {
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Document Management</CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="gap-1.5"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload Document
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState message="Failed to load documents" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<Database className="h-12 w-12" />}
            title="No documents uploaded"
            description="Upload PDFs, Word docs, or CSV files to build your knowledge base."
            action={
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload Document
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.file_size / 1024).toFixed(1)} KB &middot; {doc.chunk_count} chunks &middot; {formatRelativeTime(doc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    doc.status === 'processed' ? 'bg-success/10 text-success' :
                    doc.status === 'processing' ? 'bg-warning/10 text-warning' :
                    doc.status === 'failed' ? 'bg-error/10 text-error' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {doc.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-error"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
