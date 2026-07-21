export type QuestionnaireType =
  | 'survey'
  | 'assessment'
  | 'evaluation'
  | 'monitoring'
  | 'baseline'
  | 'endline'
  | 'kpi_collection'
  | 'beneficiary_feedback'
  | 'needs_assessment'
  | 'other';

export type QuestionnaireStatus = 'draft' | 'under_review' | 'approved' | 'published' | 'archived';

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'select_one'
  | 'select_multiple'
  | 'boolean'
  | 'rating'
  | 'matrix'
  | 'barcode'
  | 'signature'
  | 'photo'
  | 'audio'
  | 'file'
  | 'geolocation'
  | 'cadence'
  | 'calculated'
  | 'note';

export interface Questionnaire {
  id: string;
  code?: string;
  title: string;
  description?: string;
  questionnaire_type: QuestionnaireType;
  status: QuestionnaireStatus;
  primary_language: string;
  language?: string;
  default_language?: string;
  supported_languages: string[];
  version: number;
  estimated_duration_minutes?: number;
  target_subject_count?: number;
  question_count: number;
  section_count: number;
  study_id?: string;
  study?: { id: string; title: string };
  project_id?: string;
  created_by: { id: string; name: string };
  published_at?: string;
  created_at: string;
  updated_at: string;
  sections?: Section[];
  questions?: Question[];
}

export interface Section {
  id: string;
  questionnaire_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_repeatable: boolean;
  questions: Question[];
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  section_id: string;
  code: string;
  question_type: QuestionType;
  label: string;
  help_text?: string;
  placeholder?: string;
  required: boolean;
  order_index: number;
  options: QuestionOption[];
  validation_rules: ValidationRule[];
  skip_logic: SkipLogic[];
  translations?: Record<string, Record<string, string>>;
  indicator_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  value: string;
  score?: number;
  order_index: number;
  image_url?: string;
  is_other: boolean;
  translations?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface SkipLogic {
  id: string;
  question_id: string;
  condition_type: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  condition_value: unknown;
  target_question_id: string;
  action: 'show' | 'hide' | 'skip_to';
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ValidationRule {
  id: string;
  question_id: string;
  rule_type: 'required' | 'min' | 'max' | 'min_length' | 'max_length' | 'pattern' | 'min_selections' | 'max_selections' | 'custom';
  rule_value: unknown;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: string;
  questionnaire_id: string;
  language: string;
  is_fallback: boolean;
  translations: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionnaireDto {
  title: string;
  description?: string;
  questionnaire_type: QuestionnaireType;
  primary_language: string;
  supported_languages?: string[];
  estimated_duration_minutes?: number;
  study_id?: string;
}

export interface UpdateQuestionnaireDto extends Partial<CreateQuestionnaireDto> {
  status?: QuestionnaireStatus;
}

export interface CreateSectionDto {
  title: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateSectionDto extends Partial<CreateSectionDto> {
  sortOrder?: number;
}

export interface CreateQuestionDto {
  text: string;
  description?: string;
  type: string;
  sortOrder?: number;
  isRequired?: boolean;
}

export interface UpdateQuestionDto extends Partial<CreateQuestionDto> {
  sortOrder?: number;
}

export interface CreateOptionDto {
  text: string;
  value: string;
  sortOrder?: number;
}

export interface UpdateOptionDto extends Partial<CreateOptionDto> {
  sortOrder?: number;
}

export interface QuestionnaireFilterParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  status?: string | string[];
  type?: string;
  study_id?: string;
  project_id?: string;
}
