import type { Localized, QuestionType } from './guide';

export type LinkState = 'open' | 'closed' | 'expired' | 'full';

/** A self-interview link, as research staff see it. */
export interface RespondentLink {
  id: string;
  token: string;
  title: string;
  intro?: string | null;
  consentText: string;
  interviewType: string;
  language: string;
  respondentName?: string | null;
  maxResponses?: number | null;
  expiresAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  project: { id: string; name: string };
  questionSet: {
    id: string;
    title: string;
    version: number;
    status: string;
    languages: string[];
    _count: { questions: number };
  };
  createdBy: { id: string; firstName: string; lastName: string };
  state: LinkState;
  responses: { started: number; completed: number };
}

export interface CreateRespondentLinkInput {
  projectId: string;
  questionSetId: string;
  title: string;
  intro?: string;
  consentText?: string;
  interviewType?: string;
  language?: string;
  respondentName?: string;
  maxResponses?: number;
  expiresAt?: string;
}

export type UpdateRespondentLinkInput = Partial<{
  title: string;
  intro: string | null;
  consentText: string;
  questionSetId: string;
  language: string;
  respondentName: string | null;
  maxResponses: number | null;
  expiresAt: string | null;
}>;

export interface RespondentLinkResponse {
  interviewId: string;
  status: string;
  startedAt?: string | null;
  endedAt?: string | null;
  finishedAt?: string | null;
  recordings: number;
  participant: { id: string; displayName: string; role?: string | null; organisation?: string | null };
}

/* ---------------- The respondent's side (public) ---------------- */

export interface PublicQuestion {
  id: string;
  order: number;
  section?: string | null;
  text: Localized;
  /** Always open: questions are answered out loud, never picked from a list. */
  type: QuestionType;
  required: boolean;
}

export interface PublicLink {
  title: string;
  intro?: string | null;
  consentText: string;
  organizationName: string;
  projectName: string;
  interviewType: string;
  language: string;
  /** Languages the questions are written in that can be chosen. */
  languages: string[];
  respondentName?: string | null;
  state: LinkState;
  guide: { id: string; title: string; languages: string[]; questions: PublicQuestion[] };
}

export interface RespondentSessionState {
  sessionId: string;
  finished: boolean;
  language?: string | null;
  completedUploads: string[];
  answers: { questionId: string; status: string; answer?: unknown; atMs?: number | null }[];
}
