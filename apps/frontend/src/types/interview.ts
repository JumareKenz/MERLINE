export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Interview {
  id: string;
  status: InterviewStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  location?: string | null;
  notes?: string | null;
  /** Language spoken, if known: the transcription hint. */
  language?: string | null;
  /** KII, FGD, IDI, HOUSEHOLD, OBSERVATION, OTHER, or a project's own type key. */
  type?: string | null;
  /** The interview guide version it uses. */
  questionSetId?: string | null;
  /** Who conducted it, as typed on the field app (codes may be shared). */
  enumeratorName?: string | null;
  /** Set when the respondent answered on their own through a shared link. */
  respondentLinkId?: string | null;
  organizationId: string;
  projectId?: string | null;
  participantId: string;
  consentId: string;
  interviewerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  /** Summary relations the API returns with every interview read. */
  participant?: { id: string; displayName: string };
  interviewer?: { id: string; firstName: string; lastName: string };
  consent?: InterviewConsentScope;
  _count?: { recordings: number; transcripts: number };
  /** Newest transcript only: its machine status and where it is in human review. */
  transcripts?: { id: string; status: string; reviewStatus: import('./review').ReviewStatus }[];
}

export interface InterviewConsentScope {
  id: string;
  method?: string;
  allowRecording: boolean;
  allowTranscription?: boolean;
  allowAiAnalysis?: boolean;
  withdrawnAt?: string | null;
  expiresAt?: string | null;
}

export interface RecordingUploadStatus {
  uploadId: string;
  receivedParts: number[];
  completed: Recording | null;
}

export interface CompleteRecordingUploadDto {
  totalParts: number;
  mimeType: string;
  originalName: string;
  checksum?: string;
  durationMs?: number;
  recordedAt?: string;
}

export interface CreateInterviewDto {
  participantId: string;
  consentId: string;
  projectId?: string;
  interviewerId?: string;
  scheduledAt?: string;
  location?: string;
  notes?: string;
  language?: string;
}

export type InterviewList = Interview[];

export interface Recording {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  processingStatus: string;
  path: string;
  checksum?: string | null;
  interviewId?: string | null;
  organizationId: string;
  uploadedById: string;
  metadata?: { durationMs?: number; source?: string; recordedAt?: string } | null;
  createdAt: string;
}

export type RecordingList = Recording[];

export interface RecordingDownloadUrl {
  url: string;
  expiresIn: number;
}

/** GET /interviews/interviewers — names only, for assigning work. */
export interface AssignableInterviewer {
  id: string;
  firstName: string;
  lastName: string;
  isFieldInterviewer: boolean;
}
