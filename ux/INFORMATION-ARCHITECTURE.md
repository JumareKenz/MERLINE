# Merline Information Architecture

## Navigation Philosophy

Merline's navigation is task-oriented — organized around what users do, not around system structure. Every navigation path answers: Where am I? Where can I go? What can I do? What should I do next?

## 1. Global Navigation Structure

### Primary Navigation (Sidebar — Persistent)

```
┌──────────────────────────────────────┐
│ Merline                           [≡] │
├──────────────────────────────────────┤
│ [Dashboard]  Dashboard               │
│ [Folder]     Projects                │
│ [Clipboard]  Studies                 │
│ [Form]       Questionnaires          │
│ [BarChart]   Reports                 │
│ [Settings]   Administration          │
├──────────────────────────────────────┤
│                                        │
│ ┌─────────────────────────────────┐   │
│ │ Search projects, studies...    │   │
│ └─────────────────────────────────┘   │
│                                        │
│ Recent Studies                        │
│ › Health Baseline Survey              │
│ › Education KAP 2026                  │
│                                        │
│ [User avatar]  Dr. Amara Osei      [▼]│
│                                        │
└──────────────────────────────────────┘
```

**Sidebar items by persona visibility:**

| Item | Researcher | Enumerator | Supervisor | Program Mgr | M&E Officer | Country Dir | Donor | Admin |
|------|-----------|-----------|------------|-------------|-------------|-------------|-------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Studies | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Questionnaires | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Reports | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Administration | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ |
| Field Ops | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Secondary Navigation (Top Bar — Contextual)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Back]  Projects  /  Health Program  /  Baseline Survey          [▼]│
│                                                                      │
│ [Overview] [Questionnaire] [Data Collection] [Dashboard] [Reports]   │
│                                                                      │
│ [Filter ▼] [Date Range ▼] [Export ▼] [Share] [⋯]                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Top bar elements:**
- Breadcrumb (always visible, clickable)
- Module tabs (context-sensitive to current entity)
- Action bar (entity-specific actions)
- Global actions: notifications, help, profile

### Tertiary Navigation (Inline — Page-Specific)

Within a page, tertiary navigation uses:
- Tabs (for switching views of the same entity)
- Accordion sections (for configurable workflows)
- Stepped wizard (for multi-step processes)
- Split-pane (master-detail relationships)

## 2. Screen Hierarchy by Module

### Module: Dashboard

```
Dashboard
├── Executive Dashboard (default — organization-wide)
│   ├── KPI Row: Active Studies, Total Submissions, Enumerators, Quality Score
│   ├── Map Widget: Geographic distribution of active studies
│   ├── Indicator Tracking: Top 10 indicators with RAG status
│   ├── Recent Activity Feed
│   └── Alerts Panel: Flags requiring attention
├── Project Dashboard (per project)
│   ├── Project Summary Card
│   ├── Study Progress Bars
│   ├── Indicator Achievement by Study
│   └── Team Activity
└── Study Dashboard (per study)
    ├── Submission Counter (target vs actual)
    ├── Quality Score Gauge
    ├── Enumerator Performance Table
    ├── Indicator Tracking Detail
    └── Recent Submissions
```

### Module: Projects

```
Projects
├── Project List
│   ├── Filter/Search bar
│   ├── Card grid or table view toggle
│   └── Create Project button
├── Create Project (wizard)
│   ├── Step 1: Basic Info (name, description, donor, dates)
│   ├── Step 2: Team Setup (add members, assign roles)
│   └── Step 3: Confirmation
└── Project Detail
    ├── Overview Tab
    │   ├── Project info card
    │   ├── Key metrics
    │   ├── Studies list
    │   └── Recent activity
    ├── Studies Tab (list within project)
    ├── Indicators Tab (project-level library)
    ├── Team Tab
    └── Settings Tab
```

### Module: Studies

