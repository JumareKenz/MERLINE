import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';
import { mockAdapter } from './api-mock';
/*
 * Response types are referenced through these namespaces, never as inline
 * `import('@/types/…').X` inside a call's type arguments: SWC (Next's
 * compiler) cannot tell `api.get<import('…').X>(url)` from a comparison with
 * a dynamic import, and silently compiled every such method into an
 * expression that never sent a request. Keep it this way.
 */
import type * as AiTypes from '@/types/ai';
import type * as ApiTypes from '@/types/api';
import type * as AssignmentTypes from '@/types/assignment';
import type * as AuthTypes from '@/types/auth';
import type * as ConsentTypes from '@/types/consent';
import type * as DashboardTypes from '@/types/dashboard';
import type * as FieldTypes from '@/types/field';
import type * as FindingTypes from '@/types/finding';
import type * as IndicatorTypes from '@/types/indicator';
import type * as InterviewTypes from '@/types/interview';
import type * as LogframeTypes from '@/types/logframe';
import type * as MediaTypes from '@/types/media';
import type * as OrganizationTypes from '@/types/organization';
import type * as ParticipantTypes from '@/types/participant';
import type * as ProjectTypes from '@/types/project';
import type * as QuestionnaireTypes from '@/types/questionnaire';
import type * as ReportTypes from '@/types/report';
import type * as ResearchProjectTypes from '@/types/research-project';
import type * as RoleTypes from '@/types/role';
import type * as StudyTypes from '@/types/study';
import type * as SubmissionTypes from '@/types/submission';
import type * as AnalysisTypes from '@/types/analysis-report';
import type * as TranscriptTypes from '@/types/transcript';
import type * as UserTypes from '@/types/user';
import type * as WorkspaceTypes from '@/types/workspace';

/**
 * PHASE 1 — mock mode cannot be enabled outside development.
 *
 * The mock adapter serves generated demo data for the entire API surface. It
 * is why a backend that could not authenticate anyone still demoed as a
 * working product, and it hid the fact that several declared endpoints have no
 * server route at all.
 *
 * `NODE_ENV` is inlined by Next at build time, so a production build
 * short-circuits this to `false` and the bundler drops the adapter. Setting
 * NEXT_PUBLIC_USE_MOCK in a deployed environment now has no effect.
 */
const USE_MOCK =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

