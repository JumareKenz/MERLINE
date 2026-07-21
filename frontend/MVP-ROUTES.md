# Merline MVP Routes — Complete Page Inventory (Phase 1)

## Module: Authentication & Org Management (5 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 1 | `/login` | LoginPage | Email/password authentication with optional MFA | POST /auth/login, GET /auth/me (for redirect) | LoginForm, AuthLayout, MFAInput | Public | Default, Loading, Error, MFA, RateLimited |
| 2 | `/register` | RegisterPage | New user registration with org code | POST /auth/register | RegisterForm, AuthLayout, PasswordStrength | Public | Default, Loading, Error, Success |
| 3 | `/forgot-password` | ForgotPasswordPage | Step 1: request reset email | POST /auth/forgot-password | EmailInput, AuthLayout | Public | Default, Loading, Error, Success |
| 4 | `/reset-password` | ResetPasswordPage | Step 2: set new password with token | POST /auth/reset-password | TokenInput, NewPasswordInput, AuthLayout | Public | Default, Loading, Error, Success |
| 5 | `/profile` | ProfilePage | View/edit profile, session management | GET /auth/me, PUT /auth/me, GET /auth/sessions, DELETE /auth/sessions/{id} | ProfileForm, AvatarUpload, ActiveSessionsList, NotificationPrefs | User | Default, Loading, Error, Saved |

## Module: Projects (3 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 6 | `/projects` | ProjectListPage | List all projects with search, filter, pagination | GET /projects (paginated, filterable) | SearchBar, FilterChips, ProjectGrid/Table, Paginator, CreateProjectFAB | Researcher+ | Default, Empty, Loading, Filtered, Error |
| 7 | `/projects/new` | CreateProjectPage | Create new project form | POST /projects | ProjectCreateForm, DateRangePicker, TagsInput | Researcher+ | Default, Loading, Error, Validation |
| 8 | `/projects/[id]` | ProjectDetailPage | Project overview with tabs | GET /projects/{id}, GET /projects/{id}/studies, GET /projects/{id}/indicators | ProjectInfoCard, KpiRow, StudyMiniList, ActivityFeed, ProjectTabs | Researcher+ | Default, Loading, Error, Empty (no studies) |

## Module: Studies (5 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 9 | `/studies` | StudyListPage | List all studies with filters | GET /studies (paginated, filterable) | SearchBar, FilterChips, StudyCardGrid, Paginator, CreateStudyFAB | Researcher+ | Default, Empty, Loading, Filtered, Error |
| 10 | `/studies/new` | CreateStudyPage | 5-step study creation wizard | POST /projects/{id}/studies (on submit); intermediate draft state saved | StepIndicator, TypeCardGrid, ObjectivesList, DateRangePicker, WizardNavigation | Researcher+ | Default, Loading, Error, Validation (per step), Draft recovery |
| 11 | `/studies/[id]` | StudyDetailPage | Study hub with 7 tabs | GET /studies/{id}, GET /studies/{id}/transitions | StatusBadge, LifecycleProgressBar, StudyInfoCard, StudyTabs, QuickActions | Researcher+ | Default, Loading, Error, Archived (banner) |
| 12 | `/studies/[id]?tab=settings` | StudySettingsPage | Edit study config, permissions, archive | PUT /studies/{id}, POST /studies/{id}/archive | EditForm, PermissionMatrix, ArchiveButton, ConfirmDialog | Researcher/Admin | Default, Loading, Error, ConfirmArchive |
| 13 | *(approval queue — inline in study detail)* | — | Study approval/rejection actions | POST /studies/{id}/transitions | Approve/Reject buttons, CommentInput | Manager+ | — |

## Module: Research Design / Indicators (3 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 14 | `/indicators/library` | IndicatorLibraryPage | Organization-wide indicator library | GET /indicators/library (paginated, filterable) | SearchBar, FilterChips, IndicatorTable, Paginator, CreateIndicatorButton | M&E Officer+ | Default, Empty, Loading, Error, Filtered |
| 15 | `/indicators/[id]` (also `/indicators/new`) | IndicatorDetailPage | View/edit single indicator | GET /indicators/{id}, POST /indicators, PUT /indicators/{id} | IndicatorForm (collapsible sections), VersionHistoryPanel, ButtonGroup | M&E Officer+ | Default, Loading, Error, ReadOnly (approved), Validation |
| 16 | `/studies/[id]?tab=indicators` | StudyIndicatorListPage | Indicators linked to a study | GET /studies/{studyId}/indicators, POST /studies/{studyId}/indicators | LinkedIndicatorTable (with RAG), LinkFromLibraryButton, CreateNewButton | Researcher+ | Default, Empty, Loading, Error |

