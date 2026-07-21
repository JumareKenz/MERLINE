export type IndicatorDataType =
  | 'boolean'
  | 'percentage'
  | 'count'
  | 'ratio'
  | 'score'
  | 'currency'
  | 'duration';

export type IndicatorLevel = 'impact' | 'outcome' | 'output' | 'process' | 'input';

export type IndicatorDirection = 'positive' | 'negative' | 'neutral';

export type IndicatorFrequency =
  | 'monthly'
  | 'quarterly'
  | 'bi_annual'
  | 'annual'
  | 'ad_hoc';

export type IndicatorStatus = 'draft' | 'under_review' | 'approved' | 'superseded';

export type IndicatorRagStatus = 'on_track' | 'at_risk' | 'off_track' | 'no_data';

export interface Indicator {
  id: string;
  code: string;
  name: string;
  definition?: string;
  indicator_type: 'quantitative' | 'qualitative' | 'proxy' | 'composite';
  data_type: IndicatorDataType;
  level: IndicatorLevel;
  direction: IndicatorDirection;
  unit?: string;
  sector?: string;
  numerator?: string;
  denominator?: string;
  formula?: string;
  frequency: IndicatorFrequency;
  data_source?: string;
  collection_method?: string;
  baseline_value?: number;
  baseline_year?: number;
  target_value?: number;
  target_year?: number;
  threshold_min?: number;
  threshold_max?: number;
  is_kpi: boolean;
  status: IndicatorStatus;
  study_id?: string;
  project_id?: string;
  disaggregations?: Disaggregation[];
  current_value?: number;
  rag_status?: IndicatorRagStatus;
  created_by: { id: string; name: string };
  created_at: string;
  updated_at: string;
}

export interface Disaggregation {
  dimension: string;
  categories: string[];
}

export interface IndicatorValue {
  id: string;
  indicator_id: string;
  value: number;
  period: string;
  disaggregation?: Record<string, string>;
  recorded_by?: { id: string; name: string };
  notes?: string;
  created_at: string;
}

export interface IndicatorTarget {
  id: string;
  indicator_id: string;
  target_value: number;
  deadline: string;
  created_by?: { id: string; name: string };
  created_at: string;
}

export interface IndicatorTrend {
  periods: string[];
  values: number[];
  target?: number;
  trend_direction: 'improving' | 'declining' | 'stable' | 'fluctuating';
}

export interface CreateIndicatorDto {
  code: string;
  name: string;
  definition?: string;
  indicator_type: 'quantitative' | 'qualitative' | 'proxy' | 'composite';
  data_type: IndicatorDataType;
  level: IndicatorLevel;
  direction: IndicatorDirection;
  unit?: string;
  numerator?: string;
  denominator?: string;
  formula?: string;
  frequency: IndicatorFrequency;
  data_source?: string;
  collection_method?: string;
  baseline_value?: number;
  baseline_year?: number;
  target_value?: number;
  target_year?: number;
  threshold_min?: number;
  threshold_max?: number;
  is_kpi?: boolean;
  disaggregations?: Disaggregation[];
}

export interface UpdateIndicatorDto extends Partial<CreateIndicatorDto> {
  status?: IndicatorStatus;
}

export interface RecordIndicatorValueDto {
  value: number;
  period: string;
  disaggregation?: Record<string, string>;
  notes?: string;
}

export interface SetIndicatorTargetDto {
  target_value: number;
  deadline: string;
}

export interface IndicatorFilterParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  status?: string | string[];
  type?: string;
  data_type?: string;
  level?: string;
  is_kpi?: boolean;
  study_id?: string;
  project_id?: string;
}

export interface StudyIndicator {
  id: string;
  indicator: Indicator;
  baseline_value?: number;
  target_value?: number;
  current_value?: number;
  rag_status?: IndicatorRagStatus;
  linked_at: string;
}
