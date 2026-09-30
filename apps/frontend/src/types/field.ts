import type { InterviewTypeDef } from './review';

/** GET /field/projects — projects the caller can start interviews in. */
export interface FieldProject {
  id: string;
  name: string;
  description?: string | null;
  method?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  myInterviewCount: number;
  /** The interview types this project collects; the enumerator picks one per interview. */
  interviewTypes?: InterviewTypeDef[];
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
  /**
   * Who is conducting it. Only used for an older shared code; a personal
   * access code credits the interview to its enumerator on the server.
   */
  enumeratorName?: string;
  /** One of the project's interview types (KII, FGD, …). */
  type?: string;
  /** Answers to that type's own fields. */
  typeMetadata?: Record<string, string | number>;
}