## Module: Questionnaires (5 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 17 | `/questionnaires` | QuestionnaireLibraryPage | Browse all questionnaires | GET /studies/{studyId}/questionnaires (paginated) | SearchBar, FilterChips, QuestionnaireTable, CreateButton | M&E Officer+ | Default, Empty, Loading, Error |
| 18 | `/questionnaires/new` *(redirects to edit)* | — | Create new, init form builder | POST /questionnaires → redirect to /questionnaires/{id}/edit | QuestionnaireCreateForm (name, type, language) | M&E Officer+ | Default, Loading, Error |
| 19 | `/questionnaires/[id]/edit` | FormBuilderPage | **Full-screen 3-panel form builder** | GET /questionnaires/{id} (full tree), GET/PUT sections, questions, options, skip logic, translations, validation rules | FormBuilderLayout (Palette, Canvas, PropertiesPanel, Toolbar) | M&E Officer+ | Default, Empty, Loading, Dirty, AutoSave, Error, Edge: 500+ questions virtualized |
| 20 | `/questionnaires/[id]/preview` | FormPreviewPage | Interactive mobile/web preview | GET /questionnaires/{id}/preview | DeviceToggle, LanguageSwitcher, FormRenderer (interactive) | M&E Officer+ | Default, Empty, Loading, Error |
| 21 | `/questionnaires/[id]/review` | FormReviewPage | Peer review with inline comments | GET /questionnaires/{id} (read-only), POST /questionnaires/{id}/comment | ReadOnlyQuestionList, CommentThread (per question), ReviewActions | M&E Officer+ | Default, Loading, Error |
| * | `/questionnaires/[id]/deploy` | FormDeployPage | Publish and assign to enumerators | POST /questionnaires/{id}/publish, POST /assignments/bulk | VersionSelector, EnumeratorTeamPicker, TargetCountInput, DeployButton | Researcher+ | Default, Loading, Success, Error, Re-deploy warning |

## Module: Data Collection (8 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 22 | `/studies/[id]?tab=data-collection&section=assignments` | AssignmentsOverviewPage | View/create assignments | GET /studies/{studyId}/assignments | AssignmentTable, CreateAssignmentButton, BulkActionBar | Supervisor+ | Default, Empty, Loading, Error, Filtered |
| 23 | *(new assignment as modal or inline)* | CreateAssignmentPage | Create assignment for enumerators | POST /studies/{studyId}/assignments | QuestionnaireSelect, EnumeratorPicker, TargetCountInput, DueDatePicker | Supervisor+ | Default, Loading, Error |
| 24 | `/studies/[id]?tab=data-collection&section=submissions` | SubmissionViewerPage | Browse all submissions with filters | GET /submissions (paginated, filterable by study) | FilterBar, SubmissionTable (virtualized), BulkActionBar, Paginator | Supervisor+ | Default, Empty, Loading, Error, Filtered |
| 25 | `/data-collection/submissions/[id]` | SubmissionDetailPage | View submission responses + review | GET /submissions/{submissionId}, POST /submissions/{id}/approve, POST /submissions/{id}/reject | ResponseList, MetadataPanel, QualityFlagsPanel, ReviewActions | Supervisor+ | Default, Loading, Error, NotFound |
| 26 | `/data-collection/enumerators/[id]` | EnumeratorPerformancePage | Enumerator metrics dashboard | GET /supervisor/dashboard, GET /enumerator/{id}/performance | EnumeratorSelector, KpiRow, TrendChart, QualityBreakdownChart | Supervisor+ | Default, Empty, Loading, Error |
| 27 | `/studies/[id]?tab=data-collection&section=sync` | SyncMonitorPage | Device sync health | GET /devices/sync-status | DeviceStatusTable, ErrorLogTable, SyncSummaryBar | Supervisor/Admin | Default, Empty, Loading, Error |
| 28 | *(mobile — not a web page)* | MobileHome | Enumerator dashboard (Flutter) | GET /enumerator/dashboard | AssignmentCards, SyncBadge, QuickActions | Enumerator | Default, Empty, Loading, Offline, Error |
| 29 | *(mobile)* | MobileSurveyForm | Question-by-question capture (Flutter) | Offline-only; sync on connect | QuestionInputWidgets, ProgressBar, MediaCapture | Enumerator | Default, Loading, Validation, Offline, Crash recovery |
| 30 | *(mobile)* | MobileSyncPage | Pending/complete sync list (Flutter) | GET /sync/pull, POST /sync/push | PendingList, SyncProgressBar, RetryButtons | Enumerator | Default, Empty, Syncing, Error, Offline |

