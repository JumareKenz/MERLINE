/** GET /field/projects — projects the caller can start interviews in. */
export interface FieldProject {
  id: string;
  name: string;
  description?: string | null;
  method?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  myInterviewCount: number;
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
}

/** GET /field-team rows. */
export interface FieldWorker {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  accessCodeIssuedAt: string | null;
  projects: { id: string; name: string; status: string }[];
  interviews: { total: number; inProgress: number; completed: number };
}

export interface CreateFieldWorkerInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  projectIds: string[];
}