```
Studies
├── Study List (with filter by status, type, date)
├── Create Study (wizard)
│   ├── Step 1: Study Type & Methodology
│   ├── Step 2: Purpose, Objectives, Research Questions
│   ├── Step 3: Population & Sampling
│   ├── Step 4: Timeline & Target
│   └── Step 5: Confirmation & Submit for Approval
├── Study Detail
│   ├── Overview Tab
│   │   ├── Status badge + lifecycle progress bar
│   │   ├── Key info card
│   │   ├── Indicator summary (linked indicators)
│   │   ├── Assigned team
│   │   └── Quick actions (Edit, Clone, Archive)
│   ├── Design Tab (ToC/LogFrame — Phase 2)
│   ├── Indicators Tab
│   │   ├── Indicator list (linked from library)
│   │   ├── Link existing indicator
│   │   └── Create indicator on the fly
│   ├── Questionnaires Tab
│   │   ├── Questionnaire list
│   │   ├── Create new / Link existing
│   │   └── Version history
│   ├── Data Collection Tab
│   │   ├── Assignment manager
│   │   ├── Submission viewer
│   │   └── Sync status
│   ├── Dashboard Tab (auto-generated study dashboard)
│   ├── Reports Tab
│   │   ├── Report list
│   │   └── Generate report button
│   └── Settings Tab
│       ├── Edit study config
│       ├── Manage permissions
│       └── Archive study
└── Approval Queue (Manager/Supervisor view)
    ├── Pending approvals list
    ├── Study detail in review mode
    └── Approve / Reject / Request Changes actions
```

### Module: Questionnaires

```
Questionnaires
├── Questionnaire Library (across org)
│   ├── Filter by study, status, type
│   └── Create New button
├── Create Questionnaire
│   ├── Wizard or direct canvas entry
│   └── Name, language, estimated duration
├── Form Builder (full-screen editor)
│   ├── Left Panel: Question palette (draggable types)
│   ├── Center: Canvas (DnD form preview)
│   ├── Right Panel: Question properties
│   │   ├── Question text, help text
│   │   ├── Answer options (for choice types)
│   │   ├── Validation rules
│   │   ├── Skip logic
│   │   ├── Indicator linking
│   │   ├── Translation tab
│   │   └── Required toggle
│   ├── Toolbar: Undo/Redo, Save, Preview, Settings
│   └── Bottom: Question count, estimated time
├── Form Preview
│   ├── Mobile preview (phone frame)
│   └── Web preview (tablet/desktop frame)
├── Form Review & Approval
│   ├── Inline comments per question
│   ├── Version diff view
│   └── Approve / Request Changes
└── Form Deployment
    ├── Select active version
    ├── Assign to enumerators/teams
    └── Publish
```

### Module: Data Collection (Mobile)

```
Mobile App
├── Home / Dashboard
│   ├── Assigned surveys count
│   ├── Pending sync badge
│   ├── Today's progress
│   └── Quick actions: Start Survey, Sync All
├── Assignments List
│   ├── Each assignment: survey name, target count, progress, due date
│   └── Tap to open
├── Survey Form (question-by-question)
│   ├── Question display with input widget
│   ├── Progress bar (question X of Y)
│   ├── Save as Draft button
│   ├── Media capture (camera/GPS)
│   └── Skip logic auto-execution
├── Review Screen (before submit)
│   ├── All answers in read-only list
│   ├── Edit button per section
│   └── Submit button
├── Sync Status Screen
│   ├── Pending submissions count
│   ├── Synced submissions count
│   └── Sync errors list with retry
└── Profile
    ├── Personal stats
    ├── Language settings
    └── App version
```

### Module: Data Collection (Web — Supervisor)

```
Data Collection (Web)
├── Assignments Overview
│   ├── Team assignment table
│   ├── Create assignment
│   └── Bulk assign
├── Submission Viewer
│   ├── Submission table (filterable)
│   ├── Submission detail (read-only response view)
│   └── Flag/Approve/Reject actions
├── Enumerator Performance
│   ├── Per-enumerator cards
│   ├── Submissions over time chart
│   └── Quality score breakdown
└── Sync Monitor
    ├── Device sync status
    └── Sync error log
```

### Module: Reports

```
Reports
├── Report Library
│   ├── Report list (filter by study, type, status)
│   ├── Templates gallery
│   └── Generate New Report button
├── Generate Report (wizard)
│   ├── Step 1: Select template
│   ├── Step 2: Select study & data source
│   ├── Step 3: Select indicators/sections to include
│   ├── Step 4: Configure timeframe & filters
│   └── Step 5: Generate (progress indicator)
├── Report Preview / Editor
│   ├── Section navigation sidebar
│   ├── Content area (editable text, charts, tables)
│   ├── AI section toggle (Phase 2)
│   └── Save Draft / Finalize / Export buttons
├── Report Viewer (read-only)
│   ├── Full report with pagination
│   ├── Export to PDF/Word
│   └── Share link
└── Templates
    ├── Template list
    ├── Preview template
    └── Create custom template
```

### Module: Administration

