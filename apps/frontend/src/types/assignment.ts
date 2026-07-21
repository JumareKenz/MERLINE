export type AssignmentStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'approved' | 'rejected' | 'archived';

export interface Assignment {
  id: string;
  study_id: string;
  questionnaire_id: string;
  enumerator_id: string;
  supervisor_id?: string;
  status: AssignmentStatus;
  target_count: number;
  completed_count: number;
  due_date?: string;
  notes?: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  approved_at?: string;
  approved_by?: { id: string; name: string };
  rejection_reason?: string;
  questionnaire?: { id: string; title: string };
  enumerator?: { id: string; firstName: string; lastName: string };
  study?: { id: string; title: string };
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentDto {
  study_id: string;
  questionnaire_id: string;
  enumerator_id: string;
  target_count?: number;
  due_date?: string;
  notes?: string;
}

export interface BatchAssignDto {
  study_id: string;
  questionnaire_ids: string[];
  enumerator_ids: string[];
  target_count?: number;
  due_date?: string;
}

export interface AssignmentFilterParams {
  page?: number;
  per_page?: number;
  status?: string;
  study_id?: string;
  enumerator_id?: string;
  date_from?: string;
  date_to?: string;
}
