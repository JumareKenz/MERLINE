export type ConsentMethod = 'VERBAL' | 'WRITTEN' | 'DIGITAL';

export interface Consent {
  id: string;
  version: string;
  method: ConsentMethod;
  allowRecording: boolean;
  allowTranscription: boolean;
  allowAiAnalysis: boolean;
  allowQuotation: boolean;
  allowPublication: boolean;
  grantedAt: string;
  expiresAt?: string | null;
  withdrawnAt?: string | null;
  withdrawnById?: string | null;
  metadata: Record<string, unknown>;
  organizationId: string;
  participantId: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsentDto {
  participantId: string;
  version: string;
  method: ConsentMethod;
  allowRecording?: boolean;
  allowTranscription?: boolean;
  allowAiAnalysis?: boolean;
  allowQuotation?: boolean;
  allowPublication?: boolean;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type ConsentList = Consent[];

export const CONSENT_SCOPES: { key: keyof Consent; label: string; helpText: string }[] = [
  { key: 'allowRecording', label: 'Recording', helpText: 'Permit audio to be recorded during the interview.' },
  { key: 'allowTranscription', label: 'Transcription', helpText: 'Permit the recording to be transcribed to text.' },
  { key: 'allowAiAnalysis', label: 'AI analysis', helpText: 'Permit AI-assisted analysis of the transcript.' },
  { key: 'allowQuotation', label: 'Quotation', helpText: 'Permit exact words to be quoted in findings.' },
  { key: 'allowPublication', label: 'Publication', helpText: 'Permit findings citing this participant to be published.' },
];
