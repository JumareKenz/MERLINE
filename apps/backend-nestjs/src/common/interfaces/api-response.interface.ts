export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    timestamp: string;
    version: string;
  };
}
