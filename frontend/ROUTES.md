# Merline Route Design

## Route Tree

```
/                                    → Redirect to /dashboard (authenticated) or /login
├── (auth)/                         → Auth route group (no sidebar, centered layout)
│   ├── /login                      → Login form
│   ├── /register                   → Registration form
│   ├── /forgot-password            → Password reset (step 1: email)
│   ├── /reset-password             → Password reset (step 2: token + new password)
│   └── /verify-email               → Email verification success
│
├── (dashboard)/                    → Authenticated route group (sidebar + topbar layout)
│   ├── /dashboard                  → Executive dashboard
│   │
│   ├── /projects                   → Project list
│   ├── /projects/new               → Create project
│   ├── /projects/[projectId]       → Project detail (overview tab)
│   │   ├── ?tab=overview           → Project overview (default)
│   │   ├── ?tab=studies            → Studies within project
│   │   ├── ?tab=indicators         → Project-level indicators
│   │   ├── ?tab=team               → Project team members
│   │   └── ?tab=settings           → Project settings
│   │
│   ├── /studies                    → Study list (all accessible)
│   ├── /studies/new                → Create study (5-step wizard)
│   ├── /studies/[studyId]          → Study detail (overview tab)
│   │   ├── ?tab=overview           → Study overview (default)
│   │   ├── ?tab=indicators         → Study indicators (linked list)
│   │   ├── ?tab=questionnaires     → Questionnaire list for study
│   │   ├── ?tab=data-collection    → Data collection hub
│   │   │   ├── ?section=assignments    → Assignments panel (default)
│   │   │   ├── ?section=submissions    → Submissions panel
│   │   │   ├── ?section=enumerators    → Enumerator performance
│   │   │   └── ?section=sync           → Sync monitor
│   │   ├── ?tab=dashboard          → Auto-generated study dashboard
│   │   ├── ?tab=reports            → Study reports list
│   │   └── ?tab=settings           → Study settings
│   │
│   │   └── /studies/[studyId]/indicators/[indicatorId]
│   │                               → Indicator detail dashboard
│   │
│   ├── /questionnaires             → Questionnaire library
│   ├── /questionnaires/new         → Create questionnaire → Form Builder
│   ├── /questionnaires/[id]/edit   → Form Builder (full-screen)
│   ├── /questionnaires/[id]/preview
│   │                               → Form preview (mobile + web)
│   ├── /questionnaires/[id]/review → Form review & approval
│   ├── /questionnaires/[id]/deploy → Form deployment
│   │
│   ├── /indicators/library         → Organization indicator library
│   ├── /indicators/[indicatorId]   → Indicator detail
│   │
│   ├── /data-collection            → Data collection hub (supervisor)
│   │   ├── /data-collection/assignments    → Assignment overview
│   │   ├── /data-collection/assignments/new → Create assignment
│   │   ├── /data-collection/submissions    → Submission viewer
│   │   ├── /data-collection/submissions/[submissionId]
│   │   │                               → Submission detail
│   │   ├── /data-collection/enumerators   → Enumerator list
│   │   └── /data-collection/enumerators/[enumeratorId]
│   │                                   → Enumerator performance detail
│   │
│   ├── /reports                    → Report library
│   ├── /reports/generate           → Report generation wizard
│   ├── /reports/[reportId]         → Report viewer
│   ├── /reports/[reportId]/edit    → Report editor
│   ├── /reports/templates          → Template gallery
│   │
│   ├── /admin/settings             → Organization settings
│   ├── /admin/users                → User management
│   ├── /admin/users/invite         → Invite users
│   ├── /admin/users/[userId]       → User detail
│   ├── /admin/teams                → Team management
│   ├── /admin/teams/new            → Create team
│   ├── /admin/teams/[teamId]       → Team detail
│   ├── /admin/roles                → Roles & permissions
│   ├── /admin/activity-log         → Activity log
│   └── /admin/indicator-library    → Organization indicator library
│
├── /profile                        → User profile & preferences
├── /notifications                  → Notification center
└── /help                           → Help & support
```

**Total routes (MVP): ~45 pages/screens**

---

## Route Groups and Layout Nesting

