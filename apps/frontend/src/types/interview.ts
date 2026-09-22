export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Interview {
  id: string;
  status: InterviewStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  location?: string | null;
  notes?: string | null;
  organizationId: string;
  projectId?: string | null;
  participantId: string;
  consentId: string;
  interviewerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateInterviewDto {
  participantId: string;
  consentId: string;
  projectId?: string;
  interviewerId?: string;
  scheduledAt?: string;
  location?: string;
  notes?: string;
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
  createdAt: string;
}

export type RecordingList = Recording[];

export interface RecordingDownloadUrl {
  url: string;
  expiresIn: number;
}
