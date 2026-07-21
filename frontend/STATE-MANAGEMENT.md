# Merline State Management Architecture

## State Layer Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               SERVER STATE (TanStack Query v5)                │   │
│  │                                                               │   │
│  │  Persist: React Query Cache (memory)                          │   │
│  │  Strategy: stale-while-revalidate + background refetch        │   │
│  │  Cache invalidation: mutation → onSuccess → invalidate tags   │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │   │
│  │  │ Auth        │  │ Resources    │  │ Dashboard Data   │    │   │
│  │  │ (session,   │  │ (projects,   │  │ (aggregated KPI, │    │   │
│  │  │  profile)   │  │  studies,    │  │  chart bucketed, │    │   │
│  │  │             │  │  indicators, │  │  geo data)       │    │   │
│  │  │ key: ['me'] │  │  qnrs,       │  │                  │    │   │
│  │  │             │  │  submissions,│  │ key: ['dash',    │    │   │
│  │  │             │  │  reports)    │  │      'study', id]│    │   │
│  │  │             │  │              │  │                  │    │   │
│  │  │             │  │ key: ['res', │  │ key: ['dash',    │    │   │
│  │  │             │  │  type', id]  │  │      'exec']     │    │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘    │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               CLIENT STATE (Zustand)                        │   │
│  │                                                               │   │
│  │  Persist: some stores persisted to localStorage               │   │
│  │  Structure: slices per domain, composed via `create`          │   │
│  │                                                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │   │
│  │  │ UI Store      │  │ Form Builder  │  │ Dashboard        │    │   │
│  │  │ • sidebar     │  │ Store         │  │ Store            │    │   │
│  │  │ • theme       │  │ • canvas      │  │ • current filters│    │   │
│  │  │ • preferences │  │ • undo/redo   │  │ • drill-down     │    │   │
│  │  │ • modal stack │  │ • autosave    │  │   breadcrumb     │    │   │
│  │  └──────────────┘  │ • selection    │  │ • widget layout   │    │   │
│  │                     └──────────────┘  └──────────────────┘    │   │
│  │  ┌──────────────┐  ┌──────────────┐                           │   │
│  │  │ Offline       │  │ Notification  │                           │   │
│  │  │ Store         │  │ Store         │                           │   │
│  │  │ • sync queue  │  │ • unread      │                           │   │
│  │  │ • pending     │  │   count       │                           │   │
│  │  │   actions     │  │ • preferences │                           │   │
│  │  │ • last sync   │  └──────────────┘                           │   │
│  │  └──────────────┘                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               FORM STATE (React Hook Form + Zod)              │   │
│  │                                                               │   │
│  │  Scope: Per-form instance, scoped to component                │   │
│  │  Persist: localStorage for wizard forms (crash recovery)      │   │
│  │  Validation: Zod schema → form errors on blur/submit          │   │
│  │                                                               │   │
│  │  Forms:                                                        │   │
│  │  • StudyCreateWizard (5 steps, validated per step)             │   │
│  │  • ProjectCreateForm                                           │   │
│  │  • IndicatorForm                                                │   │
│  │  • ReportGenerateWizard                                         │   │
│  │  • UserInviteForm                                               │   │
│  │  • OrganizationSettingsForm                                     │   │
│  │  • ProfileForm                                                  │   │
│  │  • QuestionProperties (within form builder)                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               URL STATE (Next.js searchParams)               │   │
│  │                                                               │   │
│  │  Persist: URL (bookmarkable, shareable)                       │   │
│  │  Scope: filters, pagination, sort, tab, section               │   │
│  │                                                               │   │
│  │  ?page=1&per_page=25&sort=-created_at&status=active           │   │
│  │  ?tab=indicators&section=assignments&view=table               │   │
│  │  ?date_range=last_30d&region=Northern&disaggregation=gender   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               AUTH STATE (NextAuth.js)                       │   │
│  │                                                               │   │
│  │  Persist: HTTP-only cookie (JWT), memory (session object)    │   │
│  │  Scope: user, token, permissions                              │   │
│  │  Refresh: silent token refresh via middleware                  │   │
│  │                                                               │   │
│  │  useSession() → { user, token, expires }                       │   │
│  │  usePermissions() → { canView, canEdit, canDelete, ... }       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Server State (TanStack Query)

### Query Key Convention

```typescript
// [domain, entityType, ...identifiers, ...params]
const queryKeys = {
  me: ['auth', 'me'] as const,
  projects: {
    all: ['projects'] as const,
    list: (params: ProjectFilterParams) => ['projects', 'list', params] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    studies: (projectId: string) => ['projects', projectId, 'studies'] as const,
  },
  studies: {
    all: ['studies'] as const,
    list: (params: StudyFilterParams) => ['studies', 'list', params] as const,
    detail: (id: string) => ['studies', 'detail', id] as const,
    indicators: (studyId: string) => ['studies', studyId, 'indicators'] as const,
    questionnaires: (studyId: string) => ['studies', studyId, 'questionnaires'] as const,
    assignments: (studyId: string) => ['studies', studyId, 'assignments'] as const,
    submissions: (studyId: string) => ['studies', studyId, 'submissions'] as const,
  },
  questionnaires: {
    all: ['questionnaires'] as const,
    detail: (id: string) => ['questionnaires', 'detail', id] as const,
    sections: (qnrId: string) => ['questionnaires', qnrId, 'sections'] as const,
    preview: (qnrId: string) => ['questionnaires', qnrId, 'preview'] as const,
  },
  indicators: {
    library: (params: IndicatorFilterParams) => ['indicators', 'library', params] as const,
    detail: (id: string) => ['indicators', 'detail', id] as const,
  },
  submissions: {
    detail: (id: string) => ['submissions', 'detail', id] as const,
  },
  dashboard: {
    executive: (params: DashboardFilterParams) => ['dashboard', 'executive', params] as const,
    study: (studyId: string, params: DashboardFilterParams) => ['dashboard', 'study', studyId, params] as const,
    indicator: (indicatorId: string, params: IndicatorFilterParams) => ['dashboard', 'indicator', indicatorId, params] as const,
  },
  reports: {
    all: ['reports'] as const,
    list: (params: ReportFilterParams) => ['reports', 'list', params] as const,
    detail: (id: string) => ['reports', 'detail', id] as const,
  },
  admin: {
    users: (params: UserFilterParams) => ['admin', 'users', params] as const,
    roles: ['admin', 'roles'] as const,
    activityLog: (params: ActivityLogParams) => ['admin', 'activity-log', params] as const,
  },
} as const;
```

### Mutation Invalidation Strategy

```typescript
// Pattern: after mutation → invalidate related queries
const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectDto) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
```

### Optimistic Updates

```typescript
// Used for: status changes, approvals, flags, reorders
const useApproveSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => api.post(`/submissions/${submissionId}/approve`),
    onMutate: async (submissionId) => {
      await queryClient.cancelQueries({ queryKey: ['submissions', 'detail', submissionId] });
      const previous = queryClient.getQueryData(['submissions', 'detail', submissionId]);
      queryClient.setQueryData(['submissions', 'detail', submissionId], (old: Submission) => ({
        ...old,
        status: 'approved',
      }));
      return { previous };
    },
    onError: (err, submissionId, context) => {
      queryClient.setQueryData(['submissions', 'detail', submissionId], context?.previous);
    },
    onSettled: (submissionId) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
};
```

---

## Client State (Zustand)

### UI Store

```typescript
interface UIStore {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  // Theme
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark'; // computed
  // Preferences
  recentStudies: string[]; // UUIDs, max 5
  // Modal stack
  activeModal: { type: string; props: Record<string, unknown> } | null;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  addRecentStudy: (studyId: string) => void;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}
```

### Form Builder Store

```typescript
interface FormBuilderStore {
  // Canvas
  questions: Question[];
  sections: Section[];
  selectedQuestionId: string | null;
  expandedSections: Set<string>;

  // Undo/Redo (max 50)
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];

  // Save state
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSavedAt: number | null;
  version: number;

  // Actions
  addQuestion: (type: QuestionType, sectionId: string, index: number) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  reorderQuestion: (id: string, toIndex: number) => void;
  selectQuestion: (id: string | null) => void;
  addSection: (title: string) => void;
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;
  setSaveStatus: (status: FormBuilderStore['saveStatus']) => void;
}
```

### Dashboard Store

```typescript
interface DashboardStore {
  filters: DashboardFilters;
  drillDownBreadcrumb: Array<{ label: string; params: Partial<DashboardFilters> }>;
  widgetLayout: Record<string, WidgetLayout>;

  setDateRange: (range: DateRange) => void;
  addDimensionFilter: (dimension: string, value: string) => void;
  removeDimensionFilter: (index: number) => void;
  resetFilters: () => void;
  pushDrillDown: (label: string, filters: Partial<DashboardFilters>) => void;
  popDrillDown: () => void;
  updateWidgetLayout: (widgetId: string, layout: Partial<WidgetLayout>) => void;
}
```

### Offline Store

```typescript
interface OfflineStore {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';

  setOnline: (online: boolean) => void;
  addPendingAction: (action: OfflineAction) => void;
  removePendingAction: (id: string) => void;
  clearPendingActions: () => void;
  setSyncStatus: (status: OfflineStore['syncStatus']) => void;
}
```

---

## Form State (React Hook Form + Zod)

### Pattern

```typescript
// 1. Define Zod schema
const studyCreateSchema = z.object({
  title: z.string().min(5).max(500),
  studyType: z.enum(['baseline', 'midline', 'endline', ...]),
  methodology: z.enum(['quantitative', 'qualitative', 'mixed']),
  objectives: z.array(z.string().min(10)).min(1),
  startDate: z.string().refine((d) => new Date(d) > new Date(), 'Must be in the future'),
  endDate: z.string(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// 2. Use in component
function StudyCreateForm() {
  const form = useForm<z.infer<typeof studyCreateSchema>>({
    resolver: zodResolver(studyCreateSchema),
    defaultValues: { objectives: [] },
    mode: 'onBlur', // validate on blur, not on change
  });

  const onSubmit = (data: z.infer<typeof studyCreateSchema>) => {
    // mutation call
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField ... />
      </form>
    </Form>
  );
}
```

### Form Persistence (Crash Recovery)

```typescript
// Wizard forms: auto-save to localStorage
useEffect(() => {
  const subscription = form.watch((values) => {
    localStorage.setItem(`form-draft-${formId}`, JSON.stringify(values));
  });
  return () => subscription.unsubscribe();
}, [form.watch]);

// On mount: restore from localStorage
useEffect(() => {
  const draft = localStorage.getItem(`form-draft-${formId}`);
  if (draft) {
    const parsed = JSON.parse(draft);
    form.reset(parsed);
    toast.info('Unsaved draft restored');
  }
}, []);
```

---

## URL State (Search Params)

### Pattern

```typescript
// Read search params from URL
function ProjectListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? undefined;
  const sort = searchParams.get('sort') ?? '-created_at';

  // Update search params
  const setFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1'); // reset page on filter change
    router.replace(`${pathname}?${params.toString()}`);
  };

  return <ProjectListClient page={page} status={status} sort={sort} onFilter={setFilters} />;
}
```

### Search Params Per Page Type

| Page Type | URL Params |
|-----------|-----------|
| List page | `page`, `per_page`, `sort`, `search`, `status` |
| Detail with tabs | `tab`, `section` |
| Dashboard | `date_range`, `from`, `to`, `disaggregation`, `dimension` |
| Form preview | `language`, `device` |
| Report generation | `template`, `study`, `step` |

---

## Auth State (NextAuth.js)

```typescript
// src/lib/auth.ts — NextAuth.js v5 configuration
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return null;
        const user = await res.json();
        return { id: user.data.user.id, email: user.data.user.email, token: user.data.token };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.accessToken = user.token; }
      return token;
    },
    async session({ session, token }) {
      session.token = token.accessToken;
      return session;
    },
  },
});
```

---

## Real-Time State (Phase 2 Architecture)

```typescript
// WebSocket/SSE connection managed by a singleton
class RealtimeConnection {
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(token: string) {
    this.eventSource = new EventSource(`/api/v1/realtime?token=${token}`);
    this.eventSource.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this.subscribers.get(type)?.forEach((cb) => cb(data));
    };
  }

  subscribe(event: string, callback: (data: unknown) => void) {
    if (!this.subscribers.has(event)) this.subscribers.set(event, new Set());
    this.subscribers.get(event)!.add(callback);
    return () => this.subscribers.get(event)?.delete(callback);
  }

  disconnect() {
    this.eventSource?.close();
    this.subscribers.clear();
  }
}
```

---

## Offline State (Service Worker — Phase 2 Architecture)

```typescript
// Service worker cache strategies
const CACHE_STRATEGIES = {
  // Network-first with fallback to cache
  'api/projects': networkFirst({ cacheName: 'projects', maxEntries: 50 }),
  'api/studies': networkFirst({ cacheName: 'studies', maxEntries: 100 }),

  // Cache-first (static assets)
  '/_next/static': cacheFirst({ cacheName: 'static-assets' }),

  // Stale-while-revalidate (user data that changes)
  'api/auth/me': staleWhileRevalidate({ cacheName: 'user-profile' }),

  // Network-only (submissions, must go to server)
  'api/submissions': networkOnly(),
};
```
