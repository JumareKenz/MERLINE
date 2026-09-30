'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownAZ, ArrowUpAZ, ChevronRight, Plus, UsersRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { SearchInput } from '@/components/shared/search-input';
import { CodeBadge } from '@/components/enumerators/code-badge';
import { CreateEnumeratorDialog } from '@/components/enumerators/enumerator-form-dialog';
import { CodeRevealDialog } from '@/components/enumerators/code-reveal-dialog';
import { useEnumerators } from '@/hooks/use-enumerators';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { formatDate } from '@/lib/utils';
import { ACCESS_CODE_LABELS, type AccessCodeState, type CreatedEnumerator, type Enumerator, type EnumeratorFilters } from '@/types/enumerator';

const SORTS: { value: NonNullable<EnumeratorFilters['sortBy']>; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'lastActivity', label: 'Last activity' },
  { value: 'createdAt', label: 'Date added' },
  { value: 'state', label: 'State' },
];

function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters: EnumeratorFilters = useMemo(
    () => ({
      search: params.get('q') || undefined,
      status: (params.get('status') as EnumeratorFilters['status']) || undefined,
      state: params.get('state') || undefined,
      projectId: params.get('project') || undefined,
      codeStatus: (params.get('code') as EnumeratorFilters['codeStatus']) || undefined,
      sortBy: (params.get('sort') as EnumeratorFilters['sortBy']) || 'name',
      sortOrder: (params.get('dir') as EnumeratorFilters['sortOrder']) || 'asc',
    }),
    [params],
  );
  const set = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);
  const active = Boolean(filters.search || filters.status || filters.state || filters.projectId || filters.codeStatus);
  return { filters, set, clear, active };
}