```
RootLayout                                         ← Providers (Query, Theme, Auth, Locale)
├── (auth)/layout.tsx                              ← Centered card layout, no sidebar
│   └── page.tsx                                   ← Login, Register, Forgot/Reset Password
│
└── (dashboard)/layout.tsx                         ← Authenticated shell
    ├── Sidebar
    ├── TopBar (Breadcrumb + Tabs + Actions)
    └── <main>
        ├── dashboard/layout.tsx                   ← Dashboard-specific sidebar?
        │   └── page.tsx
        │
        ├── projects/layout.tsx                    ← Project context layout (breadcrumb prefix)
        │   ├── page.tsx                           ← /projects (list)
        │   ├── new/page.tsx                       ← /projects/new
        │   └── [projectId]/layout.tsx             ← Project detail layout (tabs)
        │       └── page.tsx
        │
        ├── studies/layout.tsx                     ← Study context layout
        │   ├── page.tsx                           ← /studies (list)
        │   ├── new/page.tsx                       ← /studies/new (wizard)
        │   └── [studyId]/layout.tsx               ← Study detail layout (tabs)
        │       └── page.tsx                       ← ?tab param drives content
        │
        ├── questionnaires/layout.tsx
        │   ├── page.tsx                           ← Library
        │   ├── new/page.tsx                       ← Create (→ redirect to edit)
        │   ├── [id]/edit/page.tsx                 ← Form Builder (full-screen, custom layout)
        │   ├── [id]/preview/page.tsx
        │   ├── [id]/review/page.tsx
        │   └── [id]/deploy/page.tsx
        │
        └── ... (similar for data-collection, reports, admin)
```

---

## Loading States (Skeleton Designs)

| Route | Skeleton Pattern |
|-------|-----------------|
| `/dashboard` | 4 KPI skeleton cards in row, 2x2 widget grid skeleton |
| `/projects` | 6 skeleton cards (3 columns, 2 rows) |
| `/projects/[id]` | Info card skeleton + 4 KPI skeletons + tab skeleton |
| `/studies` | 4 skeleton cards with progress bar placeholders |
| `/studies/[id]` | Status badge skeleton + info card + tab skeleton |
| `/studies/new` | Skeleton step indicator + form skeleton per step |
| `/questionnaires` | 4 skeleton rows + search bar skeleton |
| `/questionnaires/[id]/edit` | Full 3-panel skeleton (no animation, static layout) |
| `/questionnaires/[id]/preview` | Phone frame skeleton with question placeholder |
| `/data-collection/submissions` | Search bar skeleton + 8 table row skeletons |
| `/data-collection/submissions/[id]` | Dual-panel skeleton (responses + metadata) |
| `/reports` | 4 skeleton rows |
| `/reports/[reportId]` | TOC sidebar skeleton + content area skeleton |
| `/admin/users` | Search skeleton + 10 table row skeletons |

---

## Error States

| Route | Error State Behavior |
|-------|---------------------|
| All list pages | Inline error in content area: "Failed to load. [Retry]" |
| All detail pages | Full-page error: "Could not load [entity]. It may have been deleted or you may not have permission." |
| `/questionnaires/[id]/edit` | Isolated error boundary: "Form builder encountered an error. Your changes are auto-saved. [Reload]" |
| `/dashboard` | Widget-level error boundaries; each widget independent |
| API 401 | Redirect to `/login` with return URL |
| API 403 | "You don't have permission to view this page. Contact your administrator." |
| API 404 | "The page you're looking for doesn't exist." |
| API 429 | "Too many requests. Please wait a moment and try again." |
| Network offline | Banner: "You're offline. Some features may be unavailable." + cached data |
| Form submission failure | Toast: "Save failed — [reason]" with Retry button; form state preserved |

---

## Authentication Guards

| Route Pattern | Guard | Redirect |
|--------------|-------|----------|
| `(auth)/*` | Redirect if authenticated | `/dashboard` |
| `(dashboard)/*` | Require authenticated | `/login?callbackUrl={path}` |
| `(dashboard)/projects/*` | Require permission: `view.project` | 403 page |
| `(dashboard)/studies/*` | Require permission: `view.study` | 403 page |
| `(dashboard)/questionnaires/*` | Require permission: `view.questionnaire` | 403 page |
| `(dashboard)/data-collection/*` | Require role: Supervisor+ | 403 page |
| `/admin/*` | Require role: Admin | 403 page |
| `/reports/generate` | Require permission: `generate.report` | 403 page |

---

## Breadcrumb Mapping

