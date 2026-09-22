/**
 * PHASE 2 — the real shape of every backend response, per
 * TransformInterceptor (apps/backend-nestjs/src/common/interceptors/
 * transform.interceptor.ts). Existing PaginatedResponse/SingleResponse below
 * assume `response.data` IS the payload directly, which does not match this
 * backend - it always wraps the payload one level deeper, under `data`, and
 * legacy list endpoints nest again under `data.items`. New (Phase 2) code
 * should use Envelope<T> and unwrap explicitly rather than relying on the
 * older types.
 */
export interface Envelope<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
  meta: { timestamp: string; version: string };
}

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
