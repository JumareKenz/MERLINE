/** GET /field/projects — projects the caller can start interviews in. */
export interface FieldProject {
  id: string;
  name: string;
  description?: string | null;
  method?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  myInterviewCount: number;
  /** The approved guide new interviews in this project use (cached offline). */
  guide?: FieldGuide | null;
}

/** An approved interview guide as the field app receives it. */
export interface FieldGuide {
  id: string;
  version: number;
  title: string;
  languages: string[];
  questions: {
    id: string;
    order: number;
    section?: string | null;
    text: Record<string, string>;
    /** Always open: every question is asked out loud. (A guide cached on a phone before that rule may still carry options; they are ignored.) */
    type: 'OPEN';
    probes: Record<string, string>;
    required: boolean;
  }[];
}

export interface FieldConsentInput {
  version: string;
  method: 'VERBAL' | 'WRITTEN' | 'DIGITAL';
  allowRecording: boolean;
  allowTranscription: boolean;
  allowAiAnalysis: boolean;
  allowQuotation: boolean;
  allowPublication: boolean;
  /** When the participant consented, on the device. */
  capturedAt: string;
}

/** POST /field/interviews — participant + consent + interview in one call. */
export interface CreateFieldInterviewInput {
  interviewId: string;
  participantId: string;
  consentId: string;
  projectId: string;
  participant: { displayName: string; externalRef?: string };
  consent: FieldConsentInput;
  location?: string;
  language?: string;
  questionSetId?: string;
  /** Who is conducting it: several enumerators may share one access code. */
  enumeratorName?: string;
}

/**
 * GET /field-team rows: one per access code. A code is a field account
 * named for a team, place or person, opening one or more projects; any
 * number of enumerators can sign in with it.
 */
export interface FieldWorker {
  id: string;
  /** The code's name, e.g. "Kano team A". */
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  accessCodeIssuedAt: string | null;
  projects: { id: string; name: string; status: string }[];
  interviews: { total: number; inProgress: number; completed: number };
  /** Names typed on interviews made with this code, most active first. */
  enumerators: { name: string; interviews: number }[];
}

export interface CreateAccessCodeInput {
  name: string;
  projectIds: string[];
}
