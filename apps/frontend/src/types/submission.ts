export type SubmissionStatus = 'draft' | 'completed' | 'synced' | 'flagged' | 'approved' | 'rejected';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Submission {
  id: string;
  study_id: string;
  assignment_id?: string;
  questionnaire_id: string;
  enumerator_id: string;
  status: SubmissionStatus;
  sync_status: SyncStatus;
  started_at: string;
  completed_at?: string;
  time_taken_seconds?: number;
  quality_score?: number;
  geo_location?: { lat: number; lng: number; accuracy?: number };
  device_info?: Record<string, unknown>;
  flagged_answers?: number;
  reviewed_by?: { id: string; name: string };
  reviewed_at?: string;
  notes?: string;
  enumerator?: { id: string; first_name: string; last_name: string };
  questionnaire?: { id: string; title: string };
  answer_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubmissionAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  value: unknown;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
  value_option_ids?: string[];
  media_id?: string;
  flagged?: boolean;
  flag_reason?: string;
  question?: { code: string; label: string; question_type: string };
}

export interface SubmissionDetail extends Submission {
  answers: SubmissionAnswer[];
}

export interface SubmissionFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  sync_status?: string;
  study_id?: string;
  assignment_id?: string;
  enumerator_id?: string;
  date_from?: string;
  date_to?: string;
  quality_score_min?: number;
  quality_score_max?: number;
  flagged?: boolean;
}
