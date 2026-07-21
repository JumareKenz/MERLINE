# Merline Frontend Architecture

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14+ (App Router, React Server Components) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS + CSS Modules for complex overrides |
| UI Primitives | shadcn/ui (Radix UI) — composable, accessible, headless |
| Client State | Zustand (stores per domain, slices pattern) |
| Server State | TanStack Query v5 (queries, mutations, cache invalidation) |
| Forms | React Hook Form + Zod (type-safe schemas, resolver integration) |
| Tables | TanStack Table v8 (virtualized, sortable, filterable, resizable columns) |
| Charts | Apache ECharts (via echarts-for-react wrapper) |
| Maps | MapLibre GL JS (via react-map-gl) |
| Animation | Framer Motion (layout animations, page transitions, micro-interactions) |
| Icons | Lucide React |
| Auth | NextAuth.js v5 (credentials provider + JWT strategy) |
| API Client | Axios instance with TanStack Query integration |
| Testing | Vitest (unit/component) + Playwright (E2E) + MSW (API mocking) |
| i18n | next-intl (file-based messages, ICU syntax) |
| Drag & Drop | dnd-kit (form builder, dashboard grid) |
| Virtualization | TanStack Virtual (large lists, submission tables) |

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Route group: unauthenticated
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/              # Route group: authenticated shell
│   │   ├── layout.tsx            # Sidebar + TopBar + Main content
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── studies/
│   │   ├── questionnaires/
│   │   ├── data-collection/
│   │   ├── reports/
│   │   ├── admin/
│   │   └── profile/
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   └── layout.tsx                # Root layout: providers, fonts
│
├── components/                   # Shared component library
│   ├── ui/                       # shadcn/ui primitives (button, input, dialog, etc.)
│   ├── layout/                   # Sidebar, TopBar, Breadcrumbs, MainContent
│   ├── data-table/               # TanStack Table wrapper, pagination, filters
│   ├── charts/                   # ECharts wrapper components
│   ├── forms/                    # Form builder components (palette, canvas, properties)
│   ├── dashboard/                # Dashboard grid, widgets, filter bar
│   ├── maps/                     # MapLibre wrapper, markers, heatmap layer
│   ├── navigation/              # Tabs, SteppedWizard, Accordion
│   ├── feedback/                # Toast, Alert, EmptyState, ErrorBoundary
│   ├── media/                   # Photo capture, Audio recorder, Signature pad
│   └── shared/                  # Avatar, Badge, StatusDot, KPI, ProgressBar
│
├── features/                     # Feature modules (domain-aligned)
│   ├── auth/                    # Login, register, password reset, session
│   ├── organizations/           # Org profile, teams, members
│   ├── projects/                # Project CRUD, list, detail
│   ├── studies/                 # Study CRUD, lifecycle, clone
│   ├── indicators/              # Indicator CRUD, library, linking
│   ├── questionnaires/          # Form builder, preview, review, deploy
│   ├── data-collection/         # Assignments, submissions, sync
│   ├── dashboards/              # Executive, project, study dashboards
│   ├── reports/                 # Report generation, viewer, templates
│   ├── admin/                   # Users, roles, permissions, activity log
│   └── notifications/           # Notification center, preferences
│
├── lib/                          # Utilities and configurations
│   ├── api/                     # Axios instance, API client, endpoint map
│   ├── auth/                    # NextAuth config, JWT helpers, middleware
│   ├── validation/              # Zod schemas (shared with forms)
│   ├── i18n/                    # next-intl config, locale messages
│   ├── utils/                   # cn(), date helpers, formatters
│   └── constants/              # Routes, permissions, enums, config
│
├── hooks/                        # Shared custom hooks
│   ├── use-debounce.ts
│   ├── use-media-query.ts
│   ├── use-online-status.ts
│   ├── use-autosave.ts
│   ├── use-before-unload.ts
│   ├── use-keyboard-shortcut.ts
│   └── use-permissions.ts
│
├── providers/                    # React context providers
│   ├── query-provider.tsx        # TanStack Query client + devtools
│   ├── theme-provider.tsx        # next-themes dark/light/system
│   ├── auth-provider.tsx         # Session context
│   ├── locale-provider.tsx       # next-intl provider
│   └── websocket-provider.tsx    # SSE/WebSocket connection (Phase 2)
│
├── stores/                       # Zustand stores
│   ├── ui-store.ts              # Sidebar state, theme, preferences
│   ├── form-builder-store.ts    # Canvas state, undo/redo, autosave
│   ├── dashboard-store.ts       # Widget layout, filters, drill-down
│   └── offline-store.ts         # Offline queue, sync status
│
├── types/                        # TypeScript type definitions
│   ├── api/                     # API response types, pagination
│   ├── domain/                  # Domain entity types (mirrors MERL domain model)
│   ├── forms/                   # Form builder types
│   └── enums.ts                 # Shared enums
│
├── middleware.ts                 # Next.js middleware (auth, redirects)
│
└── styles/                       # Global styles
    ├── globals.css               # Tailwind directives, CSS variables
    └── a11y.css                  # Focus styles, reduced motion