| Route | Breadcrumb |
|-------|------------|
| `/dashboard` | `Home > Dashboard` |
| `/projects` | `Home > Projects` |
| `/projects/new` | `Home > Projects > New Project` |
| `/projects/[id]` | `Home > Projects > [Project Name]` |
| `/projects/[id]?tab=indicators` | `Home > Projects > [Project Name] > Indicators` |
| `/studies` | `Home > Studies` |
| `/studies/new` | `Home > Studies > New Study` |
| `/studies/[id]` | `Home > Studies > [Study Title]` |
| `/studies/[id]?tab=dashboard` | `Home > Studies > [Study Title] > Dashboard` |
| `/studies/[id]/indicators/[indId]` | `Home > Studies > [Study Title] > Indicators > [Indicator Name]` |
| `/questionnaires` | `Home > Questionnaires` |
| `/questionnaires/[id]/edit` | `Home > Questionnaires > [Q Title] > Edit` (no breadcrumb in full-screen) |
| `/questionnaires/[id]/preview` | `Home > Questionnaires > [Q Title] > Preview` |
| `/questionnaires/[id]/review` | `Home > Questionnaires > [Q Title] > Review` |
| `/questionnaires/[id]/deploy` | `Home > Questionnaires > [Q Title] > Deploy` |
| `/data-collection/submissions` | `Home > Data Collection > Submissions` |
| `/data-collection/submissions/[id]` | `Home > Data Collection > Submissions > [ID]` |
| `/reports` | `Home > Reports` |
| `/reports/generate` | `Home > Reports > Generate Report` |
| `/reports/[reportId]` | `Home > Reports > [Report Title]` |
| `/admin/users` | `Home > Administration > Users` |
| `/admin/roles` | `Home > Administration > Roles & Permissions` |
| `/profile` | `Home > My Profile` |

---

## URL Parameters

### Path Parameters

| Param | Type | Example | Used In |
|-------|------|---------|---------|
| `projectId` | UUID | `a1b2c3d4-...` | `/projects/[projectId]` |
| `studyId` | UUID | `e5f6g7h8-...` | `/studies/[studyId]` |
| `questionnaireId` | UUID | `i9j0k1l2-...` | `/questionnaires/[id]/edit` |
| `indicatorId` | UUID | `m3n4o5p6-...` | `/indicators/[indicatorId]` |
| `submissionId` | UUID | `q7r8s9t0-...` | `/data-collection/submissions/[id]` |
| `reportId` | UUID | `u1v2w3x4-...` | `/reports/[reportId]` |
| `userId` | UUID | `y5z6a7b8-...` | `/admin/users/[userId]` |
| `teamId` | UUID | `c9d0e1f2-...` | `/admin/teams/[teamId]` |
| `enumeratorId` | UUID | `g3h4i5j6-...` | `/data-collection/enumerators/[id]` |

### Search Parameters

| Param | Type | Default | Used In |
|-------|------|---------|---------|
| `tab` | string | `overview` | Detail pages with tabs |
| `section` | string | `assignments` | Data collection hub sub-sections |
| `page` | number | `1` | All list pages (paginated) |
| `per_page` | number | `25` | All list pages |
| `sort` | string | `-created_at` | All list pages (prefix `-` for desc) |
| `search` | string | — | All list pages |
| `status` | string[] | — | Project, study, questionnaire lists |
| `type` | string | — | Study list, indicator list |
| `date_from` | date | — | Submission list, reports |
| `date_to` | date | — | Submission list, reports |
| `enumerator_id` | UUID | — | Submissions list |
| `flag_status` | string | — | Submissions list (flagged/clean) |
| `view` | string | `card` | Project list (card/table toggle) |
| `date_range` | string | `last_30d` | Dashboard (preset: last_7d, last_30d, last_90d, custom) |
| `disaggregation` | string | — | Indicator detail dashboard |
| `language` | string | — | Form preview (language switch) |
| `device` | string | `mobile` | Form preview (mobile/tablet/desktop) |

---

## Route Transitions and Animations

| Transition | Animation |
|------------|-----------|
| Page navigation (same module) | Fade in content, 200ms ease |
| Page navigation (module change) | Slide 8px + fade, 250ms ease |
| List → Detail | Detail slides in from right, list dims (if same view) |
| Wizard step change | Previous slides out left, next slides in right, 200ms |
| Modal open | Fade backdrop + scale content 0.95→1, 200ms |
| Modal close | Fade + scale 1→0.95, 150ms |
| Slide-in panel open | Slide right 300px, 250ms ease-out |
| Slide-in panel close | Slide right out, 200ms ease-in |
| Skeleton → Content | Fade in content, 300ms delay (avoid flash) |
| Toast appear | Slide in from right + fade, 300ms |
| Toast dismiss | Fade out, 200ms |
| Drag item (form builder) | Scale 1.05 + drop shadow, 100ms |
| Drop item (form builder) | Scale 1→0.95→1, 200ms spring |
| Toggle sidebar collapse | Width transition 240px↔64px, 200ms ease |
| Notification badge update | Scale pulse, 300ms |
| RAG status change | Color transition, 500ms |
| `prefers-reduced-motion: reduce` | All durations → 0.01ms, no transforms |

All animations implemented via Framer Motion's `motion.div` with layout animations. Page transitions use Next.js `<AppRouter>` with `useLayoutEffect` or Framer Motion's `AnimatePresence`.
