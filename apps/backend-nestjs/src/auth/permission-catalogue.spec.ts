import { ROLE_DEFINITIONS, permissionsForRole } from './permission-catalogue';

/**
 * Recordings and transcripts are sensitive research data and are
 * administrator-only (decision 2026-09-23). Granting any of these to
 * another system role is a policy change, not a refactor.
 */
const ADMIN_ONLY = [
  'view.recordings',
  'view.transcripts',
  'create.transcripts',
  'edit.transcripts',
];

describe('role definitions', () => {
  it('grants recording playback and transcripts to administrators only', () => {
    for (const role of ROLE_DEFINITIONS) {
      const granted = permissionsForRole(role).filter((p) =>
        ADMIN_ONLY.includes(p),
      );
      if (role.slug === 'administrator') {
        expect(granted.sort()).toEqual([...ADMIN_ONLY].sort());
      } else {
        expect({ role: role.slug, granted }).toEqual({
          role: role.slug,
          granted: [],
        });
      }
    }
  });

  it('still lets the roles that conduct interviews upload recordings', () => {
    const uploaders = ROLE_DEFINITIONS.filter((r) =>
      permissionsForRole(r).includes('upload.recordings'),
    ).map((r) => r.slug);
    expect(uploaders).toEqual(
      expect.arrayContaining([
        'field-interviewer',
        'researcher',
        'research-lead',
      ]),
    );
  });
});

describe('deletion', () => {
  it('is administrator-only for research records', () => {
    const deletes = [
      'delete.projects',
      'delete.interviews',
      'delete.recordings',
      'delete.participants',
      'delete.findings',
      'delete.reports',
      'delete.users',
    ];
    for (const role of ROLE_DEFINITIONS) {
      const granted = permissionsForRole(role).filter((p) => deletes.includes(p));
      if (role.slug === 'administrator') {
        expect(granted.sort()).toEqual([...deletes].sort());
      } else {
        expect({ role: role.slug, granted }).toEqual({ role: role.slug, granted: [] });
      }
    }
  });
});
