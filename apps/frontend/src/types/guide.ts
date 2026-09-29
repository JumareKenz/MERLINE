/**
 * Merline is qualitative: every question is answered out loud, in the
 * respondent's own words. There are no choice, checkbox or rating questions.
 */
export type QuestionType = 'OPEN';
/**
 * What the API may still return for a guide written before that rule. Such
 * a question is kept as history but is always asked (and shown) as an open
 * question, and editing the guide turns it into one.
 */
export type StoredQuestionType = QuestionType | 'SINGLE' | 'MULTIPLE' | 'SCALE';
export type GuideStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';
/** Text by language code, e.g. { en: '…', ha: '…' }. */
export type Localized = Record<string, string>;

/** A question as the editor sends it: text, probes and whether it is required. */
export interface GuideQuestionInput {
  section?: string | null;
  text: Localized;
  probes: Localized;
  required: boolean;
}

/** A question as the API returns it. */
export interface GuideQuestion extends GuideQuestionInput {
  id?: string;
  order?: number;
  type: StoredQuestionType;
  /** Only on a guide written before choices were removed. */
  options?: Localized[];
  scaleMin?: number | null;
  scaleMax?: number | null;
}

/** True for a stored question that once had choices or a scale. */
export const wasClosedQuestion = (q: Pick<GuideQuestion, 'type'>): boolean => q.type !== 'OPEN';

export interface Guide {
  id: string;
  familyId: string;
  version: number;
  title: string;
  description?: string | null;
  interviewType: string;
  languages: string[];
  status: GuideStatus;
  /** Made for self-interview links: never shown to field teams. */
  linkOnly?: boolean;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: GuideQuestion[];
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string } | null;
  versions?: { id: string; version: number; status: GuideStatus; createdAt: string; approvedAt?: string | null }[];
  _count?: { questions?: number; interviews: number };
}

export type GuideList = Guide[];

export interface SaveGuideInput {
  title: string;
  description?: string;
  interviewType: string;
  languages: string[];
  projectId?: string | null;
  questions: GuideQuestionInput[];
}

export interface QuestionLogEntry {
  id: string;
  questionId: string;
  status: 'ASKED' | 'SKIPPED';
  atMs?: number | null;
  recordingRef?: string | null;
  mediaId?: string | null;
  note?: string | null;
  /** A self-interview respondent's answer to a closed question. */
  answer?: { selected?: number[]; labels?: string[]; value?: number } | null;
  markedAt: string;
}

export interface InterviewQuestionLog {
  guide: (Guide & { questions: GuideQuestion[] }) | null;
  entries: QuestionLogEntry[];
}

export interface ImportProblem {
  row: number;
  message: string;
}

/** The text in `lang`, falling back to English. */
export function localized(value: Localized | undefined | null, lang: string): string {
  if (!value) return '';
  return value[lang] || value.en || Object.values(value)[0] || '';
}