```
Administration
├── Organization Settings
│   ├── Profile (name, logo, branding)
│   ├── Locale (default language, timezone)
│   └── Security (password policy, MFA enforcement)
├── User Management
│   ├── User list (searchable, filterable)
│   ├── Invite User
│   ├── User Detail (profile, roles, activity log)
│   └── Bulk operations (import, suspend)
├── Team Management
│   ├── Team list
│   ├── Create Team
│   └── Team Detail (members, supervisor)
├── Roles & Permissions
│   ├── Role list
│   ├── Role editor (permission matrix)
│   └── Permission policy templates
├── Study Types & Settings
│   └── Configure study types available for org
└── Activity Log
    ├── Audit trail (filterable)
    └── Export log
```

## 3. Complete Sitemap (Text-Based Tree)

```
Home / Dashboard
├── Executive Dashboard
├── Project Dashboard
│   ├── /projects/{projectId}
│   └── /projects/{projectId}/dashboard
├── Study Dashboard
│   ├── /studies/{studyId}
│   └── /studies/{studyId}/dashboard
└── /my-tasks (personal task list)

Projects
├── /projects
│   ├── List
│   └── Create (/projects/new)
└── /projects/{projectId}
    ├── Overview
    ├── Studies (/projects/{projectId}/studies)
    ├── Indicators (/projects/{projectId}/indicators)
    ├── Team (/projects/{projectId}/team)
    └── Settings (/projects/{projectId}/settings)

Studies
├── /studies
│   ├── List
│   └── Create (/studies/new)
└── /studies/{studyId}
    ├── Overview
    ├── Design (/studies/{studyId}/design) — Phase 2
    ├── Indicators (/studies/{studyId}/indicators)
    ├── Questionnaires (/studies/{studyId}/questionnaires)
    ├── Data Collection (/studies/{studyId}/data-collection)
    │   ├── Assignments
    │   ├── Submissions
    │   └── Enumerator Performance
    ├── Dashboard (/studies/{studyId}/dashboard)
    ├── Reports (/studies/{studyId}/reports)
    └── Settings (/studies/{studyId}/settings)

Questionnaires
├── /questionnaires
│   ├── Library
│   └── Create (/questionnaires/new)
├── /questionnaires/{questionnaireId}/edit (Form Builder)
├── /questionnaires/{questionnaireId}/preview
├── /questionnaires/{questionnaireId}/review
│   ├── Inline comments
│   └── Version history
└── /questionnaires/{questionnaireId}/deploy

Reports
├── /reports
│   ├── Library
│   └── Generate (/reports/generate)
├── /reports/{reportId}
│   ├── Preview / Edit
│   └── View (read-only)
└── /reports/templates
    ├── Template list
    └── Template detail

Administration
├── /admin/settings
├── /admin/users
│   ├── List
│   ├── Invite (/admin/users/invite)
│   └── {userId}
├── /admin/teams
│   ├── List
│   ├── Create (/admin/teams/new)
│   └── {teamId}
├── /admin/roles
├── /admin/activity-log
└── /admin/indicator-library

Data Collection (Supervisor Web)
├── /data-collection/assignments
├── /data-collection/submissions
│   └── {submissionId}
├── /data-collection/enumerators
│   └── {enumeratorId}
└── /data-collection/sync-status

User
├── /profile
├── /notifications
└── /help
```

## 4. Breadcrumb Design

### Pattern

Global: `Home > {Module} > {Entity} > {Sub-entity}`
Contextual: `Module > {Filter/View}>`

### Examples

```
Projects > Health Program > Baseline Survey > Dashboard
Studies > Baseline Survey > Questionnaires > Household Survey v2 > Edit
Administration > Users > Dr. Amara Osei > Edit Permissions
```

### Behavior

- Each breadcrumb segment is clickable for navigation
- Current page is the last segment (text, not linked)
- Maximum depth: 4 levels. Beyond 4, truncate with "..."  
- Mobile: collapse to single "Back" button with entity name
- Breadcrumbs update when filters change (context persistence)

## 5. Search and Discoverability

### Global Search

```
┌──────────────────────────────────────────────────────┐
│ Search projects, studies, questionnaires...       [⏎] │
└──────────────────────────────────────────────────────┘
```

**Scope:** Searches across all modules the user has permission to view.

**Search results grouped by type:**
1. Projects (matching name, code)
2. Studies (matching title, code, objectives)
3. Questionnaires (matching title, code)
4. Indicators (matching name, code)
5. Reports (matching title)
6. Users (matching name, email)

**Keyboard shortcut:** `Cmd/Ctrl + K` opens search from anywhere.

**Filters in search results:** Module type, status, date range.

### Contextual Filtering