function Row({ e }: { e: Enumerator }) {
  return (
    <tr className="border-t border-border-subtle hover:bg-background-hover">
      <td className="px-4 py-3">
        <Link href={`/enumerators/${e.id}`} className="font-medium text-foreground hover:underline">
          {e.fullName}
        </Link>
        <p className="text-[12px] text-foreground-tertiary">{e.uniqueId ?? '—'}</p>
      </td>
      <td className="px-4 py-3 text-[13px] text-foreground-secondary">
        <p>{e.phone ?? '—'}</p>
        <p className="truncate">{e.email ?? ''}</p>
      </td>
      <td className="px-4 py-3">{e.state ?? '—'}</td>
      <td className="px-4 py-3">
        {e.projects.length === 0 ? (
          <span className="text-foreground-tertiary">None</span>
        ) : (
          <span title={e.projects.map((p) => p.name).join(', ')}>
            {e.projects[0].name}
            {e.projects.length > 1 && <span className="text-foreground-tertiary"> +{e.projects.length - 1}</span>}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={e.isActive ? 'success' : 'default'}>{e.isActive ? 'Active' : 'Inactive'}</Badge>
      </td>
      <td className="px-4 py-3">
        <CodeBadge state={e.accessCode.state} legacy={e.accessCode.legacyShared} />
      </td>
      <td className="px-4 py-3 text-[13px] text-foreground-secondary">{e.lastActivityAt ? formatDate(e.lastActivityAt) : 'No activity yet'}</td>
      <td className="px-2 py-3 text-right">
        <Link href={`/enumerators/${e.id}`} aria-label={`Open ${e.fullName}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-tertiary hover:bg-background-hover hover:text-foreground">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}

function Card({ e }: { e: Enumerator }) {
  return (
    <li>
      <Link href={`/enumerators/${e.id}`} className="block rounded-xl border border-border-subtle bg-background-elevated p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{e.fullName}</p>
            <p className="text-[12px] text-foreground-tertiary">
              {e.uniqueId ?? '—'} · {e.state ?? 'No state'}
            </p>
          </div>
          <Badge variant={e.isActive ? 'success' : 'default'}>{e.isActive ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CodeBadge state={e.accessCode.state} legacy={e.accessCode.legacyShared} />
          <span className="text-[12.5px] text-foreground-secondary">
            {e.projects.length} project{e.projects.length === 1 ? '' : 's'} · {e.stats.interviews} interview{e.stats.interviews === 1 ? '' : 's'}
          </span>
        </div>
      </Link>
    </li>
  );
}

function EnumeratorsView() {
  const { filters, set, clear, active } = useFilters();
  const session = useSession();
  const canCreate = !session.isResolved || session.can('create.enumerators');
  const list = useEnumerators(filters);
  // Unfiltered list feeds the state options and tells "none yet" from "no matches".
  const all = useEnumerators({});
  const projects = useResearchProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<{ created: CreatedEnumerator; name: string } | null>(null);

  const states = useMemo(() => [...new Set((all.data ?? []).map((e) => e.state).filter((s): s is string => !!s))].sort(), [all.data]);
  const rows = list.data ?? [];
  const nobody = !all.isLoading && (all.data ?? []).length === 0;

  return (
    <div>
      <PageHeader
        title="Enumerators"
        description="The people who collect interviews. Each has a personal access code for the field app, the projects they are assigned to, and a record of what they submitted."
        actions={
          canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden /> Add enumerator
            </Button>
          )
        }
      />

      {nobody ? (
        <EmptyState
          icon={<UsersRound />}
          title="No enumerators yet"
          description="Add someone to give them a personal access code and assign the projects they can collect for."
          action={canCreate ? <Button onClick={() => setCreateOpen(true)}>Add the first enumerator</Button> : undefined}
        />
      ) : (
        <>
          <form role="search" aria-label="Filter enumerators" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={(e) => e.preventDefault()}>
            <div className="sm:col-span-2">
              <SearchInput value={filters.search ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder="Search name, phone, email, ID or state" />
            </div>
            <NativeSelect aria-label="Account status" value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
              <option value="">All accounts</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
            <NativeSelect aria-label="Access code status" value={filters.codeStatus ?? ''} onChange={(e) => set({ code: e.target.value || undefined })}>
              <option value="">Any code status</option>
              {(Object.keys(ACCESS_CODE_LABELS) as AccessCodeState[]).map((s) => (
                <option key={s} value={s}>
                  {ACCESS_CODE_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="State" value={filters.state ?? ''} onChange={(e) => set({ state: e.target.value || undefined })}>
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Project" value={filters.projectId ?? ''} onChange={(e) => set({ project: e.target.value || undefined })}>
              <option value="">All projects</option>
              {(projects.data?.items ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </form>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-foreground-secondary" role="status" aria-live="polite">
              {list.isLoading ? 'Loading…' : `${rows.length} enumerator${rows.length === 1 ? '' : 's'}`}
              {active && (
                <button type="button" onClick={clear} className="ml-3 inline-flex items-center gap-1 font-medium text-foreground-link hover:underline">
                  <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
                </button>
              )}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-[13px] text-foreground-secondary">
                Sort by
              </label>
              <NativeSelect id="sort" className="w-40" value={filters.sortBy} onChange={(e) => set({ sort: e.target.value === 'name' ? undefined : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="secondary"
                size="sm"
                aria-label={filters.sortOrder === 'asc' ? 'Sorted ascending; switch to descending' : 'Sorted descending; switch to ascending'}
                onClick={() => set({ dir: filters.sortOrder === 'asc' ? 'desc' : undefined })}
              >
                {filters.sortOrder === 'asc' ? <ArrowDownAZ className="h-4 w-4" aria-hidden /> : <ArrowUpAZ className="h-4 w-4" aria-hidden />}
              </Button>
            </div>
          </div>

          {list.isLoading && !list.data ? (
            <LoadingState message="Loading enumerators" rows={5} />
          ) : list.isError ? (
            <ErrorState message="The enumerators could not be loaded." onRetry={() => list.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              size="inline"
              icon={<UsersRound />}
              title="No enumerators match"
              description="Try a different search, or clear the filters."
              action={
                <Button variant="secondary" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-border-subtle bg-background-elevated lg:block">
                <table className="w-full min-w-[900px] text-left text-[14px]">
                  <thead>
                    <tr className="bg-background-surface text-[12px] uppercase tracking-[0.06em] text-foreground-tertiary">
                      {['Name', 'Contact', 'State', 'Projects', 'Account', 'Access code', 'Last activity'].map((h) => (
                        <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
                          {h}
                        </th>
                      ))}
                      <th scope="col" className="w-10 px-2 py-2.5">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => (
                      <Row key={e.id} e={e} />
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 lg:hidden">
                {rows.map((e) => (
                  <Card key={e.id} e={e} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <CreateEnumeratorDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(created, name) => setIssued({ created, name })} />
      {issued && (
        <CodeRevealDialog
          name={issued.name}
          code={issued.created.accessCode.code}
          expiresAt={issued.created.accessCode.expiresAt}
          uniqueId={issued.created.uniqueId}
          onClose={() => setIssued(null)}
        />
      )}
    </div>
  );
}

export default function EnumeratorsPage() {
  return (
    <Suspense>
      <EnumeratorsView />
    </Suspense>
  );
}
