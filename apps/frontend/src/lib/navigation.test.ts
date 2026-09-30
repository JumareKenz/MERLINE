import { describe, expect, it } from 'vitest';
import { ACCOUNT_NAV, PRIMARY_NAV, SETUP_NAV, findArea, isActive, visibleNav } from './navigation';

const can = (...held: string[]) => (...slugs: string[]) => slugs.some((s) => held.includes(s));

describe('sidebar', () => {
  it('follows the workflow, in order', () => {
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Dashboard', 'Projects', 'Enumerators', 'Submissions', 'Transcripts', 'Reports']);
  });

  it('has no duplicate destinations and nothing labelled twice', () => {
    const all = [...PRIMARY_NAV, ...SETUP_NAV, ...ACCOUNT_NAV];
    expect(new Set(all.map((n) => n.href)).size).toBe(all.length);
    expect(new Set(all.map((n) => n.label)).size).toBe(all.length);
  });

  it('no longer lists the retired or folded-in pages', () => {
    const labels = [...PRIMARY_NAV, ...SETUP_NAV].map((n) => n.label);
    for (const gone of ['Assignments', 'Results', 'AI Dialogue', 'Findings']) expect(labels).not.toContain(gone);
  });

  it('keeps folded-in pages under the right area', () => {
    expect(findArea('/findings/abc')?.label).toBe('Reports');
    expect(findArea('/analysis/abc')?.label).toBe('Reports');
    expect(findArea('/assignments/new')?.label).toBe('Submissions');
    expect(findArea('/participants')?.label).toBe('Submissions');
    expect(findArea('/ai')?.label).toBe('Transcripts');
    expect(findArea('/enumerators/123')?.label).toBe('Enumerators');
    expect(isActive(PRIMARY_NAV[0], '/dashboard')).toBe(true);
    expect(isActive(PRIMARY_NAV[1], '/projectsX')).toBe(false);
  });

  it('shows each person only what their permissions allow', () => {
    const admin = visibleNav(PRIMARY_NAV, can('view.projects', 'view.enumerators', 'view.interviews', 'view.transcripts', 'view.reports'), true);
    expect(admin.map((n) => n.label)).toEqual(['Dashboard', 'Projects', 'Enumerators', 'Submissions', 'Transcripts', 'Reports']);

    const researcher = visibleNav(PRIMARY_NAV, can('view.projects', 'view.interviews'), true);
    expect(researcher.map((n) => n.label)).toEqual(['Dashboard', 'Projects', 'Submissions']);

    const viewer = visibleNav(PRIMARY_NAV, can('view.projects', 'view.reports'), true);
    expect(viewer.map((n) => n.label)).toEqual(['Dashboard', 'Projects', 'Reports']);

    expect(visibleNav(PRIMARY_NAV, can(), true)).toEqual([]);
  });

  it('shows everything until the session has loaded, rather than flashing items in', () => {
    expect(visibleNav(PRIMARY_NAV, can(), false)).toHaveLength(PRIMARY_NAV.length);
  });

  it('gives every item a description, used as its tooltip and page purpose', () => {
    for (const n of [...PRIMARY_NAV, ...SETUP_NAV, ...ACCOUNT_NAV]) expect(n.description.length).toBeGreaterThan(10);
  });
});