```

---

## Component Hierarchy & Organization

### Component Types

| Layer | Description | Example |
|-------|-------------|---------|
| **UI Primitives** | Atomic, generic, design-system tokens | `Button`, `Input`, `Dialog`, `Select`, `Badge` |
| **Composite** | Multi-primitive, reusable patterns | `DataTable`, `FilterBar`, `Paginator`, `Toast` |
| **Feature** | Domain-specific, single-responsibility | `StudyCreateWizard`, `FormCanvas`, `IndicatorCard` |
| **Page** | Composes features for a route | `ProjectDetailPage`, `StudyDashboardPage` |
| **Layout** | Structural wrappers | `AuthLayout`, `DashboardLayout`, `FormBuilderLayout` |

### Component Rules

- Every component in `components/ui/` maps 1:1 to a shadcn/ui or Radix primitive
- Feature components live in `features/{module}/components/`
- No component shall be duplicated — if used in >1 module, hoist to `components/shared/`
- Every component has a story/stub for visual regression
- Server components by default; client components only when interactivity required

---

## State Management Architecture

```
┌────────────────────────────────────────────────────────┐
│                    STATE LAYERS                         │
│                                                        │
│  SERVER STATE (TanStack Query)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Queries: cached, stale-while-revalidate, refetch  │  │
│  │ Mutations: optimistic updates, rollback on error  │  │
│  │ Cache: normalized via queryClient.setQueryData    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  CLIENT STATE (Zustand)                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ UI: sidebar open/closed, theme, active filters    │  │
│  │ Form Builder: canvas, undo stack, autosave timer  │  │
│  │ Dashboard: widget layout, drill-down breadcrumb   │  │
│  │ Offline: pending actions, sync queue              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  FORM STATE (React Hook Form + Zod)                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Per-form: watched values, dirty fields, errors    │  │
│  │ Persisted to localStorage for crash recovery      │  │
│  │ Validation: Zod schema → form errors on blur      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  URL STATE (Next.js searchParams)                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Filters: ?status=active&sort=-created_at          │  │
│  │ Pagination: ?page=1&per_page=25                  │  │
│  │ Tab state: ?tab=questionnaires                  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### TanStack Query Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s before considered stale
      gcTime: 5 * 60_000,       // 5min garbage collection
      retry: 2,                 // retry twice on failure
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

### Zustand Store Pattern

```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

---

## Authentication Flow

```
1. Request arrives → middleware.ts checks token
2. No token → redirect to (auth)/login
3. Token exists → verify JWT signature + expiry
4. Token valid → attach session to request headers, continue
5. Token expired → attempt refresh via /auth/refresh
6. Refresh fails → clear cookies, redirect to login
7. Route loads → session available via useSession() hook
8. Protected routes → check permissions via usePermissions()
9. Permission denied → redirect to 403 or show forbidden state
```

### Middleware Architecture

```typescript
// src/middleware.ts
export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password).*)',
  ],
};
```

---

## API Client Layer

```typescript
// src/lib/api/client.ts
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Request interceptor: attach auth token
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// Response interceptor: unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ redirect: true, callbackUrl: '/login' });
    }
    return Promise.reject(normalizeError(error));
  }
);
```

### Endpoint Map Pattern

```typescript
// src/lib/api/endpoints.ts
export const API = {
  auth: {
    login: (data: LoginDto) => apiClient.post<AuthResponse>('/auth/login', data),
    me: () => apiClient.get<UserResponse>('/auth/me'),
  },
  projects: {
    list: (params?: ProjectFilterParams) =>
      apiClient.get<PaginatedResponse<Project>>('/projects', { params }),
    create: (data: CreateProjectDto) => apiClient.post<Project>('/projects', data),
  },
} as const;
```

---

## Error Boundary Hierarchy

```
RootErrorBoundary (app/error.tsx)
├── AuthErrorBoundary
│   └── LoginErrorBoundary
├── DashboardErrorBoundary (app/(dashboard)/error.tsx)
│   ├── SidebarErrorBoundary
│   ├── MainContentErrorBoundary
│   │   ├── PageErrorBoundary
│   │   │   ├── WidgetErrorBoundary (per dashboard widget)
│   │   │   ├── TableErrorBoundary
│   │   │   └── FormErrorBoundary
│   │   └── SectionErrorBoundary
│   └── TopBarErrorBoundary
└── FormBuilderErrorBoundary (isolated, full-screen)
```

Each error boundary renders a fallback with:
- Error illustration
- Human-readable message
- "Try again" / "Go back" actions
- Error reference code for support

---

## Internationalization

- **Library**: next-intl
- **Message format**: ICU syntax (select, plural, number, date)
- **File structure**: `messages/{locale}.json` per locale
- **Supported locales**: `en` (default), `fr`, `es`, `sw`, `ar` (RTL)
- **Locale detection**: `Accept-Language` header + user preference → cookie
- **Server Components**: `import { useTranslations } from 'next-intl'`
- **Client Components**: `import { useTranslations } from 'next-intl/client'`
- **Number/Date formatting**: `useFormatter()` for localized output

---

## Test Infrastructure

```
tests/
├── unit/                        # Vitest unit tests
│   ├── components/              # UI primitive tests
│   ├── hooks/                   # Custom hook tests
│   ├── stores/                  # Zustand store tests
│   ├── lib/                     # Utility tests
│   └── validation/              # Zod schema tests
├── integration/                 # Vitest integration tests
│   ├── api/                     # MSW-handled API flow tests
│   └── features/                # Feature workflow tests
├── e2e/                         # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── projects.spec.ts
│   ├── questionnaires.spec.ts
│   ├── data-collection.spec.ts
│   ├── dashboards.spec.ts
│   └── reports.spec.ts
├── visual/                      # Playwright visual regression
│   └── components.spec.ts       # Screenshot diffs per component
├── setup.ts                     # Vitest global setup (MSW server)
└── helpers.ts                   # Test utilities, factory functions
```

### MSW Integration

```typescript
// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 2,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```
