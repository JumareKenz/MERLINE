export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
}

export interface SingleResponse<T> {
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
    version: string;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
  code?: string;
  request_id?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
}

export interface FilterParams extends PaginationParams {
  status?: string | string[];
  date_from?: string;
  date_to?: string;
}

export interface StudyFilterParams extends FilterParams {
  type?: string;
  project_id?: string;
}

export interface UserFilterParams extends PaginationParams {
  role?: string;
  status?: string;
}

export interface ActivityLogParams extends PaginationParams {
  action?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface DashboardFilterParams {
  date_range?: string;
  from?: string;
  to?: string;
  project_id?: string;
  study_id?: string;
  disaggregation?: string;
  dimension?: string;
}
