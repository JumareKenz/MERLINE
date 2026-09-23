'use client';

import { useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  error?: { message?: string; status?: number } | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  /** Filters or actions shown beside the search field. */
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  pageSize?: number;
  /** Accessible name for the table. */
  label?: string;
  // Accepted for compatibility with older call sites; paging is client-side.
  total?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  searchable,
  searchPlaceholder = 'Search',
  onSearch,
  toolbar,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  emptyIcon,
  pageSize = 25,
  label,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (isError) return <ErrorState message={error?.message} status={error?.status} onRetry={onRetry} />;
  if (!data.length) {
    return (
      <div className="space-y-3">
        {/* Keep filters reachable, or an over-narrow filter could never be undone. */}
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        <div className="rounded-xl border border-dashed border-border bg-background-elevated/60">
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </div>
      </div>
    );
  }

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-3">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {searchable && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
              <Input
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  table.setPageIndex(0);
                  onSearch?.(e.target.value);
                }}
                className="pl-9"
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]" aria-label={label}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border-subtle bg-background-surface/70">
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort() && header.column.columnDef.header !== undefined;
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                        className="h-11 whitespace-nowrap px-4 text-left align-middle text-[12px] font-semibold text-foreground-tertiary"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3" aria-hidden />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3" aria-hidden />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-60" aria-hidden />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors duration-fast hover:bg-background-hover">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-14 px-4 align-middle text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCount === 0 && (
          <EmptyState size="inline" title="No matches" description="Try a different search." />
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[13px] text-foreground-secondary">
          <span>
            {pageIndex * pageSize + 1}–{Math.min(filteredCount, (pageIndex + 1) * pageSize)} of {filteredCount}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small helper for secondary text inside cells. */
export function CellMuted({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-[13px] text-foreground-secondary', className)}>{children}</span>;
}