Each list view (projects, studies, questionnaires, submissions) includes:
- Search within list
- Filter by status (checkboxes)
- Filter by date range
- Filter by assignee (for submissions)
- Sort by: name, date created, date modified, status
- Saved filters (persist per user)

### Discoverability Patterns

1. **Empty state guidance** — Every empty list shows why it's empty and what to do next
2. **Contextual help** — `[?]` icon on complex screens opens tooltip
3. **Recent items** — Sidebar shows 3-5 recently accessed studies/projects
4. **Quick actions** — Each entity card shows primary action (e.g., "New Submission", "View Dashboard")
5. **Cross-module links** — Indicators link to questionnaires that measure them; questionnaires link to studies that use them
6. **Bulk actions** — Visible only when items are selected

## 6. Module Grouping and Labeling

### Navigation Groupings

```
Primary Workspace
├── Dashboard — At-a-glance status across all work
├── Projects — Project management hub
├── Studies — Research study lifecycle
└── Questionnaires — Survey instrument design

Operations
├── Data Collection — Field monitoring and submissions
└── Reports — Report generation and templates

Administration
└── Administration — Users, teams, permissions, settings
```

### Labeling Decisions

| Internal Term | User-Facing Label | Rationale |
|--------------|-------------------|-----------|
| Tenant | Organization | Familiar term; "tenant" is technical |
| Form | Questionnaire | Research community uses "questionnaire" |
| Response | Submission | "Response" is ambiguous; "submission" implies completion |
| Survey | Questionnaire | Consistent with MERL terminology |
| Program Manager | Manager | Shorter, clearer for navigation |
| Study Status | Draft, Active, Data Collection, Analysis, Complete | Concrete lifecycle stages |
| Assignment | Survey Assignment | Distinguishes from work assignments |

## 7. Cross-Module Navigation Pathways

### Common Pathways

```
Start                            → End
─────────────────────────────────────────────────────
Project list                    → Study creation
Study overview                  → Form builder
Form builder                    → Form preview
Form approval                   → Deploy to field
Assignment creation             → Enumerator selection
Submission review               → Quality flag detail
Dashboard indicator             → Indicator breakdown
Report generation               → Export/share
User management                 → Role assignment
```

### Navigation Patterns Between Screens

**Sequential workflow (wizard):**
```
Study Create → Study Config → Indicator Setup → Complete
[Back] ← Step 2 of 5 → [Continue]
```

**Hub-and-spoke (detail pages):**
```
Study List
    └── Study Detail
        ├── Overview
        ├── Indicators ←→ Questionnaire (inline links)
        ├── Questionnaires ←→ Form Builder
        ├── Data Collection ←→ Submission Detail
        ├── Dashboard
        └── Reports
```

**Deep links (context switching):**
An indicator in a report links directly to the indicator definition in the study.
A submission in the supervisor view links to the enumerator that collected it.
A questionnaire in the builder links to the indicators it measures.

## 8. Mobile Navigation (Mobile App)

### Bottom Tab Bar (Primary Mobile Navigation)

```
[Home] [Surveys] [Sync] [Profile]
```

- **Home**: Dashboard with progress summary, quick actions
- **Surveys**: Assigned surveys list (primary work area)
- **Sync**: Sync status, pending uploads, retry all
- **Profile**: Settings, language, help, logout

### Gesture Navigation

- Swipe left/right on questions in survey form
- Pull down to refresh assignments
- Long press on submission for context menu (delete draft, retry sync)
- Tap status bar to scroll to top

### Contextual Top Bar

- Back arrow + screen title
- Action buttons (search, filter, sort) per screen
- Offline indicator (icon changes color based on connectivity)
- Sync progress indicator (animated during sync)

## 9. Notification Center

### Types

| Type | Channel | Example |
|------|---------|---------|
| Alert | In-app, email | Data quality threshold breached |
| Reminder | In-app, push | Assignment due tomorrow |
| Approval Request | In-app, email | Study requires your approval |
| Approval Update | In-app, email | Your study was approved |
| Flag | In-app | Submission flagged for review |
| System | In-app | Form version updated |
| Invitation | Email | You've been added to a project |

### Notification Center (In-App)

```
Notifications [3 unread]
├── Today
│   ├── ● Baseline study approved by Dr. Fatima
│   ├── ● 5 submissions flagged for review
│   └──   Survey assignment due tomorrow
├── Yesterday
│   ├──   New enumerator assigned to your team
│   └──   Data export completed
└── Earlier
    └──   Questionnaire v2 published
```

- Mark as read / Mark all read
- Click notification navigates to relevant screen
- Notification preferences per user (which types, which channels)
- Group similar notifications (e.g., "3 submissions flagged")
