'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ExternalLink, Link2, MoreHorizontal, Plus, RefreshCw, Trash2, Lock, LockOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { CreateLinkDialog } from '@/components/links/create-link-dialog';
import { LinkReadyDialog, ShareButtons } from '@/components/links/share-link';
import { respondentUrl, useRespondentLinkAction, useRespondentLinkResponses, useRespondentLinks } from '@/hooks/use-respondent-links';
import { useSession } from '@/hooks/use-session';
import { languageLabel } from '@/lib/languages';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import type { LinkState, RespondentLink } from '@/types/respondent-link';

const STATE: Record<LinkState, { status: string; label: string }> = {
  open: { status: 'active', label: 'Open' },
  closed: { status: 'inactive', label: 'Closed' },
  expired: { status: 'archived', label: 'Expired' },
  full: { status: 'completed', label: 'Answered' },
};

function Responses({ link }: { link: RespondentLink }) {
  const { data, isLoading, isError } = useRespondentLinkResponses(link.id);
  if (isLoading) return <p className="px-5 py-3 text-[13px] text-foreground-tertiary">Loading responses…</p>;
  if (isError) return <p className="px-5 py-3 text-[13px] text-foreground-error">Responses could not be loaded.</p>;
  if (!data?.length) return <p className="px-5 py-3 text-[13px] text-foreground-tertiary">No one has responded yet.</p>;
  return (
    <ul className="divide-y divide-border-subtle">
      {data.map((r) => (
        <li key={r.interviewId}>
          <Link href={`/interviews/${r.interviewId}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-background-hover">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-foreground">{r.participant.displayName}</span>
              <span className="block truncate text-[12.5px] text-foreground-tertiary">
                {[r.participant.role, r.participant.organisation, r.startedAt && `started ${formatDateTime(r.startedAt)}`].filter(Boolean).join(' · ')}
              </span>
            </span>
            <StatusBadge
              status={r.finishedAt ? 'completed' : 'in_progress'}
              label={r.finishedAt ? 'Submitted' : r.recordings > 0 ? 'Uploading' : 'In progress'}
              size="sm"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LinkRow({ link, canEdit, canDelete }: { link: RespondentLink; canEdit: boolean; canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<'regenerate' | 'delete' | null>(null);
  const close = useRespondentLinkAction('close');
  const reopen = useRespondentLinkAction('reopen');
  const regenerate = useRespondentLinkAction('regenerate');
  const remove = useRespondentLinkAction('delete');
  const state = STATE[link.state];

  return (
    <li>
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-semibold text-foreground">{link.title}</span>
            <StatusBadge status={state.status} label={state.label} size="sm" />
          </p>
          <p className="mt-0.5 text-[13px] text-foreground-tertiary">
            {[
              link.project.name,
              link.respondentName ? `for ${link.respondentName}` : 'anyone with the link',
              `${link.questionSet._count.questions} questions`,
              languageLabel(link.language),
              link.expiresAt && `closes ${formatDate(link.expiresAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {link.state === 'open' && <ShareButtons link={link} />}
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {link.responses.completed} submitted
            {link.responses.started > link.responses.completed && ` · ${link.responses.started - link.responses.completed} in progress`}
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`More for ${link.title}`}>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a href={respondentUrl(link.token)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> Open as a respondent
                </a>
              </DropdownMenuItem>
              {canEdit &&
                (link.closedAt ? (
                  <DropdownMenuItem onSelect={() => reopen.mutate(link.id)}>
                    <LockOpen className="mr-2 h-4 w-4" aria-hidden /> Reopen
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => close.mutate(link.id)}>
                    <Lock className="mr-2 h-4 w-4" aria-hidden /> Close to new respondents
                  </DropdownMenuItem>
                ))}
              {canEdit && (
                <DropdownMenuItem onSelect={() => setConfirm('regenerate')}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Replace the link address
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-error" onSelect={() => setConfirm('delete')}>
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {open && (
        <div className="border-t border-border-subtle bg-background-surface/60">
          <Responses link={link} />
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'delete' ? 'Delete this link?' : 'Replace the link address?'}
        description={
          confirm === 'delete'
            ? 'The link stops working and moves to the Trash. Answers already given stay under Results.'
            : 'The current address stops working at once, for everyone you sent it to. Use this if the link was shared too widely. Answers already given are kept.'
        }
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Replace'}
        variant={confirm === 'delete' ? 'danger' : 'default'}
        loading={regenerate.isPending || remove.isPending}
        onConfirm={async () => {
          if (confirm === 'delete') await remove.mutateAsync(link.id);
          else await regenerate.mutateAsync(link.id);
          setConfirm(null);
        }}
      />
    </li>
  );
}

export default function RespondentLinksPage() {
  const session = useSession();
  const { data = [], isLoading, isError, error, refetch } = useRespondentLinks();
  const [creating, setCreating] = useState(false);
  const [ready, setReady] = useState<RespondentLink | null>(null);
  const canCreate = session.can('create.links');

  const newButton = canCreate && (
    <Button onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" aria-hidden /> New link
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Self-interview links"
        description="Key informants answer on their own: send a link, they agree to take part and record their answers to each question. No account needed. Answers arrive under Results and are transcribed like any interview."
        actions={newButton}
      />

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState message={(error as { message?: string })?.message ?? 'Links could not be loaded.'} onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Link2 />}
          title="No self-interview links yet"
          description="Upload your questions (CSV or Excel) or pick an approved guide, and you get a link to share by WhatsApp or email."
          action={newButton}
        />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
          {data.map((link) => (
            <LinkRow key={link.id} link={link} canEdit={session.can('edit.links')} canDelete={session.can('delete.links')} />
          ))}
        </ul>
      )}

      <CreateLinkDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(link) => {
          setCreating(false);
          setReady(link);
        }}
      />
      <LinkReadyDialog link={ready} onOpenChange={(o) => !o && setReady(null)} />
    </div>
  );
}
