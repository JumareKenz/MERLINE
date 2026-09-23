export type QuestionType = 'OPEN' | 'SINGLE' | 'MULTIPLE' | 'SCALE';
export type GuideStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';
/** Text by language code, e.g. { en: '…', ha: '…' }. */
export type Localized = Record<string, string>;

export interface GuideQuestion {
  id?: string;
  order?: number;
  section?: string | null;
  text: Localized;
  type: QuestionType;
  options: Localized[];
  scaleMin?: number | null;
  scaleMax?: number | null;
  probes: Localized;
  required: boolean;
}

export interface Guide {
  id: string;
  familyId: string;
  version: number;
  title: string;
  description?: string | null;
  interviewType: string;
  languages: string[];
  status: GuideStatus;
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
  questions: GuideQuestion[];
}

export interface QuestionLogEntry {
  id: string;
  questionId: string;
  status: 'ASKED' | 'SKIPPED';
  atMs?: number | null;
  recordingRef?: string | null;
  mediaId?: string | null;
  note?: string | null;
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

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'OPEN', label: 'Open-ended' },
  { value: 'SINGLE', label: 'Single choice' },
  { value: 'MULTIPLE', label: 'Multiple choice' },
  { value: 'SCALE', label: 'Scale' },
];

/** The text in `lang`, falling back to English. */
export function localized(value: Localized | undefined | null, lang: string): string {
  if (!value) return '';
  return value[lang] || value.en || Object.values(value)[0] || '';
}