if (
  process.env.NODE_ENV !== 'development' &&
  process.env.NEXT_PUBLIC_USE_MOCK === 'true'
) {
  // Loud rather than silent: someone has tried to ship demo data.
  console.warn(
    '[api-client] NEXT_PUBLIC_USE_MOCK is set but ignored outside development.',
  );
}

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
    // File downloads (responseType 'blob') carry their JSON error as a Blob.
    const data: unknown = error.response?.data;
    if (typeof Blob !== 'undefined' && data instanceof Blob && data.type.includes('json')) {
      try {
        (error.response as { data: unknown }).data = JSON.parse(await data.text());
      } catch {
        // Leave it; normalizeError falls back to a generic message.
      }
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

/**
 * PHASE 0 — QUALITATIVE RESET
 *
 * This file still declares the full legacy (MERL) API surface. Those
 * declarations are RETAINED DELIBERATELY and marked `LEGACY` below.
 *
 * Their backend modules are deregistered, so calling them now returns 404.
 * They are not deleted yet because deleting them would turn Phase 0 into a
 * combined isolation + API redesign change, and because the data-preservation
 * decision may require them for export tooling.
 *
 * Active qualitative code must not call a LEGACY group. `api-contract.spec.ts`
 * in the backend checks that every ACTIVE endpoint declared here exists on the
 * server; legacy groups are excluded from that check.
 *
 * Deleted progressively in Phase 2+, alongside the modules they call.
 */
export const API = {
  auth: {
    /**
     * PHASE 2 — real bug fixed here: this was typed as `token: string;
     * expires_at: string`, but the actual backend (auth.service.ts,
     * generateToken()) returns `token: { accessToken, expiresIn }`. Every
     * consumer destructuring `token` directly and using it as a string —
     * auth-provider.tsx's login()/register() — was setting the auth cookie
     * and the Authorization header to the *stringified object*
     * "[object Object]". Confirmed by comparing this type against a live
     * `curl .../auth/login` response, not assumed. This made the real
     * browser login flow non-functional; only manually-extracted curl
     * tests (which never went through this code) looked like they worked.
     */
    login: (data: { email: string; password: string; device_name?: string }) =>
      apiClient.post<
        ApiTypes.Envelope<{
          user: AuthTypes.AuthUser;
          token: { accessToken: string; expiresIn: number };
        }>
      >('/auth/login', data),
    fieldLogin: (code: string) =>
      apiClient.post<
        ApiTypes.Envelope<{
          user: AuthTypes.AuthUser;
          token: { accessToken: string; expiresIn: number };
        }>
      >('/auth/field-login', { code }),
    register: (data: AuthTypes.RegisterDto) =>
      apiClient.post<{ data: AuthTypes.RegisterResponse }>('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    refresh: () => apiClient.post<{ data: { token: string } }>('/auth/refresh'),
    me: () => apiClient.get<{ data: AuthTypes.SessionProfile }>('/auth/me'),
    changePassword: (data: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }) =>
      apiClient.put<ApiTypes.Envelope<{ message: string }>>('/auth/change-password', data),
    updateProfile: (data: AuthTypes.UpdateProfileDto) =>
      apiClient.put<{ data: AuthTypes.AuthUser }>('/auth/me', data),
    forgotPassword: (data: { email: string }) =>
      apiClient.post<{ data: { message: string } }>('/auth/forgot-password', data),
    resetPassword: (data: AuthTypes.ResetPasswordDto) =>
      apiClient.post<{ data: { message: string } }>('/auth/reset-password', data),
    sessions: () => apiClient.get<{ data: AuthTypes.AuthSession[] }>('/auth/sessions'),
    deleteSession: (id: string) => apiClient.delete(`/auth/sessions/${id}`),
  },
  organizations: {
    get: () => apiClient.get<{ data: OrganizationTypes.Organization }>('/organizations'),
    update: (id: string, data: OrganizationTypes.UpdateOrganizationDto) =>
      apiClient.put<{ data: OrganizationTypes.Organization }>(`/organizations/${id}`, data),
    members: {
      list: (orgId: string, params?: ApiTypes.UserFilterParams) =>
        apiClient.get<ApiTypes.Envelope<UserTypes.Member[]>>(`/organizations/${orgId}/members`, { params }),
      /**
       * PHASE 2 — real bug fixed here: this sent `role_id` (the frontend
       * form field's name), but the backend's `addMember` reads
       * `body.roleId`. Confirmed against organizations.service.ts. The
       * mismatch didn't error — there's no DTO class on that route for
       * ValidationPipe to reject an unknown field against — it silently
       * created every new user with no role at all.
       */
      create: (orgId: string, data: UserTypes.CreateUserDto) =>
        apiClient.post<{ data: UserTypes.User }>(`/organizations/${orgId}/members`, {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: data.role_id,
        }),
      updateRole: (orgId: string, userId: string, data: { role_id: string }) =>
        apiClient.put(`/organizations/${orgId}/members/${userId}/role`, { role_id: data.role_id }),
      remove: (orgId: string, userId: string) =>
        apiClient.delete(`/organizations/${orgId}/members/${userId}`),
    },
  },
  teams: {
    list: (orgId: string) => apiClient.get<{ data: UserTypes.Member[] }>(`/organizations/${orgId}/teams`),
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
  /**
   * PHASE 2 — field-worker access codes. Distinct from `organizations.members`
   * (which lists/creates/edits members): these two hit `/users/:id/...`
   * directly, the tenant-scoped, permission-guarded controller the
   * field-access-code backend work added. No client method previously called
   * either endpoint — the backend feature existed with no way to reach it
   * from the product.
   */
  /** The field worker's own API: assigned projects, on-site interviews. */
  field: {
    projects: () => apiClient.get<ApiTypes.Envelope<FieldTypes.FieldProject[]>>('/field/projects'),
    createInterview: (data: FieldTypes.CreateFieldInterviewInput) =>
      apiClient.post<ApiTypes.Envelope<InterviewTypes.Interview>>('/field/interviews', data, { timeout: 60_000 }),
  },
  /** Admin: field workers, their projects and access. */
  fieldTeam: {
    list: () => apiClient.get<ApiTypes.Envelope<FieldTypes.FieldWorker[]>>('/field-team'),
    create: (data: FieldTypes.CreateFieldWorkerInput) =>
      apiClient.post<ApiTypes.Envelope<{ id: string; firstName: string; lastName: string; code: string }>>('/field-team', data),
    setProjects: (userId: string, projectIds: string[]) =>
      apiClient.put<ApiTypes.Envelope<FieldTypes.FieldWorker>>(`/field-team/${userId}/projects`, { projectIds }),
  },
  users: {
    generateFieldAccessCode: (id: string) =>
      apiClient.post<ApiTypes.Envelope<{ code: string; issuedAt: string }>>(
        `/users/${id}/field-access-code`,
      ),
    revokeFieldAccessCode: (id: string) =>
      apiClient.delete<ApiTypes.Envelope<{ revoked: boolean }>>(`/users/${id}/field-access-code`),
  },
  roles: {
    list: () => apiClient.get<{ data: RoleTypes.Role[] }>('/roles'),
    get: (id: string) => apiClient.get<{ data: RoleTypes.Role }>(`/roles/${id}`),
    create: (data: RoleTypes.CreateRoleDto) =>
      apiClient.post<{ data: RoleTypes.Role }>('/roles', data),
    update: (id: string, data: RoleTypes.UpdateRoleDto) =>
      apiClient.put<{ data: RoleTypes.Role }>(`/roles/${id}`, data),
    delete: (id: string) => apiClient.delete(`/roles/${id}`),
    permissions: () => apiClient.get<{ data: RoleTypes.PermissionGroup[] }>('/roles/permissions'),
  },
  workspaces: {
    list: () => apiClient.get<{ data: WorkspaceTypes.Workspace[] }>('/workspaces'),
    get: (id: string) => apiClient.get<{ data: WorkspaceTypes.Workspace }>(`/workspaces/${id}`),
    create: (data: WorkspaceTypes.CreateWorkspaceDto) =>
      apiClient.post<{ data: WorkspaceTypes.Workspace }>('/workspaces', data),
    update: (id: string, data: WorkspaceTypes.UpdateWorkspaceDto) =>
      apiClient.put<{ data: WorkspaceTypes.Workspace }>(`/workspaces/${id}`, data),
    delete: (id: string) => apiClient.delete(`/workspaces/${id}`),
    setDefault: (id: string) => apiClient.post(`/workspaces/${id}/set-default`),
  },
  /** The live project API, correctly shaped. `projects` below is the legacy MERL shape. */
  researchProjects: {
    list: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
      apiClient.get<ApiTypes.Envelope<ResearchProjectTypes.ResearchProjectPage>>('/projects', {
        params: { limit: 100, ...params },
      }),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<ResearchProjectTypes.ResearchProject>>(`/projects/${id}`),
    create: (data: ResearchProjectTypes.ResearchProjectInput) =>
      apiClient.post<ApiTypes.Envelope<ResearchProjectTypes.ResearchProject>>('/projects', data),
    update: (id: string, data: Partial<ResearchProjectTypes.ResearchProjectInput>) =>
      apiClient.put<ApiTypes.Envelope<ResearchProjectTypes.ResearchProject>>(`/projects/${id}`, data),
    archive: (id: string) => apiClient.post(`/projects/${id}/archive`),
    restore: (id: string) => apiClient.post(`/projects/${id}/restore`),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
  },
  projects: {
    list: (params?: ApiTypes.FilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<ProjectTypes.Project>>('/projects', { params }),
    get: (id: string) => apiClient.get<{ data: ProjectTypes.Project }>(`/projects/${id}`),
    create: (data: ProjectTypes.CreateProjectDto) =>
      apiClient.post<{ data: ProjectTypes.Project }>('/projects', data),
    update: (id: string, data: ProjectTypes.UpdateProjectDto) =>
      apiClient.put<{ data: ProjectTypes.Project }>(`/projects/${id}`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}`),
    archive: (id: string) => apiClient.post(`/projects/${id}/archive`),
    restore: (id: string) => apiClient.post(`/projects/${id}/restore`),
    clone: (id: string, data: ProjectTypes.CloneProjectDto) =>
      apiClient.post<{ data: ProjectTypes.Project }>(`/projects/${id}/clone`, data),
    timeline: (id: string) =>
      apiClient.get<{ data: ProjectTypes.ProjectActivity[] }>(`/projects/${id}/timeline`),
    stats: (id: string) =>
      apiClient.get<{ data: ProjectTypes.ProjectStats }>(`/projects/${id}/stats`),
    team: {
      list: (projectId: string) =>
        apiClient.get<{ data: ProjectTypes.ProjectTeam[] }>(`/projects/${projectId}/team`),
      add: (projectId: string, data: { user_id: string; role: string }) =>
        apiClient.post<{ data: ProjectTypes.ProjectTeam }>(`/projects/${projectId}/team`, data),
      update: (projectId: string, memberId: string, data: { role: string }) =>
        apiClient.put(`/projects/${projectId}/team/${memberId}`, data),
      remove: (projectId: string, memberId: string) =>
        apiClient.delete(`/projects/${projectId}/team/${memberId}`),
    },
    studies: {
      list: (projectId: string, params?: ApiTypes.StudyFilterParams) =>
        apiClient.get<ApiTypes.PaginatedResponse<StudyTypes.Study>>('/studies', { params: { ...params, projectId } }),
    },
    logframe: {
      get: (projectId: string) =>
        apiClient.get<{ data: LogframeTypes.Logframe | null }>(`/projects/${projectId}/logframe`),
      upsert: (projectId: string, data: LogframeTypes.UpsertLogframeDto) =>
        apiClient.put<{ data: LogframeTypes.Logframe }>(`/projects/${projectId}/logframe`, data),
      addRow: (projectId: string, data: LogframeTypes.CreateLogframeRowDto) =>
        apiClient.post<{ data: LogframeTypes.LogframeRow }>(`/projects/${projectId}/logframe/rows`, data),
      updateRow: (projectId: string, rowId: string, data: LogframeTypes.UpdateLogframeRowDto) =>
        apiClient.put<{ data: LogframeTypes.LogframeRow }>(`/projects/${projectId}/logframe/rows/${rowId}`, data),
      deleteRow: (projectId: string, rowId: string) =>
        apiClient.delete(`/projects/${projectId}/logframe/rows/${rowId}`),
      linkIndicator: (projectId: string, rowId: string, data: LogframeTypes.LinkIndicatorDto) =>
        apiClient.post(`/projects/${projectId}/logframe/rows/${rowId}/indicators`, data),
      unlinkIndicator: (projectId: string, rowId: string, indicatorId: string) =>
        apiClient.delete(`/projects/${projectId}/logframe/rows/${rowId}/indicators/${indicatorId}`),
    },
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  studies: {
    list: (params?: ApiTypes.StudyFilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<StudyTypes.Study>>('/studies', { params }),
    get: (id: string) => apiClient.get<{ data: StudyTypes.Study }>(`/studies/${id}`),
    create: (projectId: string, data: StudyTypes.CreateStudyDto) =>
      apiClient.post<{ data: StudyTypes.Study }>('/studies', { ...data, projectId }),
    update: (id: string, data: StudyTypes.UpdateStudyDto) =>
      apiClient.put<{ data: StudyTypes.Study }>(`/studies/${id}`, data),
    delete: (id: string) => apiClient.delete(`/studies/${id}`),
    archive: (id: string) => apiClient.post(`/studies/${id}/archive`),
    restore: (id: string) => apiClient.post(`/studies/${id}/restore`),
    clone: (id: string, data: StudyTypes.StudyCloneDto) =>
      apiClient.post<{ data: StudyTypes.Study }>(`/studies/${id}/clone`, data),
    transition: (id: string, data: StudyTypes.StudyTransitionDto) =>
      apiClient.post<{ data: StudyTypes.Study }>(`/studies/${id}/transition`, data),
    getAllowedTransitions: (id: string) =>
      apiClient.get<{ data: string[] }>(`/studies/${id}/transitions`),
    lifecycle: (id: string) =>
      apiClient.get<{ data: StudyTypes.StudyLifecycleEvent[] }>(`/studies/${id}/lifecycle`),
    timeline: (id: string) =>
      apiClient.get<{ data: StudyTypes.StudyTimelineEvent[] }>(`/studies/${id}/timeline`),
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  indicators: {
    library: (params?: IndicatorTypes.IndicatorFilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<IndicatorTypes.Indicator>>('/indicators', { params }),
    get: (id: string) => apiClient.get<{ data: IndicatorTypes.Indicator }>(`/indicators/${id}`),
    create: (data: IndicatorTypes.CreateIndicatorDto) =>
      apiClient.post<{ data: IndicatorTypes.Indicator }>('/indicators', data),
    update: (id: string, data: IndicatorTypes.UpdateIndicatorDto) =>
      apiClient.put<{ data: IndicatorTypes.Indicator }>(`/indicators/${id}`, data),
    delete: (id: string) => apiClient.delete(`/indicators/${id}`),
    approve: (id: string) => apiClient.post(`/indicators/${id}/approve`),
    supersede: (id: string, newIndicatorId: string) =>
      apiClient.post(`/indicators/${id}/supersede`, { new_indicator_id: newIndicatorId }),
    values: {
      list: (indicatorId: string, params?: { date_from?: string; date_to?: string }) =>
        apiClient.get<{ data: IndicatorTypes.IndicatorValue[] }>(`/indicators/${indicatorId}/values`, { params }),
      create: (indicatorId: string, data: IndicatorTypes.RecordIndicatorValueDto) =>
        apiClient.post<{ data: IndicatorTypes.IndicatorValue }>(`/indicators/${indicatorId}/values`, data),
    },
    targets: {
      list: (indicatorId: string) =>
        apiClient.get<{ data: IndicatorTypes.IndicatorTarget[] }>(`/indicators/${indicatorId}/targets`),
      set: (indicatorId: string, data: IndicatorTypes.SetIndicatorTargetDto) =>
        apiClient.post<{ data: IndicatorTypes.IndicatorTarget }>(`/indicators/${indicatorId}/targets`, data),
    },
    trend: (indicatorId: string) =>
      apiClient.get<{ data: IndicatorTypes.IndicatorTrend }>(`/indicators/${indicatorId}/trend`),
    study: {
      list: (studyId: string) =>
        apiClient.get<{ data: IndicatorTypes.StudyIndicator[] }>(`/studies/${studyId}/indicators`),
      link: (studyId: string, indicatorId: string) =>
        apiClient.post(`/studies/${studyId}/indicators/link`, { indicatorId }),
      unlink: (studyId: string, indicatorId: string) =>
        apiClient.delete(`/studies/${studyId}/indicators/${indicatorId}`),
    },
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  questionnaires: {
    list: (params?: QuestionnaireTypes.QuestionnaireFilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<QuestionnaireTypes.Questionnaire>>('/questionnaires', { params }),
    get: (id: string) => apiClient.get<{ data: QuestionnaireTypes.Questionnaire }>(`/questionnaires/${id}`),
    create: (data: QuestionnaireTypes.CreateQuestionnaireDto) =>
      apiClient.post<{ data: QuestionnaireTypes.Questionnaire }>('/questionnaires', data),
    update: (id: string, data: QuestionnaireTypes.UpdateQuestionnaireDto) =>
      apiClient.put<{ data: QuestionnaireTypes.Questionnaire }>(`/questionnaires/${id}`, data),
    delete: (id: string) => apiClient.delete(`/questionnaires/${id}`),
    clone: (id: string, data: { title: string }) =>
      apiClient.post<{ data: QuestionnaireTypes.Questionnaire }>(`/questionnaires/${id}/clone`, data),
    publish: (id: string) => apiClient.post(`/questionnaires/${id}/publish`),
    archive: (id: string) => apiClient.post(`/questionnaires/${id}/archive`),
    export: (id: string, format: 'json' | 'xlsx' | 'xml' = 'json') =>
      apiClient.get(`/questionnaires/export/${id}`, { params: { format }, responseType: 'blob' }),
    import: (data: { data: any; studyId: string }) =>
      apiClient.post<{ data: QuestionnaireTypes.Questionnaire }>('/questionnaires/import', data),
    sections: {
      list: (qnrId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.Section[] }>(`/questionnaires/${qnrId}/sections`),
      create: (qnrId: string, data: QuestionnaireTypes.CreateSectionDto) =>
        apiClient.post<{ data: QuestionnaireTypes.Section }>(`/questionnaires/${qnrId}/sections`, data),
      update: (sectionId: string, data: QuestionnaireTypes.UpdateSectionDto) =>
        apiClient.put<{ data: QuestionnaireTypes.Section }>(`/sections/${sectionId}`, data),
      delete: (sectionId: string) => apiClient.delete(`/sections/${sectionId}`),
      reorder: (qnrId: string, data: { section_ids: string[] }) =>
        apiClient.put(`/questionnaires/${qnrId}/sections/reorder`, data.section_ids),
    },
    questions: {
      list: (sectionId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.Question[] }>(`/sections/${sectionId}/questions`),
      create: (sectionId: string, data: QuestionnaireTypes.CreateQuestionDto) =>
        apiClient.post<{ data: QuestionnaireTypes.Question }>(`/sections/${sectionId}/questions`, data),
      update: (questionId: string, data: QuestionnaireTypes.UpdateQuestionDto) =>
        apiClient.put<{ data: QuestionnaireTypes.Question }>(`/questions/${questionId}`, data),
      delete: (questionId: string) => apiClient.delete(`/questions/${questionId}`),
      reorder: (sectionId: string, data: { question_ids: string[] }) =>
        apiClient.put(`/sections/${sectionId}/questions/reorder`, data.question_ids),
    },
    options: {
      list: (questionId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.QuestionOption[] }>(`/questions/${questionId}/options`),
      create: (questionId: string, data: QuestionnaireTypes.CreateOptionDto) =>
        apiClient.post<{ data: QuestionnaireTypes.QuestionOption }>(`/questions/${questionId}/options`, data),
      update: (optionId: string, data: QuestionnaireTypes.UpdateOptionDto) =>
        apiClient.put<{ data: QuestionnaireTypes.QuestionOption }>(`/options/${optionId}`, data),
      delete: (optionId: string) => apiClient.delete(`/options/${optionId}`),
      reorder: (questionId: string, data: { option_ids: string[] }) =>
        apiClient.put(`/questions/${questionId}/options/reorder`, data.option_ids),
    },
    skipLogic: {
      list: (questionId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.SkipLogic[] }>(`/questions/${questionId}/skip-logic`),
      create: (questionId: string, data: Partial<QuestionnaireTypes.SkipLogic>) =>
        apiClient.post<{ data: QuestionnaireTypes.SkipLogic }>(`/questions/${questionId}/skip-logic`, data),
      update: (logicId: string, data: Partial<QuestionnaireTypes.SkipLogic>) =>
        apiClient.put<{ data: QuestionnaireTypes.SkipLogic }>(`/skip-logic/${logicId}`, data),
      delete: (logicId: string) => apiClient.delete(`/skip-logic/${logicId}`),
    },
    translations: {
      list: (questionId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.Translation[] }>(`/questions/${questionId}/translations`),
      create: (questionId: string, data: Partial<QuestionnaireTypes.Translation>) =>
        apiClient.post<{ data: QuestionnaireTypes.Translation }>(`/questions/${questionId}/translations`, data),
      update: (translationId: string, data: Partial<QuestionnaireTypes.Translation>) =>
        apiClient.put<{ data: QuestionnaireTypes.Translation }>(`/translations/${translationId}`, data),
      delete: (translationId: string) => apiClient.delete(`/translations/${translationId}`),
    },
    validationRules: {
      list: (questionId: string) =>
        apiClient.get<{ data: QuestionnaireTypes.ValidationRule[] }>(`/questions/${questionId}/validations`),
      create: (questionId: string, data: Partial<QuestionnaireTypes.ValidationRule>) =>
        apiClient.post<{ data: QuestionnaireTypes.ValidationRule }>(`/questions/${questionId}/validations`, data),
      delete: (ruleId: string) => apiClient.delete(`/validation-rules/${ruleId}`),
    },
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  assignments: {
    list: (params?: AssignmentTypes.AssignmentFilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<AssignmentTypes.Assignment>>('/assignments', { params }),
    get: (id: string) => apiClient.get<{ data: AssignmentTypes.Assignment }>(`/assignments/${id}`),
    create: (data: AssignmentTypes.CreateAssignmentDto) =>
      apiClient.post<{ data: AssignmentTypes.Assignment }>('/assignments', data),
    update: (id: string, data: Partial<AssignmentTypes.CreateAssignmentDto>) =>
      apiClient.put<{ data: AssignmentTypes.Assignment }>(`/assignments/${id}`, data),
    delete: (id: string) => apiClient.delete(`/assignments/${id}`),
    batch: (data: AssignmentTypes.BatchAssignDto) =>
      apiClient.post<{ data: AssignmentTypes.Assignment[] }>('/assignments/batch', data),
    approve: (id: string) => apiClient.post(`/assignments/${id}/approve`),
    reject: (id: string, data: { reason: string }) => apiClient.post(`/assignments/${id}/reject`, data),
    progress: (id: string) =>
      apiClient.get<{ data: AssignmentTypes.Assignment }>(`/assignments/${id}/progress`),
    enumeratorList: (eid: string) =>
      apiClient.get<{ data: AssignmentTypes.Assignment[] }>(`/enumerators/${eid}/assignments`),
    enumeratorLoad: (eid: string) =>
      apiClient.get<{ data: { total: number; in_progress: number; completed: number } }>(`/enumerators/${eid}/load`),
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  submissions: {
    list: (params?: SubmissionTypes.SubmissionFilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<SubmissionTypes.Submission>>('/submissions', { params }),
    get: (id: string) => apiClient.get<{ data: SubmissionTypes.SubmissionDetail }>(`/submissions/${id}`),
    create: (data: Record<string, unknown>) =>
      apiClient.post<{ data: SubmissionTypes.Submission }>('/submissions', data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.put<{ data: SubmissionTypes.Submission }>(`/submissions/${id}`, data),
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
      apiClient.get<{ data: SubmissionTypes.Submission[] }>(`/enumerators/${eid}/submissions`),
    enumeratorStats: (eid: string) =>
      apiClient.get<{ data: Record<string, unknown> }>(`/enumerators/${eid}/stats`),
  },
  media: {
    upload: (data: FormData) =>
      apiClient.post<{ data: MediaTypes.Media }>('/media/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    get: (id: string) => apiClient.get<{ data: MediaTypes.Media }>(`/media/${id}`),
    download: (id: string) => apiClient.get(`/media/${id}/download`, { responseType: 'blob' }),
    delete: (id: string) => apiClient.delete(`/media/${id}`),
    submissionMedia: (submissionId: string) =>
      apiClient.get<{ data: MediaTypes.Media[] }>(`/submissions/${submissionId}/media`),
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  sync: {
    pull: (data: Record<string, unknown>) => apiClient.post('/sync/pull', data),
    push: (data: Record<string, unknown>) => apiClient.post('/sync/push', data),
    status: () => apiClient.get<{ data: MediaTypes.SyncStatusData[] }>('/sync/status'),
    log: () => apiClient.get<{ data: MediaTypes.SyncLogEntry[] }>('/sync/log'),
    full: () => apiClient.post('/sync/full'),
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  dashboard: {
    executive: (params?: ApiTypes.DashboardFilterParams) =>
      apiClient.get<{ data: DashboardTypes.DashboardSummary }>('/dashboards/executive', { params }),
    study: (studyId: string, params?: ApiTypes.DashboardFilterParams) =>
      apiClient.get<{ data: DashboardTypes.StudyDashboardData }>(`/dashboards/study/${studyId}`, { params }),
    alerts: (params?: ApiTypes.DashboardFilterParams) =>
      apiClient.get<{ data: DashboardTypes.DashboardAlert[] }>('/dashboards/alerts', { params }),
    evaluateAlerts: (studyId: string) =>
      apiClient.post('/dashboards/alerts/evaluate-study', { studyId }),
    saveLayout: (widgets: DashboardTypes.DashboardWidget[]) =>
      apiClient.put('/dashboards/layout/save', { layout: widgets }),
  },
  /** LEGACY (Phase 0) — backend module deregistered; these endpoints return 404. Do not call. */
  reports: {
    list: (params?: ApiTypes.FilterParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<ReportTypes.Report>>('/reports', { params }),
    get: (id: string) => apiClient.get<{ data: ReportTypes.Report }>(`/reports/${id}`),
    create: (data: ReportTypes.CreateReportDto) =>
      apiClient.post<{ data: ReportTypes.Report }>('/reports', data),
    update: (id: string, data: ReportTypes.UpdateReportDto) =>
      apiClient.put<{ data: ReportTypes.Report }>(`/reports/${id}`, data),
    delete: (id: string) => apiClient.delete(`/reports/${id}`),
    generate: (id: string) => apiClient.post(`/reports/${id}/generate`),
    export: (id: string, format: string) =>
      apiClient.get(`/reports/${id}/export/${format}`, { responseType: 'blob' }),
    clone: (id: string) => apiClient.post<{ data: ReportTypes.Report }>(`/reports/${id}/clone`),
    templates: {
      list: (params?: ApiTypes.FilterParams) =>
        apiClient.get<{ data: ReportTypes.ReportTemplate[] }>('/report-templates', { params }),
      get: (id: string) => apiClient.get<{ data: ReportTypes.ReportTemplate }>(`/report-templates/${id}`),
    },
    schedule: {
      create: (reportId: string, data: ReportTypes.CreateReportScheduleDto) =>
        apiClient.post<{ data: ReportTypes.ReportSchedule }>(`/reports/${reportId}/schedules`, data),
      update: (reportId: string, data: ReportTypes.UpdateReportScheduleDto) =>
        apiClient.put<{ data: ReportTypes.ReportSchedule }>(`/reports/${reportId}/schedules`, data),
      delete: (reportId: string) => apiClient.delete(`/reports/${reportId}/schedules`),
    },
  },
  /**
   * PHASE 2 — qualitative interview product. Every response here is a real
   * Envelope<T> (see types/api.ts) — this backend wraps ALL payloads in
   * {status, message, data, meta}, unlike the PaginatedResponse/SingleResponse
   * shapes the legacy groups above assume.
   */
  participants: {
    list: (projectId?: string) =>
      apiClient.get<ApiTypes.Envelope<ParticipantTypes.ParticipantList>>(
        '/participants',
        { params: projectId ? { projectId } : undefined },
      ),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<ParticipantTypes.Participant>>(`/participants/${id}`),
    create: (data: ParticipantTypes.CreateParticipantDto) =>
      apiClient.post<ApiTypes.Envelope<ParticipantTypes.Participant>>('/participants', data),
    update: (id: string, data: ParticipantTypes.UpdateParticipantDto) =>
      apiClient.put<ApiTypes.Envelope<ParticipantTypes.Participant>>(`/participants/${id}`, data),
    delete: (id: string) =>
      apiClient.delete<ApiTypes.Envelope<ParticipantTypes.DeleteResult>>(`/participants/${id}`),
  },
  consents: {
    listForParticipant: (participantId: string) =>
      apiClient.get<ApiTypes.Envelope<ConsentTypes.ConsentList>>('/consents', {
        params: { participantId },
      }),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<ConsentTypes.Consent>>(`/consents/${id}`),
    create: (data: ConsentTypes.CreateConsentDto) =>
      apiClient.post<ApiTypes.Envelope<ConsentTypes.Consent>>('/consents', data),
    withdraw: (id: string) =>
      apiClient.post<ApiTypes.Envelope<ConsentTypes.Consent>>(`/consents/${id}/withdraw`),
  },
  interviews: {
    list: (params?: { participantId?: string; projectId?: string; status?: string; interviewerId?: string }) =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.InterviewList>>('/interviews', { params }),
    interviewers: () =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.AssignableInterviewer[]>>('/interviews/interviewers'),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.Interview>>(`/interviews/${id}`),
    create: (data: InterviewTypes.CreateInterviewDto) =>
      apiClient.post<ApiTypes.Envelope<InterviewTypes.Interview>>('/interviews', data),
    updateStatus: (id: string, status: InterviewTypes.InterviewStatus) =>
      apiClient.put<ApiTypes.Envelope<InterviewTypes.Interview>>(`/interviews/${id}/status`, { status }),
    uploadRecording: (id: string, data: FormData) =>
      apiClient.post<ApiTypes.Envelope<InterviewTypes.Recording>>(
        `/interviews/${id}/recordings`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      ),
    delete: (id: string) => apiClient.delete(`/interviews/${id}`),
    deleteRecording: (id: string, mediaId: string) =>
      apiClient.delete(`/interviews/${id}/recordings/${mediaId}`),
    listRecordings: (id: string) =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.RecordingList>>(`/interviews/${id}/recordings`),
    getRecordingDownloadUrl: (id: string, mediaId: string) =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.RecordingDownloadUrl>>(
        `/interviews/${id}/recordings/${mediaId}/download`,
      ),
    /**
     * Resumable recording upload (field app outbox). Generous per-request
     * timeouts: a 512 KiB part on a weak 2G link can take over a minute.
     */
    recordingUploadStatus: (id: string, uploadId: string) =>
      apiClient.get<ApiTypes.Envelope<InterviewTypes.RecordingUploadStatus>>(
        `/interviews/${id}/recordings/uploads/${uploadId}`,
        { timeout: 60_000 },
      ),
    putRecordingPart: (id: string, uploadId: string, index: number, data: FormData) =>
      apiClient.put<ApiTypes.Envelope<{ index: number; received: number }>>(
        `/interviews/${id}/recordings/uploads/${uploadId}/parts/${index}`,
        data,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 },
      ),
    completeRecordingUpload: (
      id: string,
      uploadId: string,
      data: InterviewTypes.CompleteRecordingUploadDto,
    ) =>
      apiClient.post<ApiTypes.Envelope<InterviewTypes.Recording>>(
        `/interviews/${id}/recordings/uploads/${uploadId}/complete`,
        data,
        { timeout: 180_000 },
      ),
  },
  transcripts: {
    listAll: () =>
      apiClient.get<ApiTypes.Envelope<TranscriptTypes.TranscriptSummaryList>>('/transcripts'),
    ask: (id: string, question: string) =>
      apiClient.post<ApiTypes.Envelope<TranscriptTypes.DialogueAnswer>>(
        `/transcripts/${id}/ask`,
        { question },
        { timeout: 90_000 },
      ),
    listForInterview: (interviewId: string) =>
      apiClient.get<ApiTypes.Envelope<TranscriptTypes.TranscriptList>>('/transcripts', {
        params: { interviewId },
      }),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<TranscriptTypes.Transcript>>(`/transcripts/${id}`),
    request: (data: { interviewId: string; mediaId: string; language?: string }) =>
      apiClient.post<ApiTypes.Envelope<TranscriptTypes.Transcript>>('/transcripts', data),
    retry: (id: string, language?: string) =>
      apiClient.post<ApiTypes.Envelope<TranscriptTypes.Transcript>>(`/transcripts/${id}/retry`, language ? { language } : {}),
    editSegment: (id: string, segmentId: string, text: string | null) =>
      apiClient.patch<ApiTypes.Envelope<TranscriptTypes.TranscriptSegment>>(`/transcripts/${id}/segments/${segmentId}`, { text }),
    translate: (id: string, language = 'en') =>
      apiClient.post<ApiTypes.Envelope<TranscriptTypes.Transcript>>(`/transcripts/${id}/translate`, { language }),
  },
  /** AI-written interview, project and custom reports (administrators). */
  analysisReports: {
    list: (params: { projectId?: string; interviewId?: string }) =>
      apiClient.get<ApiTypes.Envelope<AnalysisTypes.AnalysisReportList>>('/analysis-reports', { params }),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<AnalysisTypes.AnalysisReport>>(`/analysis-reports/${id}`),
    request: (data: AnalysisTypes.RequestReportInput) =>
      apiClient.post<ApiTypes.Envelope<AnalysisTypes.AnalysisReport>>('/analysis-reports', data),
    ask: (data: { projectId: string; question: string; language?: string }) =>
      apiClient.post<ApiTypes.Envelope<AnalysisTypes.ProjectAnswer>>('/analysis-reports/ask', data, { timeout: 120_000 }),
    /** The file itself (PDF rendering can take a few seconds). */
    export: (id: string, format: AnalysisTypes.ExportFormat) =>
      apiClient.get<Blob>(`/analysis-reports/${id}/export`, {
        params: { format },
        responseType: 'blob',
        timeout: 120_000,
      }),
    delete: (id: string) => apiClient.delete(`/analysis-reports/${id}`),
  },
  trash: {
    list: () => apiClient.get<ApiTypes.Envelope<AnalysisTypes.TrashList>>('/trash'),
    restore: (type: AnalysisTypes.TrashItem['type'], id: string) =>
      apiClient.post(`/trash/${type}/${id}/restore`),
  },
  findings: {
    delete: (id: string) => apiClient.delete(`/findings/${id}`),
    list: (projectId?: string) =>
      apiClient.get<ApiTypes.Envelope<FindingTypes.FindingList>>('/findings', {
        params: projectId ? { projectId } : undefined,
      }),
    get: (id: string) =>
      apiClient.get<ApiTypes.Envelope<FindingTypes.Finding>>(`/findings/${id}`),
    create: (data: FindingTypes.CreateFindingDto) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Finding>>('/findings', data),
    addQuotation: (id: string, data: FindingTypes.AddQuotationDto) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Quotation>>(`/findings/${id}/quotations`, data),
    approve: (id: string) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Finding>>(`/findings/${id}/approve`),
    reject: (id: string) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Finding>>(`/findings/${id}/reject`),
    publish: (id: string) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Finding>>(`/findings/${id}/publish`),
    archive: (id: string) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.Finding>>(`/findings/${id}/archive`),
    aiDraft: (transcriptId: string) =>
      apiClient.post<ApiTypes.Envelope<FindingTypes.AiDraftResult>>(
        '/findings/ai-draft',
        { transcriptId },
        // Reads the whole interview; a long one takes a minute or more.
        { timeout: 180_000 },
      ),
  },
  auditLog: {
    list: (params?: ApiTypes.ActivityLogParams) =>
      apiClient.get<ApiTypes.PaginatedResponse<unknown>>('/audit-logs', { params }),
  },
  ai: {
    chat: (data: AiTypes.ChatRequest) =>
      apiClient.post<{ data: AiTypes.ChatResponse }>('/ai/chat', data),
    sessions: {
      list: (params?: { agent_id?: string; status?: string }) =>
        apiClient.get<{ data: AiTypes.AiSession[] }>('/ai/sessions', { params }),
      get: (id: string) =>
        apiClient.get<{ data: AiTypes.AiSession & { messages: AiTypes.AiMessage[] } }>(`/ai/sessions/${id}`),
      delete: (id: string) => apiClient.delete(`/ai/sessions/${id}`),
    },
    /** LEGACY (Phase 1) — the nine static agents are deregistered; these return 404. */
    agents: {
      researchDesign: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/research-design', data),
      surveyDesign: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/survey-design', data),
      indicator: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/indicator', data),
      reporting: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/reporting', data),
      dataQuality: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/data-quality', data),
      qualitative: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/qualitative', data),
      executive: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/executive', data),
      knowledge: (data: { text: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/knowledge', data),
      translation: (data: { text: string; target_language: string; context?: Record<string, unknown> }) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/agents/translation', data),
    },
    assist: {
      improveWording: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/improve-wording', data),
      suggestIndicators: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/suggest-indicators', data),
      suggestQuestions: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/suggest-questions', data),
      generateSummary: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/generate-summary', data),
      detectAnomalies: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/detect-anomalies', data),
      extractThemes: (data: AiTypes.AiAssistRequest) =>
        apiClient.post<{ data: AiTypes.AiAssistResponse }>('/ai/assist/extract-themes', data),
    },
    rag: {
      search: (data: AiTypes.RagSearchRequest) =>
        apiClient.post<{ data: AiTypes.RagSearchResult[] }>('/ai/rag/search', data),
      ingest: (data: FormData) =>
        apiClient.post<{ data: { document_id: string; status: string } }>('/ai/rag/ingest', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      documents: {
        list: (params?: { status?: string }) =>
          apiClient.get<{ data: AiTypes.RagDocument[] }>('/ai/rag/documents', { params }),
        delete: (id: string) => apiClient.delete(`/ai/rag/documents/${id}`),
      },
    },
    prompts: {
      list: (params?: { agent_id?: string; is_active?: boolean }) =>
        apiClient.get<{ data: AiTypes.AiPrompt[] }>('/ai/prompts', { params }),
      get: (id: string) =>
        apiClient.get<{ data: AiTypes.AiPrompt }>(`/ai/prompts/${id}`),
    },
    metrics: {
      inferences: (params?: { agent?: string; date_from?: string; date_to?: string; page?: number; per_page?: number }) =>
        apiClient.get<ApiTypes.PaginatedResponse<AiTypes.AiInference>>('/ai/inferences', { params }),
      stats: () =>
        apiClient.get<{ data: AiTypes.AiMetrics }>('/ai/metrics'),
    },
  },
};

export type ApiClientType = typeof API;
