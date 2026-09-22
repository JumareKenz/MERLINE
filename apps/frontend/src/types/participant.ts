export interface Participant {
  id: string;
  displayName: string;
  externalRef?: string | null;
  metadata: Record<string, unknown>;
  organizationId: string;
  projectId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateParticipantDto {
  displayName: string;
  externalRef?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateParticipantDto = Partial<CreateParticipantDto>;

export type ParticipantList = Participant[];

export interface DeleteResult {
  deleted: boolean;
}
