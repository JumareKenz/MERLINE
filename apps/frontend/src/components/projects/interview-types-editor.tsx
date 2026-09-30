'use client';

import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useProjectInterviewTypes, useSetInterviewTypes } from '@/hooks/use-interview-types';
import { STANDARD_TYPE_LABELS, fieldKey, typeKeyFromLabel, validateTypeDrafts } from '@/lib/interview-types';
import type { TypeField } from '@/types/review';

interface Draft {
  key: string;
  label: string;
  description: string;
  fields: TypeField[];
  /** Standard keys cannot be renamed; custom keys are made from the label until saved. */
  locked: boolean;
}

const STANDARD = Object.entries(STANDARD_TYPE_LABELS).filter(([k]) => k !== 'OTHER');

/**
 * Which kinds of interview this project collects. A project can hold
 * several at once (focus groups, key informants, household visits…); each
 * can capture its own extra details. Enumerators pick one for every
 * interview, and reports compare across them.
 */
export function InterviewTypesEditor({ projectId }: { projectId: string }) {
  const query = useProjectInterviewTypes(projectId);
  const save = useSetInterviewTypes(projectId);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  useEffect(() => {
    if (!query.data || dirty) return;
    setDrafts(
      query.data.types.map((t) => ({
        key: t.key,
        label: t.label,
        description: t.description ?? '',
        fields: t.fields,
        locked: true,
      })),
    );
  }, [query.data, dirty]);

  if (query.isLoading) return <LoadingState rows={2} message="Loading interview types" />;
  if (query.isError) return <ErrorState message="The interview types could not be loaded." onRetry={() => query.refetch()} />;

  const change = (next: Draft[]) => {
    setDrafts(next);
    setDirty(true);
  };
  const update = (i: number, patch: Partial<Draft>) => change(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const problems = validateTypeDrafts(drafts);
  const available = STANDARD.filter(([k]) => !drafts.some((d) => d.key === k));

  return (
    <div>
      <p className="text-[14px] text-foreground-secondary">
        {query.data?.configured
          ? 'This project collects the types below.'
          : 'This project has not chosen types, so enumerators can pick any standard type. Choose the ones you use to keep submissions consistent.'}
      </p>

      <ul className="mt-4 space-y-3">
        {drafts.map((d, i) => (
          <li key={`${d.key}-${i}`} className="rounded-lg border border-border-subtle p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-[200px] flex-1">
                <label className="text-[12px] font-medium text-foreground-tertiary" htmlFor={`type-label-${i}`}>
                  Name
                </label>
                <Input
                  id={`type-label-${i}`}
                  value={d.label}
                  maxLength={100}
                  onChange={(e) => update(i, { label: e.target.value, ...(!d.locked && { key: typeKeyFromLabel(e.target.value) }) })}
                />
                <p className="mt-1 text-[12px] text-foreground-tertiary">Identifier: {d.key || '—'}</p>
              </div>
              <Button variant="ghost" size="sm" aria-label={`Remove ${d.label || 'type'}`} onClick={() => change(drafts.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="mt-3">
              <label className="text-[12px] font-medium text-foreground-tertiary" htmlFor={`type-desc-${i}`}>
                What it is <span className="font-normal">(optional)</span>
              </label>
              <Input id={`type-desc-${i}`} value={d.description} maxLength={500} onChange={(e) => update(i, { description: e.target.value })} />
            </div>

            <fieldset className="mt-3">
              <legend className="text-[12px] font-medium text-foreground-tertiary">Extra details to capture for this type</legend>
              {d.fields.length === 0 && <p className="mt-1 text-[13px] text-foreground-tertiary">None. For a focus group you might ask for group size.</p>}
              <ul className="mt-2 space-y-2">
                {d.fields.map((f, k) => (
                  <li key={k} className="grid gap-2 sm:grid-cols-[1fr_130px_auto_auto]">
                    <Input
                      aria-label="Field label"
                      placeholder="e.g. Group size"
                      value={f.label}
                      maxLength={100}
                      onChange={(e) =>
                        update(i, {
                          fields: d.fields.map((x, m) => (m === k ? { ...x, label: e.target.value, key: x.key || fieldKey(e.target.value) } : x)),
                        })
                      }
                    />
                    <NativeSelect
                      aria-label="Field type"
                      value={f.kind}
                      onChange={(e) => update(i, { fields: d.fields.map((x, m) => (m === k ? { ...x, kind: e.target.value as TypeField['kind'] } : x)) })}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="select">Choice</option>
                    </NativeSelect>
                    <label className="flex items-center gap-2 text-[13px] text-foreground-secondary">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!f.required}
                        onChange={(e) => update(i, { fields: d.fields.map((x, m) => (m === k ? { ...x, required: e.target.checked } : x)) })}
                      />
                      Required
                    </label>
                    <Button variant="ghost" size="sm" aria-label="Remove field" onClick={() => update(i, { fields: d.fields.filter((_, m) => m !== k) })}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                    {f.kind === 'select' && (
                      <Input
                        className="sm:col-span-4"
                        aria-label="Choices, separated by commas"
                        placeholder="Choices, separated by commas"
                        value={(f.options ?? []).join(', ')}
                        onChange={(e) =>
                          update(i, { fields: d.fields.map((x, m) => (m === k ? { ...x, options: e.target.value.split(',').map((s) => s.trim()) } : x)) })
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => update(i, { fields: [...d.fields, { key: '', label: '', kind: 'text' }] })}
                disabled={d.fields.length >= 20}
              >
                <Plus className="h-4 w-4" aria-hidden /> Add a detail
              </Button>
            </fieldset>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {available.length > 0 && (
          <NativeSelect
            aria-label="Add a standard type"
            className="w-56"
            value=""
            onChange={(e) => {
              const key = e.target.value;
              if (key) change([...drafts, { key, label: STANDARD_TYPE_LABELS[key], description: '', fields: [], locked: true }]);
            }}
          >
            <option value="">Add a standard type…</option>
            {available.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button variant="secondary" onClick={() => change([...drafts, { key: '', label: '', description: '', fields: [], locked: false }])} disabled={drafts.length >= 20}>
          <Plus className="h-4 w-4" aria-hidden /> Add your own type
        </Button>
      </div>

      {showProblems && problems.length > 0 && (
        <ul role="alert" className="mt-4 list-disc rounded-lg bg-error-bg py-3 pl-8 pr-4 text-[13.5px] text-foreground">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex gap-2">
        <Button
          loading={save.isPending}
          disabled={!dirty}
          onClick={async () => {
            setShowProblems(true);
            if (problems.length) return;
            await save
              .mutateAsync(
                drafts.map((d) => ({
                  key: d.key,
                  label: d.label.trim(),
                  ...(d.description.trim() && { description: d.description.trim() }),
                  fields: d.fields.map((f) => ({ ...f, key: f.key || fieldKey(f.label), options: f.kind === 'select' ? (f.options ?? []).filter(Boolean) : undefined })),
                })),
              )
              .then(() => {
                setDirty(false);
                setShowProblems(false);
              })
              .catch(() => undefined);
          }}
        >
          Save interview types
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setDirty(false)}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Discard changes
          </Button>
        )}
      </div>
    </div>
  );
}
