import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';
import { mockAdapter } from './api-mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    const cfg: Record<string, unknown> = {
      baseURL: BASE_URL,
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (USE_MOCK) {
      cfg.adapter = mockAdapter;
      cfg.timeout = 0;
    }
    this.instance = axios.create(cfg);

    this.instance.interceptors.request.use(this.handleRequest);
    this.instance.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  private handleRequest = async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const { useAuthStore } = await import('@/stores/auth-store');
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  };

  private handleError = async (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const { useAuthStore } = await import('@/stores/auth-store');
      const { default: { toast } } = await import('sonner');
      useAuthStore.getState().logout();
      toast.error('Session expired. Please login again.');
    }
    return Promise.reject(this.normalizeError(error));
  };

  private normalizeError(error: AxiosError<ApiError>): ApiError {
    if (error.response?.data) {
      return {
        message: error.response.data.message || 'An unexpected error occurred',
        errors: error.response.data.errors,
        status: error.response.status,
        code: error.code,
        request_id: error.response.data.request_id,
      };
    }
    if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        status: 0,
        code: 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }

  get client(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient().client;

export const API = {
  auth: {
    login: (data: { email: string; password: string; device_name?: string }) =>
      apiClient.post<{ data: { user: import('@/types/auth').AuthUser; token: string; expires_at: string } }>('/auth/login', data),
    register: (data: import('@/types/auth').RegisterDto) =>
      apiClient.post<{ data: import('@/types/auth').RegisterResponse }>('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    refresh: () => apiClient.post<{ data: { token: string } }>('/auth/refresh'),
    me: () => apiClient.get<{ data: import('@/types/auth').AuthUser }>('/auth/me'),
    updateProfile: (data: import('@/types/auth').UpdateProfileDto) =>
      apiClient.put<{ data: import('@/types/auth').AuthUser }>('/auth/me', data),
    forgotPassword: (data: { email: string }) =>
      apiClient.post<{ data: { message: string } }>('/auth/forgot-password', data),
    resetPassword: (data: import('@/types/auth').ResetPasswordDto) =>
      apiClient.post<{ data: { message: string } }>('/auth/reset-password', data),
    sessions: () => apiClient.get<{ data: import('@/types/auth').AuthSession[] }>('/auth/sessions'),
    deleteSession: (id: string) => apiClient.delete(`/auth/sessions/${id}`),
  },
  organizations: {
    get: () => apiClient.get<{ data: import('@/types/organization').Organization }>('/organizations'),
    update: (id: string, data: import('@/types/organization').UpdateOrganizationDto) =>
      apiClient.put<{ data: import('@/types/organization').Organization }>(`/organizations/${id}`, data),
    members: {
      list: (orgId: string, params?: import('@/types/api').UserFilterParams) =>
        apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/user').Member>>(`/organizations/${orgId}/members`, { params }),
      create: (orgId: string, data: import('@/types/user').CreateUserDto) =>
        apiClient.post<{ data: import('@/types/user').User }>(`/organizations/${orgId}/members`, data),
      updateRole: (orgId: string, userId: string, data: { role_id: string }) =>
        apiClient.put(`/organizations/${orgId}/members/${userId}/role`, data),
      remove: (orgId: string, userId: string) =>
        apiClient.delete(`/organizations/${orgId}/members/${userId}`),
    },
  },
  teams: {
    list: (orgId: string) => apiClient.get<{ data: import('@/types/user').Member[] }>(`/organizations/${orgId}/teams`),
    create: (orgId: string, data: { name: string; description?: string }) =>
      apiClient.post(`/organizations/${orgId}/teams`, data),
    get: (id: string) => apiClient.get<{ data: unknown }>(`/teams/${id}`),
    update: (id: string, data: unknown) => apiClient.put(`/teams/${id}`, data),
    delete: (id: string) => apiClient.delete(`/teams/${id}`),
    addMember: (teamId: string, userId: string) =>
      apiClient.post(`/teams/${teamId}/members`, { user_id: userId }),
    removeMember: (teamId: string, userId: string) =>
      apiClient.delete(`/teams/${teamId}/members/${userId}`),
  },
  roles: {
    list: () => apiClient.get<{ data: import('@/types/role').Role[] }>('/roles'),
    get: (id: string) => apiClient.get<{ data: import('@/types/role').Role }>(`/roles/${id}`),
    create: (data: import('@/types/role').CreateRoleDto) =>
      apiClient.post<{ data: import('@/types/role').Role }>('/roles', data),
    update: (id: string, data: import('@/types/role').UpdateRoleDto) =>
      apiClient.put<{ data: import('@/types/role').Role }>(`/roles/${id}`, data),
    delete: (id: string) => apiClient.delete(`/roles/${id}`),
    permissions: () => apiClient.get<{ data: import('@/types/role').PermissionGroup[] }>('/roles/permissions'),
  },
  workspaces: {
    list: () => apiClient.get<{ data: import('@/types/workspace').Workspace[] }>('/workspaces'),
    get: (id: string) => apiClient.get<{ data: import('@/types/workspace').Workspace }>(`/workspaces/${id}`),
    create: (data: import('@/types/workspace').CreateWorkspaceDto) =>
      apiClient.post<{ data: import('@/types/workspace').Workspace }>('/workspaces', data),
    update: (id: string, data: import('@/types/workspace').UpdateWorkspaceDto) =>
      apiClient.put<{ data: import('@/types/workspace').Workspace }>(`/workspaces/${id}`, data),
    delete: (id: string) => apiClient.delete(`/workspaces/${id}`),
    setDefault: (id: string) => apiClient.post(`/workspaces/${id}/set-default`),
  },
  projects: {
    list: (params?: import('@/types/api').FilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/project').Project>>('/projects', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/project').Project }>(`/projects/${id}`),
    create: (data: import('@/types/project').CreateProjectDto) =>
      apiClient.post<{ data: import('@/types/project').Project }>('/projects', data),
    update: (id: string, data: import('@/types/project').UpdateProjectDto) =>
      apiClient.put<{ data: import('@/types/project').Project }>(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
    archive: (id: string) => apiClient.post(`/projects/${id}/archive`),
    restore: (id: string) => apiClient.post(`/projects/${id}/restore`),
    clone: (id: string, data: import('@/types/project').CloneProjectDto) =>
      apiClient.post<{ data: import('@/types/project').Project }>(`/projects/${id}/clone`, data),
    timeline: (id: string) =>
      apiClient.get<{ data: import('@/types/project').ProjectActivity[] }>(`/projects/${id}/timeline`),
    stats: (id: string) =>
      apiClient.get<{ data: import('@/types/project').ProjectStats }>(`/projects/${id}/stats`),
    team: {
      list: (projectId: string) =>
        apiClient.get<{ data: import('@/types/project').ProjectTeam[] }>(`/projects/${projectId}/team`),
      add: (projectId: string, data: { user_id: string; role: string }) =>
        apiClient.post<{ data: import('@/types/project').ProjectTeam }>(`/projects/${projectId}/team`, data),
      update: (projectId: string, memberId: string, data: { role: string }) =>
        apiClient.put(`/projects/${projectId}/team/${memberId}`, data),
      remove: (projectId: string, memberId: string) =>
        apiClient.delete(`/projects/${projectId}/team/${memberId}`),
    },
    studies: {
      list: (projectId: string, params?: import('@/types/api').StudyFilterParams) =>
        apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/study').Study>>(`/projects/${projectId}/studies`, { params }),
    },
  },
  studies: {
    list: (params?: import('@/types/api').StudyFilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/study').Study>>('/studies', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/study').Study }>(`/studies/${id}`),
    create: (projectId: string, data: import('@/types/study').CreateStudyDto) =>
      apiClient.post<{ data: import('@/types/study').Study }>('/studies', { ...data, projectId }),
    update: (id: string, data: import('@/types/study').UpdateStudyDto) =>
      apiClient.put<{ data: import('@/types/study').Study }>(`/studies/${id}`, data),
    delete: (id: string) => apiClient.delete(`/studies/${id}`),
    archive: (id: string) => apiClient.post(`/studies/${id}/archive`),
    restore: (id: string) => apiClient.post(`/studies/${id}/restore`),
    clone: (id: string, data: import('@/types/study').StudyCloneDto) =>
      apiClient.post<{ data: import('@/types/study').Study }>(`/studies/${id}/clone`, data),
    transition: (id: string, data: import('@/types/study').StudyTransitionDto) =>
      apiClient.post<{ data: import('@/types/study').Study }>(`/studies/${id}/transition`, data),
    lifecycle: (id: string) =>
      apiClient.get<{ data: import('@/types/study').StudyLifecycleEvent[] }>(`/studies/${id}/lifecycle`),
    timeline: (id: string) =>
      apiClient.get<{ data: import('@/types/study').StudyTimelineEvent[] }>(`/studies/${id}/timeline`),
  },
  indicators: {
    library: (params?: import('@/types/indicator').IndicatorFilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/indicator').Indicator>>('/indicators', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/indicator').Indicator }>(`/indicators/${id}`),
    create: (data: import('@/types/indicator').CreateIndicatorDto) =>
      apiClient.post<{ data: import('@/types/indicator').Indicator }>('/indicators', data),
    update: (id: string, data: import('@/types/indicator').UpdateIndicatorDto) =>
      apiClient.put<{ data: import('@/types/indicator').Indicator }>(`/indicators/${id}`, data),
    delete: (id: string) => apiClient.delete(`/indicators/${id}`),
    approve: (id: string) => apiClient.post(`/indicators/${id}/approve`),
    supersede: (id: string, newIndicatorId: string) =>
      apiClient.post(`/indicators/${id}/supersede`, { new_indicator_id: newIndicatorId }),
    values: {
      list: (indicatorId: string, params?: { date_from?: string; date_to?: string }) =>
        apiClient.get<{ data: import('@/types/indicator').IndicatorValue[] }>(`/indicators/${indicatorId}/values`, { params }),
      create: (indicatorId: string, data: import('@/types/indicator').RecordIndicatorValueDto) =>
        apiClient.post<{ data: import('@/types/indicator').IndicatorValue }>(`/indicators/${indicatorId}/values`, data),
    },
    targets: {
      list: (indicatorId: string) =>
        apiClient.get<{ data: import('@/types/indicator').IndicatorTarget[] }>(`/indicators/${indicatorId}/targets`),
      set: (indicatorId: string, data: import('@/types/indicator').SetIndicatorTargetDto) =>
        apiClient.post<{ data: import('@/types/indicator').IndicatorTarget }>(`/indicators/${indicatorId}/targets`, data),
    },
    trend: (indicatorId: string) =>
      apiClient.get<{ data: import('@/types/indicator').IndicatorTrend }>(`/indicators/${indicatorId}/trend`),
    study: {
      list: (studyId: string) =>
        apiClient.get<{ data: import('@/types/indicator').StudyIndicator[] }>(`/studies/${studyId}/indicators`),
      link: (studyId: string, indicatorId: string) =>
        apiClient.post(`/studies/${studyId}/indicators/link`, { indicatorId }),
      unlink: (studyId: string, indicatorId: string) =>
        apiClient.delete(`/studies/${studyId}/indicators/${indicatorId}`),
    },
  },
  questionnaires: {
    list: (params?: import('@/types/questionnaire').QuestionnaireFilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/questionnaire').Questionnaire>>('/questionnaires', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/questionnaire').Questionnaire }>(`/questionnaires/${id}`),
    create: (data: import('@/types/questionnaire').CreateQuestionnaireDto) =>
      apiClient.post<{ data: import('@/types/questionnaire').Questionnaire }>('/questionnaires', data),
    update: (id: string, data: import('@/types/questionnaire').UpdateQuestionnaireDto) =>
      apiClient.put<{ data: import('@/types/questionnaire').Questionnaire }>(`/questionnaires/${id}`, data),
    delete: (id: string) => apiClient.delete(`/questionnaires/${id}`),
    clone: (id: string, data: { title: string }) =>
      apiClient.post<{ data: import('@/types/questionnaire').Questionnaire }>(`/questionnaires/${id}/clone`, data),
    publish: (id: string) => apiClient.post(`/questionnaires/${id}/publish`),
    archive: (id: string) => apiClient.post(`/questionnaires/${id}/archive`),
    export: (id: string, format: 'json' | 'xlsx' | 'xml' = 'json') =>
      apiClient.get(`/questionnaires/export/${id}`, { params: { format }, responseType: 'blob' }),
    import: (data: { data: any; studyId: string }) =>
      apiClient.post<{ data: import('@/types/questionnaire').Questionnaire }>('/questionnaires/import', data),
    sections: {
      list: (qnrId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').Section[] }>(`/questionnaires/${qnrId}/sections`),
      create: (qnrId: string, data: import('@/types/questionnaire').CreateSectionDto) =>
        apiClient.post<{ data: import('@/types/questionnaire').Section }>(`/questionnaires/${qnrId}/sections`, data),
      update: (sectionId: string, data: import('@/types/questionnaire').UpdateSectionDto) =>
        apiClient.put<{ data: import('@/types/questionnaire').Section }>(`/sections/${sectionId}`, data),
      delete: (sectionId: string) => apiClient.delete(`/sections/${sectionId}`),
      reorder: (qnrId: string, data: { section_ids: string[] }) =>
        apiClient.put(`/questionnaires/${qnrId}/sections/reorder`, data.section_ids),
    },
    questions: {
      list: (sectionId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').Question[] }>(`/sections/${sectionId}/questions`),
      create: (sectionId: string, data: import('@/types/questionnaire').CreateQuestionDto) =>
        apiClient.post<{ data: import('@/types/questionnaire').Question }>(`/sections/${sectionId}/questions`, data),
      update: (questionId: string, data: import('@/types/questionnaire').UpdateQuestionDto) =>
        apiClient.put<{ data: import('@/types/questionnaire').Question }>(`/questions/${questionId}`, data),
      delete: (questionId: string) => apiClient.delete(`/questions/${questionId}`),
      reorder: (sectionId: string, data: { question_ids: string[] }) =>
        apiClient.put(`/sections/${sectionId}/questions/reorder`, data.question_ids),
    },
    options: {
      list: (questionId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').QuestionOption[] }>(`/questions/${questionId}/options`),
      create: (questionId: string, data: import('@/types/questionnaire').CreateOptionDto) =>
        apiClient.post<{ data: import('@/types/questionnaire').QuestionOption }>(`/questions/${questionId}/options`, data),
      update: (optionId: string, data: import('@/types/questionnaire').UpdateOptionDto) =>
        apiClient.put<{ data: import('@/types/questionnaire').QuestionOption }>(`/options/${optionId}`, data),
      delete: (optionId: string) => apiClient.delete(`/options/${optionId}`),
      reorder: (questionId: string, data: { option_ids: string[] }) =>
        apiClient.put(`/questions/${questionId}/options/reorder`, data.option_ids),
    },
    skipLogic: {
      list: (questionId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').SkipLogic[] }>(`/questions/${questionId}/skip-logic`),
      create: (questionId: string, data: Partial<import('@/types/questionnaire').SkipLogic>) =>
        apiClient.post<{ data: import('@/types/questionnaire').SkipLogic }>(`/questions/${questionId}/skip-logic`, data),
      update: (logicId: string, data: Partial<import('@/types/questionnaire').SkipLogic>) =>
        apiClient.put<{ data: import('@/types/questionnaire').SkipLogic }>(`/skip-logic/${logicId}`, data),
      delete: (logicId: string) => apiClient.delete(`/skip-logic/${logicId}`),
    },
    translations: {
      list: (questionId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').Translation[] }>(`/questions/${questionId}/translations`),
      create: (questionId: string, data: Partial<import('@/types/questionnaire').Translation>) =>
        apiClient.post<{ data: import('@/types/questionnaire').Translation }>(`/questions/${questionId}/translations`, data),
      update: (translationId: string, data: Partial<import('@/types/questionnaire').Translation>) =>
        apiClient.put<{ data: import('@/types/questionnaire').Translation }>(`/translations/${translationId}`, data),
      delete: (translationId: string) => apiClient.delete(`/translations/${translationId}`),
    },
    validationRules: {
      list: (questionId: string) =>
        apiClient.get<{ data: import('@/types/questionnaire').ValidationRule[] }>(`/questions/${questionId}/validations`),
      create: (questionId: string, data: Partial<import('@/types/questionnaire').ValidationRule>) =>
        apiClient.post<{ data: import('@/types/questionnaire').ValidationRule }>(`/questions/${questionId}/validations`, data),
      delete: (ruleId: string) => apiClient.delete(`/validation-rules/${ruleId}`),
    },
  },
  assignments: {
    list: (params?: import('@/types/assignment').AssignmentFilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/assignment').Assignment>>('/assignments', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/assignment').Assignment }>(`/assignments/${id}`),
    create: (data: import('@/types/assignment').CreateAssignmentDto) =>
      apiClient.post<{ data: import('@/types/assignment').Assignment }>('/assignments', data),
    update: (id: string, data: Partial<import('@/types/assignment').CreateAssignmentDto>) =>
      apiClient.put<{ data: import('@/types/assignment').Assignment }>(`/assignments/${id}`, data),
    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
    batch: (data: import('@/types/assignment').BatchAssignDto) =>
      apiClient.post<{ data: import('@/types/assignment').Assignment[] }>('/assignments/batch', data),
    approve: (id: string) => apiClient.post(`/assignments/${id}/approve`),
    reject: (id: string, data: { reason: string }) => apiClient.post(`/assignments/${id}/reject`, data),
    progress: (id: string) =>
      apiClient.get<{ data: import('@/types/assignment').Assignment }>(`/assignments/${id}/progress`),
    enumeratorList: (eid: string) =>
      apiClient.get<{ data: import('@/types/assignment').Assignment[] }>(`/enumerators/${eid}/assignments`),
    enumeratorLoad: (eid: string) =>
      apiClient.get<{ data: { total: number; in_progress: number; completed: number } }>(`/enumerators/${eid}/load`),
  },
  submissions: {
    list: (params?: import('@/types/submission').SubmissionFilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/submission').Submission>>('/submissions', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/submission').SubmissionDetail }>(`/submissions/${id}`),
    create: (data: Record<string, unknown>) =>
      apiClient.post<{ data: import('@/types/submission').Submission }>('/submissions', data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.put<{ data: import('@/types/submission').Submission }>(`/submissions/${id}`, data),
    delete: (id: string) => apiClient.delete(`/submissions/${id}`),
    saveAnswer: (id: string, data: Record<string, unknown>) =>
      apiClient.post(`/submissions/${id}/answers`, data),
    complete: (id: string) => apiClient.post(`/submissions/${id}/complete`),
    approve: (id: string) => apiClient.post(`/submissions/${id}/approve`),
    reject: (id: string, data?: { reason?: string }) => apiClient.post(`/submissions/${id}/reject`, data),
    flagAnswer: (id: string, questionId: string, data: { reason: string }) =>
      apiClient.post(`/submissions/${id}/flag`, { ...data, questionId }),
    quality: (id: string) =>
      apiClient.get<{ data: Record<string, unknown> }>(`/submissions/${id}/quality`),
    export: (studyId: string, format: string) =>
      apiClient.get('/submissions/export', { params: { studyId, format }, responseType: 'blob' }),
    enumeratorList: (eid: string) =>
      apiClient.get<{ data: import('@/types/submission').Submission[] }>(`/enumerators/${eid}/submissions`),
    enumeratorStats: (eid: string) =>
      apiClient.get<{ data: Record<string, unknown> }>(`/enumerators/${eid}/stats`),
  },
  media: {
    upload: (data: FormData) =>
      apiClient.post<{ data: import('@/types/media').Media }>('/media/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    get: (id: string) => apiClient.get<{ data: import('@/types/media').Media }>(`/media/${id}`),
    download: (id: string) => apiClient.get(`/media/${id}/download`, { responseType: 'blob' }),
    delete: (id: string) => apiClient.delete(`/media/${id}`),
    submissionMedia: (submissionId: string) =>
      apiClient.get<{ data: import('@/types/media').Media[] }>(`/submissions/${submissionId}/media`),
  },
  sync: {
    pull: (data: Record<string, unknown>) => apiClient.post('/sync/pull', data),
    push: (data: Record<string, unknown>) => apiClient.post('/sync/push', data),
    status: () => apiClient.get<{ data: import('@/types/media').SyncStatusData[] }>('/sync/status'),
    log: () => apiClient.get<{ data: import('@/types/media').SyncLogEntry[] }>('/sync/log'),
    full: () => apiClient.post('/sync/full'),
  },
  dashboard: {
    executive: (params?: import('@/types/api').DashboardFilterParams) =>
      apiClient.get<{ data: import('@/types/dashboard').DashboardSummary }>('/dashboard/executive', { params }),
    study: (studyId: string, params?: import('@/types/api').DashboardFilterParams) =>
      apiClient.get<{ data: import('@/types/dashboard').StudyDashboardData }>(`/dashboards/study/${studyId}`, { params }),
    alerts: (params?: import('@/types/api').DashboardFilterParams) =>
      apiClient.get<{ data: import('@/types/dashboard').DashboardAlert[] }>('/dashboards/alerts', { params }),
    evaluateAlerts: (studyId: string) =>
      apiClient.post('/dashboards/alerts/evaluate-study', { studyId }),
    saveLayout: (widgets: import('@/types/dashboard').DashboardWidget[]) =>
      apiClient.put('/dashboards/layout/save', { layout: widgets }),
  },
  reports: {
    list: (params?: import('@/types/api').FilterParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/report').Report>>('/reports', { params }),
    get: (id: string) => apiClient.get<{ data: import('@/types/report').Report }>(`/reports/${id}`),
    create: (data: import('@/types/report').CreateReportDto) =>
      apiClient.post<{ data: import('@/types/report').Report }>('/reports', data),
    update: (id: string, data: import('@/types/report').UpdateReportDto) =>
      apiClient.put<{ data: import('@/types/report').Report }>(`/reports/${id}`, data),
    delete: (id: string) => apiClient.delete(`/reports/${id}`),
    generate: (id: string) => apiClient.post(`/reports/${id}/generate`),
    export: (id: string, format: string) =>
      apiClient.get(`/reports/${id}/export/${format}`, { responseType: 'blob' }),
    clone: (id: string) => apiClient.post<{ data: import('@/types/report').Report }>(`/reports/${id}/clone`),
    templates: {
      list: (params?: import('@/types/api').FilterParams) =>
        apiClient.get<{ data: import('@/types/report').ReportTemplate[] }>('/report-templates', { params }),
      get: (id: string) => apiClient.get<{ data: import('@/types/report').ReportTemplate }>(`/report-templates/${id}`),
    },
    schedule: {
      create: (reportId: string, data: import('@/types/report').CreateReportScheduleDto) =>
        apiClient.post<{ data: import('@/types/report').ReportSchedule }>(`/reports/${reportId}/schedules`, data),
      update: (reportId: string, data: import('@/types/report').UpdateReportScheduleDto) =>
        apiClient.put<{ data: import('@/types/report').ReportSchedule }>(`/reports/${reportId}/schedules`, data),
      delete: (reportId: string) => apiClient.delete(`/reports/${reportId}/schedules`),
    },
  },
  auditLog: {
    list: (params?: import('@/types/api').ActivityLogParams) =>
      apiClient.get<import('@/types/api').PaginatedResponse<unknown>>('/audit-logs', { params }),
  },
  ai: {
    chat: (data: import('@/types/ai').ChatRequest) =>
      apiClient.post<{ data: import('@/types/ai').ChatResponse }>('/ai/chat', data),
    sessions: {
      list: (params?: { agent_id?: string; status?: string }) =>
        apiClient.get<{ data: import('@/types/ai').AiSession[] }>('/ai/sessions', { params }),
      get: (id: string) =>
        apiClient.get<{ data: import('@/types/ai').AiSession & { messages: import('@/types/ai').AiMessage[] } }>(`/ai/sessions/${id}`),
      delete: (id: string) => apiClient.delete(`/ai/sessions/${id}`),
    },
    agents: {
      researchDesign: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/research-design', data),
      surveyDesign: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/survey-design', data),
      indicator: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/indicator', data),
      reporting: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/reporting', data),
      dataQuality: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/data-quality', data),
      qualitative: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/qualitative', data),
      executive: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/executive', data),
      knowledge: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/knowledge', data),
      translation: (data: { text: string; target_language: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/agents/translation', data),
    },
    assist: {
      improveWording: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/improve-wording', data),
      suggestIndicators: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/suggest-indicators', data),
      suggestQuestions: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/suggest-questions', data),
      generateSummary: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/generate-summary', data),
      detectAnomalies: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/detect-anomalies', data),
      extractThemes: (data: import('@/types/ai').AiAssistRequest) =>
        apiClient.post<{ data: import('@/types/ai').AiAssistResponse }>('/ai/assist/extract-themes', data),
    },
    rag: {
      search: (data: import('@/types/ai').RagSearchRequest) =>
        apiClient.post<{ data: import('@/types/ai').RagSearchResult[] }>('/ai/rag/search', data),
      ingest: (data: FormData) =>
        apiClient.post<{ data: { document_id: string; status: string } }>('/ai/rag/ingest', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      documents: {
        list: (params?: { status?: string }) =>
          apiClient.get<{ data: import('@/types/ai').RagDocument[] }>('/ai/rag/documents', { params }),
        delete: (id: string) => apiClient.delete(`/ai/rag/documents/${id}`),
      },
    },
    prompts: {
      list: (params?: { agent_id?: string; is_active?: boolean }) =>
        apiClient.get<{ data: import('@/types/ai').AiPrompt[] }>('/ai/prompts', { params }),
      get: (id: string) =>
        apiClient.get<{ data: import('@/types/ai').AiPrompt }>(`/ai/prompts/${id}`),
    },
    metrics: {
      inferences: (params?: { agent?: string; date_from?: string; date_to?: string; page?: number; per_page?: number }) =>
        apiClient.get<import('@/types/api').PaginatedResponse<import('@/types/ai').AiInference>>('/ai/inferences', { params }),
      stats: () =>
        apiClient.get<{ data: import('@/types/ai').AiMetrics }>('/ai/metrics'),
    },
  },
};

export type ApiClientType = typeof API;