## Module: Dashboards (4 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 31 | `/dashboard` | ExecutiveDashboardPage | Organization-wide KPIs | GET /dashboard/executive (aggregated) | DateRangeSelector, KpiRow, DashboardGrid (Map, Indicators, Activity, Alerts) | All roles | Default, Empty (welcome), Loading (widget skeletons), Error (per widget) |
| 32 | `/studies/[id]?tab=dashboard` | StudyDashboardPage | Auto-generated study metrics | GET /studies/{id}/dashboard/summary, GET /studies/{id}/dashboard/indicators, GET /studies/{id}/dashboard/trends | KpiRow, SubmissionCounter, QualityGauge, IndicatorCards, Map, EnumeratorTable | Researcher+ | Default, Empty (no data), Loading, PartialData, Error |
| 33 | `/studies/[id]/indicators/[indId]` | IndicatorDetailPage | Deep dive one indicator | GET /indicators/{id}/values, GET /indicators/{id}/trends | KpiCard, TrendChart, BarChart, DisaggregationCharts, DataTable | Researcher+ | Default, Empty (no data), Loading, Error, Insufficient data |
| 34 | `/data-collection/enumerators/[id]` | EnumeratorPerformancePage | *(same as #26 — already counted)* | — | — | — | — |

## Module: Reports (4 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 35 | `/reports` | ReportLibraryPage | Browse reports + templates tab | GET /reports, GET /report-templates | SearchBar, FilterChips, ReportTable, Tabs (Reports/Templates), GenerateButton | Manager+ | Default, Empty, Loading, Error |
| 36 | `/reports/generate` | GenerateReportPage | 5-step report generation wizard | GET /report-templates, GET /studies/{id}/indicators, POST /reports/generate | TemplateCardGrid, IndicatorCheckboxList, GenerationProgress, WizardNavigation | Manager+ | Default, Loading, Generating, Error, Partial data warning |
| 37 | `/reports/[id]` *(or `/reports/[id]/edit`)* | ReportEditorPage | Review/edit generated report | GET /reports/{id}, PUT /reports/{id}/sections | SectionSidebar, ContentArea (Rich Text + Charts), Toolbar (Save/Finalize/Export) | Manager+ | Default, Loading, Editing, Error, Finalized |
| 38 | `/reports/templates` | TemplateGalleryPage | Browse report templates | GET /report-templates | TemplateCardGrid, PreviewOverlay, UseTemplateButton | Manager+ | Default, Loading, Empty, Error |

## Module: Administration (5 pages)

| # | Route | Page | Description | Data Requirements | Key Components | Auth | States |
|---|-------|------|-------------|-------------------|----------------|------|--------|
| 39 | `/admin/users` | UserManagementPage | List, search, filter users | GET /organizations/{id}/members | UserTable, InviteButton, BulkActionBar, StatusBadges | Admin | Default, Empty, Loading, Error, Filtered |
| 40 | `/admin/users/invite` | InviteUsersPage | Invite one or multiple users | POST /organizations/{id}/members | EmailInput (single/bulk), RoleSelect, TeamSelect, MessageInput, SummaryPreview | Admin | Default, Loading, Error (per email), Success |
| 41 | `/admin/settings` | OrganizationSettingsPage | Org profile, branding, locale, security | GET /organizations/{id}, PUT /organizations/{id} | OrgProfileForm, LogoUpload, LanguageSelect, TimezoneSelect, MFA Toggle | Admin | Default, Loading, Error, Saved |
| 42 | `/admin/roles` | RolesPermissionsPage | View/edit role permissions | GET /roles, PUT /roles/{id}/permissions | RoleList, PermissionMatrix (module × action), SaveButton, ResetButton | Admin | Default, Loading, Error, Confirmation (active users) |
| 43 | `/admin/activity-log` | ActivityLogPage | Audit trail viewer | GET /audit-log (paginated, filterable) | LogTable, FilterBar, ExportButton, Paginator | Admin | Default, Empty, Loading, Error, Filtered |

## Summary

| Module | Pages | Auth Level |
|--------|-------|------------|
| Authentication | 4 (+1 profile) | Public / Authenticated |
| Projects | 3 | Researcher+ |
| Studies | 5 | Researcher+ |
| Research Design | 3 | M&E Officer+ |
| Questionnaires | 5 | M&E Officer+ |
| Data Collection | 8 | Supervisor+ / Enumerator (mobile) |
| Dashboards | 3 | All roles |
| Reports | 4 | Manager+ |
| Administration | 5 | Admin |
| **Total** | **41 web pages** | |

### Dependencies Between Pages

```
Login → Dashboard (or redirect to previous page)
Dashboard → Project List → Project Detail
Project Detail → Study List → Study Detail
Study Detail → Indicator Library / Study Indicators
Study Detail → Questionnaire Library / Form Builder
Form Builder → Preview / Review / Deploy
Deploy → Data Collection (Assignments)
Data Collection → Submissions → Submission Detail
Submission Detail → Enumerator Performance
Study Detail → Study Dashboard → Indicator Detail
Study Detail → Report Library → Generate Report → Report Editor
Administration → Users / Roles / Settings / Activity Log
```
