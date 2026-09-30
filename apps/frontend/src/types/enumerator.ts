export type AccessCodeState = 'NONE' | 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface EnumeratorProject {
  id: string;
  name: string;
  status: string;
  /** GET /enumerators/:id only. */
  interviews?: number;
}

export interface EnumeratorAccessCode {
  state: AccessCodeState;
  issuedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  /** An older 4-character code several people may share; issue a personal one to replace it. */
  legacyShared: boolean;
}

/** GET /enumerators rows. The access code itself is never included. */
export interface Enumerator {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  state: string | null;
  uniqueId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  accessCode: EnumeratorAccessCode;
  projects: EnumeratorProject[];
  lastSubmissionAt: string | null;
  lastActivityAt: string | null;
  stats: {
    interviews: number;
    recordings: number;
    transcriptsAwaitingReview: number;
    transcriptsApproved: number;
  };
}

export interface EnumeratorDetail extends Omit<Enumerator, 'stats' | 'lastSubmissionAt'> {
  completedProjects: EnumeratorProject[];
  summary: {
    interviews: number;
    pendingSubmissions: number;
    recordingsSubmitted: number;
    transcriptsAwaitingEnumerator: number;
    transcriptsAwaitingAdmin: number;
    transcriptsApproved: number;
    reports: number;
  };
  recentActivity: { kind: 'interview' | 'account'; at: string; label: string; detail: string | null }[];
}

export interface EnumeratorSubmission {
  id: string;
  type: string | null;
  status: string;
  createdAt: string;
  participant: { displayName: string };
  project: { id: string; name: string } | null;
  recordings: { id: string; originalName: string; size: number; createdAt: string }[];
  transcripts: { id: string; status: string; reviewStatus: string; updatedAt: string }[];
}

export interface EnumeratorFilters {
  search?: string;
  status?: 'active' | 'inactive';
  state?: string;
  projectId?: string;
  codeStatus?: AccessCodeState;
  sortBy?: 'name' | 'createdAt' | 'lastActivity' | 'state';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateEnumeratorInput {
  fullName: string;
  email?: string;
  phone: string;
  state: string;
  projectIds?: string[];
  codeValidDays?: number;
}

export interface UpdateEnumeratorInput {
  fullName?: string;
  email?: string;
  phone?: string;
  state?: string;
  notes?: string;
}

/** Returned once, by create and regenerate. Not retrievable afterwards. */
export interface IssuedAccessCode {
  code: string;
  issuedAt?: string;
  expiresAt: string | null;
}

export interface CreatedEnumerator {
  id: string;
  uniqueId: string;
  accessCode: { code: string; expiresAt: string | null };
}

export const ACCESS_CODE_LABELS: Record<AccessCodeState, string> = {
  NONE: 'No code',
  UNUSED: 'Not used yet',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};
