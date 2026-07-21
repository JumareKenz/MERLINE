export type StudyStatus =
  | 'draft'
  | 'planned'
  | 'in_design'
  | 'design_review'
  | 'approved'
  | 'pre_test'
  | 'data_collection'
  | 'data_cleaning'
  | 'analysis'
  | 'reporting'
  | 'completed'
  | 'archived';

export type StudyType =
  | 'baseline'
  | 'midline'
  | 'endline'
  | 'kis'
  | 'formative'
  | 'rapid_assessment'
  | 'evaluation'
  | 'needs_assessment'
  | 'feasibility'
  | 'pilot'
  | 'longitudinal'
  | 'cross_sectional'
  | 'case_study'
  | 'quasi_experimental'
  | 'randomized_control'
  | 'participatory_action_research'
  | 'performance_monitoring'
  | 'outcome_harvesting'
  | 'most_significant_change'
  | 'contribution_analysis'
  | 'cost_effectiveness'
  | 'synthesis'
  | 'other';

export type StudyMethodology = 'quantitative' | 'qualitative' | 'mixed_method' | 'desk_review';

export interface Study {
  id: string;
  code?: string;
  title: string;
  purpose?: string;
  study_type?: StudyType;
  methodology?: StudyMethodology;
  type?: StudyType;
  status: StudyStatus;
  population?: string;
  sample_size?: number;
  location?: string;
  start_date?: string;
  end_date?: string;
  project_id?: string;
  project?: { id: string; name: string };
  objectives?: string[];
  research_questions?: string[];
  ethical_approval_status?: 'approved' | 'pending' | 'not_required' | 'exempt';
  ethical_approval_ref?: string;
  donor_framework?: string;
  created_by?: { id: string; name: string };
  allowed_transitions?: StudyStatus[];
  indicator_count?: number;
  questionnaire_count?: number;
  submission_count?: number;
  completion_percentage?: number;
  created_at?: string;
  updated_at?: string;
  _count?: {
    questionnaires?: number;
    submissions?: number;
    indicators?: number;
    assignments?: number;
  };
  questionnaires?: Array<{
    id: string;
    title: string;
    status: string;
    version?: number;
    sections_count?: number;
  }>;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  studyDesign?: unknown;
  targetDetails?: unknown;
  isLocked?: boolean;
}

export interface StudyLifecycleEvent {
  id: string;
  study_id: string;
  from_status?: StudyStatus;
  to_status: StudyStatus;
  reason?: string;
  transitioned_by: { id: string; name: string };
  created_at: string;
}

export interface StudyTimelineEvent {
  id: string;
  description: string;
  causer_type?: string;
  causer_id?: string;
  created_at: string;
}

export interface CreateStudyDto {
  title: string;
  study_type: StudyType;
  methodology: StudyMethodology;
  purpose?: string;
  population?: string;
  sample_size?: number;
  location?: string;
  start_date: string;
  end_date: string;
  objectives?: string[];
  research_questions?: string[];
  ethical_approval_status?: 'approved' | 'pending' | 'not_required' | 'exempt';
  ethical_approval_ref?: string;
  donor_framework?: string;
}

export interface UpdateStudyDto extends Partial<CreateStudyDto> {
  status?: StudyStatus;
}

export interface StudyTransitionDto {
  status: StudyStatus;
  reason?: string;
}

export interface StudyCloneDto {
  title: string;
  code?: string;
  include_indicators?: boolean;
  include_questionnaires?: boolean;
  include_assignments?: boolean;
}

export interface StudyFilterParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  status?: string | string[];
  type?: string;
  project_id?: string;
  date_from?: string;
  date_to?: string;
}
