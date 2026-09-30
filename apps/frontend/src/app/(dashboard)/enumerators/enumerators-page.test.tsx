import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Enumerator } from '@/types/enumerator';

const state = {
  list: { data: undefined as Enumerator[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
  all: { data: undefined as Enumerator[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
  search: '',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/enumerators',
  useSearchParams: () => new URLSearchParams(state.search),
}));
vi.mock('@/hooks/use-enumerators', () => ({
  // The page asks twice: filtered (has sortBy) and unfiltered ({}).
  useEnumerators: (filters: { sortBy?: string }) => (filters.sortBy ? state.list : state.all),
  useCreateEnumerator: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/use-research-projects', () => ({ useResearchProjects: () => ({ data: { items: [{ id: 'p1', name: 'Water', status: 'active' }] }, isLoading: false }) }));
vi.mock('@/hooks/use-session', () => ({ useSession: () => ({ isResolved: true, can: (s: string) => s === 'create.enumerators' }) }));

import EnumeratorsPage from './page';

const person = (over: Partial<Enumerator> = {}): Enumerator => ({
  id: 'e1',
  fullName: 'Amina Yusuf',
  email: null,
  phone: '+2348030000000',
  state: 'Kano',
  uniqueId: 'ENU-7K2M4Q',
  notes: null,
  isActive: true,
  createdAt: '2026-09-01T00:00:00Z',
  lastLoginAt: null,
  accessCode: { state: 'UNUSED', issuedAt: '2026-09-01T00:00:00Z', expiresAt: null, lastUsedAt: null, revokedAt: null, legacyShared: false },
  projects: [{ id: 'p1', name: 'Water', status: 'active' }],
  lastSubmissionAt: null,
  lastActivityAt: null,
  stats: { interviews: 2, recordings: 1, transcriptsAwaitingReview: 1, transcriptsApproved: 0 },
  ...over,
});
const render = () => renderToStaticMarkup(<EnumeratorsPage />);

beforeEach(() => {
  state.search = '';
  state.list = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  state.all = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
});

describe('Enumerators page states', () => {
  it('says what it is for and offers the next step when nobody exists yet', () => {
    state.all.data = [];
    state.list.data = [];
    const html = render();
    expect(html).toContain('No enumerators yet');
    expect(html).toContain('personal access code');
    expect(html).toContain('Add the first enumerator');
  });

  it('shows a loading state while the list loads', () => {
    state.all.data = [person()];
    state.list.isLoading = true;
    const html = render();
    expect(html).toContain('Loading enumerators');
    expect(html).not.toContain('No enumerators match');
  });

  it('shows an error with a way to retry', () => {
    state.all.data = [person()];
    state.list.isError = true;
    const html = render();
    expect(html).toContain('The enumerators could not be loaded');
    expect(html).toContain('Try again');
  });

  it('tells "no matches" apart from "no enumerators", and offers to clear the filters', () => {
    state.search = 'q=zzz';
    state.all.data = [person()];
    state.list.data = [];
    const html = render();
    expect(html).toContain('No enumerators match');
    expect(html).toContain('Clear filters');
    expect(html).not.toContain('No enumerators yet');
  });

  it('lists people as a table on wide screens and as cards on small ones', () => {
    state.all.data = [person(), person({ id: 'e2', fullName: 'Binta Sani', isActive: false, accessCode: { ...person().accessCode, state: 'REVOKED' } })];
    state.list.data = state.all.data;
    const html = render();
    // Both layouts are present; CSS decides which is visible.
    expect(html).toContain('hidden overflow-x-auto');
    expect(html).toContain('lg:block');
    expect(html).toContain('space-y-3 lg:hidden');
    expect(html.match(/>Amina Yusuf</g)?.length).toBe(2); // table row + card
    expect(html).toContain('ENU-7K2M4Q');
    expect(html).toContain('Not used yet');
    expect(html).toContain('Revoked');
    expect(html).toContain('Inactive');
    expect(html).toContain('2 enumerators');
  });

  it('marks an older shared code so it gets replaced', () => {
    state.all.data = [person({ accessCode: { ...person().accessCode, state: 'ACTIVE', legacyShared: true } })];
    state.list.data = state.all.data;
    expect(render()).toContain('Shared code');
  });

  it('never renders anything that looks like a secret', () => {
    state.all.data = [person()];
    state.list.data = state.all.data;
    expect(render()).not.toMatch(/codeHash|fieldAccessCode|[A-Z2-9]{5}-[A-Z2-9]{5}/);
  });

  it('hides "Add enumerator" from people who may not create them', async () => {
    vi.doMock('@/hooks/use-session', () => ({ useSession: () => ({ isResolved: true, can: () => false }) }));
    vi.resetModules();
    const { default: Page } = await import('./page');
    state.all.data = [person()];
    state.list.data = state.all.data;
    expect(renderToStaticMarkup(<Page />)).not.toContain('Add enumerator');
  });
});
