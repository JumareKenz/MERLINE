# Merline Screen Inventory — MVP (Phase 1)

## Overview

This document inventories every screen required for the MVP release. Minimum 30 screens covering all P0 features across 6 modules.

---

## Module: Authentication & Organization Management

### SCR-001: Login Screen

| Field | Description |
|-------|-------------|
| **Screen Name** | Login |
| **Purpose** | Authenticate user with email/password or magic link |
| **Module** | Authentication & Org Management |
| **Primary User(s)** | All personas |
| **Inputs** | Email, password, "Remember Me" toggle |
| **Outputs** | JWT token; redirect to Dashboard or requested page |
| **Key Components** | Email input, password input, login button, "Forgot Password?" link, "Create Account" link, MFA input (if enabled), SSO provider buttons (Phase 2) |
| **Navigate From** | Any unauthenticated route; session timeout redirect |
| **Navigate To** | Dashboard (success), Forgot Password (link), Registration (link) |
| **States** | **Default**: Empty form. **Loading**: Button shows spinner; inputs disabled. **Error**: "Invalid email or password" toast. **MFA Challenge**: Code input appears after password. **Rate Limited**: "Too many attempts. Try again in N minutes." **Offline**: "No internet connection. Previously cached credentials available." |

### SCR-002: Registration Screen

| Field | Description |
|-------|-------------|
| **Screen Name** | Create Account |
| **Purpose** | Register new user account with email verification |
| **Module** | Authentication & Org Management |
| **Primary User(s)** | All personas (first time) |
| **Inputs** | Name, email, password, confirm password, organization code |
| **Outputs** | Account created; verification email sent |
| **Key Components** | Registration form, organization lookup, password strength indicator, terms checkbox |
| **Navigate From** | Login screen "Create Account" link |
| **Navigate To** | Email verification prompt (success), Login screen (cancel) |
| **States** | **Default**: Empty form. **Loading**: Submitting; button spinner. **Error**: "Email already registered" / "Password too weak". **Success**: "Check your email to verify" screen. **Validation**: Inline per-field validation on blur. |

### SCR-003: Forgot Password / Reset Password

| Field | Description |
|-------|-------------|
| **Screen Name** | Reset Password |
| **Purpose** | Allow users to reset forgotten password via email |
| **Module** | Authentication & Org Management |
| **Primary User(s)** | All personas |
| **Inputs** | Email (step 1), new password + token (step 2) |
| **Outputs** | Password reset email sent; password updated |
| **Key Components** | Email input, submit button, token input, new password fields |
| **Navigate From** | Login screen "Forgot Password" link |
| **Navigate To** | Login screen (success or cancel) |
| **States** | **Default**: Step 1 — enter email. **Step 2**: Enter token + new password. **Loading**: Spinner on submit. **Error**: "Email not found" / "Token expired" / "Link already used". **Success**: "Password reset. Please log in." |

### SCR-004: Organization Setup (First-Time Admin)

| Field | Description |
|-------|-------------|
| **Screen Name** | Set Up Your Organization |
| **Purpose** | First-time organization creation by initial admin user |
| **Module** | Authentication & Org Management |
| **Primary User(s)** | System Admin, Org Admin |
| **Inputs** | Org name, short name, type (NGO/Gov/Academic), country, website |
| **Outputs** | Organization created; admin navigated to dashboard |
| **Key Components** | Organization form, type selector, country dropdown |
| **Navigate From** | Registration (first user) |
| **Navigate To** | Dashboard (success) |
| **States** | **Default**: Empty form. **Loading**: Creating organization. **Error**: "Organization name already exists". **Success**: Redirect to dashboard. |

### SCR-005: User Profile & Preferences

| Field | Description |
|-------|-------------|
| **Screen Name** | My Profile |
| **Purpose** | View and edit personal profile, preferences, session management |
| **Module** | Authentication & Org Management |
| **Primary User(s)** | All personas |
| **Inputs** | Name, phone, language, timezone, avatar, notification preferences |
| **Outputs** | Updated profile saved; session list displayed |
| **Key Components** | Profile form, avatar upload, language selector, timezone selector, notification toggles, active sessions list, "Logout All Devices" button |
| **Navigate From** | User avatar dropdown → "Profile" |
| **Navigate To** | Saved (stay on page) |
| **States** | **Default**: Pre-populated with current values. **Loading**: Saving spinner. **Error**: "Save failed — try again". **Success**: "Profile updated" toast. **Empty**: No active sessions (edge case). |

---

## Module: Project & Study Management

### SCR-006: Project List

| Field | Description |
|-------|-------------|
| **Screen Name** | Projects |
| **Purpose** | View, search, and filter all projects; create new projects |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher, Program Manager, M&E Officer, Supervisor, Admin |
| **Inputs** | Search text, status filter, date range, sort order |
| **Outputs** | Filtered project list |
| **Key Components** | Search bar, filter dropdowns, card grid / table toggle, "Create Project" FAB, pagination, project status badges (active/closing/closed) |
| **Navigate From** | Sidebar "Projects", Dashboard (click project card) |
| **Navigate To** | Project Detail (click project), Create Project (click button) |
| **States** | **Default**: Shows all accessible projects sorted by recent. **Empty**: "No projects yet. Create your first project to get started." with illustration and CTA. **Loading**: Skeleton cards (3 per row). **Error**: "Failed to load projects. Retry." **Filtered (no results)**: "No projects match your filters." with reset link. **Edge**: 100+ projects — pagination + search prominent. |

### SCR-007: Create Project

| Field | Description |
|-------|-------------|
| **Screen Name** | Create Project |
| **Purpose** | Create a new project with basic configuration |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher, Program Manager, Admin |
| **Inputs** | Project name, description, donor, grant reference, budget, currency, start/end dates, country, sector, tags |
| **Outputs** | New project created in "Draft" status |
| **Key Components** | Multi-field form, date pickers, country selector, sector dropdown, tags input, "Save & Continue" / "Cancel" buttons |
| **Navigate From** | Project List (click "Create Project") |
| **Navigate To** | Project Detail (success), Project List (cancel) |
| **States** | **Default**: Empty form. **Loading**: Submitting; button spinner. **Error**: Validation errors inline; "Save failed — retry". **Validation**: Required fields marked with asterisk; date logic (end > start). |

### SCR-008: Project Detail (Overview)

| Field | Description |
|-------|-------------|
| **Screen Name** | Project Overview |
| **Purpose** | View project details, key metrics, linked studies, recent activity |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher, Program Manager, M&E Officer, Supervisor, Admin, Country Director (read-only) |
| **Inputs** | None (read-only overview) |
| **Outputs** | Project context for all study-related actions |
| **Key Components** | Project info card (name, donor, dates, budget), KPI row (studies count, submissions, indicators, team size), studies list (cards or mini-table), recent activity feed, quick actions (Edit, Add Study, Share) |
| **Navigate From** | Project List (click), Dashboard (project card) |
| **Navigate To** | Study Detail (click study card), Project Settings (tab), Studies tab, Indicators tab, Team tab, Edit Project |
| **States** | **Default**: Full data. **Loading**: Skeleton layout. **Error**: "Failed to load project. Retry." **Empty (no studies)**: "No studies yet. Studies are specific research activities within this project." with "Create Study" CTA. |

### SCR-009: Study List

| Field | Description |
|-------|-------------|
| **Screen Name** | Studies |
| **Purpose** | View all studies across projects; filter by status, type, date |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher, Program Manager, M&E Officer, Supervisor |
| **Inputs** | Search, filter by status/type/date, sort |
| **Outputs** | Filtered study list |
| **Key Components** | Search bar, status filter chips (Draft/Approved/Active/Complete), type filter, date range, study cards with progress bars, "Create Study" FAB |
| **Navigate From** | Sidebar "Studies", Project Detail → Studies tab |
| **Navigate To** | Study Detail (click), Create Study (click button) |
| **States** | **Default**: Studies sorted by recent. **Empty**: "No studies yet. Create a study to begin." with CTA. **Loading**: Skeleton list. **Error**: "Failed to load studies." |

### SCR-010: Create Study (Wizard)

| Field | Description |
|-------|-------------|
| **Screen Name** | Create Study |
| **Purpose** | Configure a new study through a multi-step wizard |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher |
| **Inputs** | Step 1: Study type (baseline/midline/endline/etc.), methodology (quant/qual/mixed). Step 2: Title, purpose, objectives, research questions. Step 3: Population, sample size, location. Step 4: Start/end dates, target submissions. Step 5: Review and confirmation |
| **Outputs** | Study created in "Draft" or submitted for approval |
| **Key Components** | Stepped progress indicator, type cards, methodology selector, objectives editor (add/remove), population text, sample size with guidance, date pickers, review summary panel, "Back" / "Next" / "Save & Submit" buttons |
| **Navigate From** | Study List, Project Detail |
| **Navigate To** | Study Detail (success), Study List (cancel) |
| **States** | **Default**: Step 1 — empty. **Loading**: Submitting. **Error**: Validation on each step; "Network error — draft preserved". **Edge**: Returning to partial wizard (draft saved). **Success**: Navigate to study detail. |

### SCR-011: Study Detail (Overview)

| Field | Description |
|-------|-------------|
| **Screen Name** | Study Overview |
| **Purpose** | Central hub for a study — status, key info, links to all study functions |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher (primary), all roles (view permissions) |
| **Inputs** | None (actions are via tab navigation) |
| **Outputs** | Study context for all sub-screens |
| **Key Components** | Status badge (color-coded: Draft=gray, Approved=green, Active=blue, Complete=dark), lifecycle progress bar, study info card (type, methodology, dates, population), indicator summary (linked count), team members list, quick action buttons (Edit, Clone, Archive), tab navigation row |
| **Navigate From** | Study List, Project Detail, Dashboard |
| **Navigate To** | Each tab (Indicators, Questionnaires, Data Collection, Dashboard, Reports, Settings), Edit Study, Clone Study |
| **States** | **Default**: Full study data. **Loading**: Skeleton. **Error**: "Study not found" or "Access denied". **Edge**: Archived study shows banner "This study is archived. View-only." |

### SCR-012: Study Settings

| Field | Description |
|-------|-------------|
| **Screen Name** | Study Settings |
| **Purpose** | Edit study configuration, manage permissions, archive/restore |
| **Module** | Project & Study Management |
| **Primary User(s)** | Researcher, Admin |
| **Inputs** | Editable study fields, permission toggles, archive button |
| **Outputs** | Updated study config; archived study |
| **Key Components** | Edit form (name, dates, methodology), permission matrix (who can view/edit/manage), "Archive Study" button with confirmation dialog, "Delete Draft" button (only if Draft status) |
| **Navigate From** | Study Detail → Settings tab |
| **Navigate To** | Study Detail (saved), Study List (archived/deleted) |
| **States** | **Default**: Pre-populated with current values. **Loading**: Saving. **Error**: Validation. **Confirm Archive**: Modal "Are you sure? This will prevent new submissions." **Confirm Delete**: Modal "This action cannot be undone." |

---

## Module: Research Design (Indicators)

### SCR-013: Indicator Library

| Field | Description |
|-------|-------------|
| **Screen Name** | Indicator Library |
| **Purpose** | Browse, search, create, and manage reusable indicator definitions |
| **Module** | Research Design |
| **Primary User(s)** | M&E Officer, Researcher |
| **Inputs** | Search, filter by type/level/status, sort |
| **Outputs** | Indicator list for selection or editing |
| **Key Components** | Search bar, type/level filter chips, indicator table (code, name, type, level, status), "Create Indicator" button, bulk actions checkbox, pagination |
| **Navigate From** | Study Detail → Indicators tab, Administration → Indicator Library |
| **Navigate To** | Indicator Detail (click), Create Indicator (click button), Study Indicators (when linked) |
| **States** | **Default**: All org indicators. **Empty**: "No indicators yet. Create your first indicator to start measuring." with CTA. **Loading**: Table skeleton. **Filtered (no results)**: Clear filters link. **Edge**: 500+ indicators shows virtual scrolling. |

### SCR-014: Indicator Detail / Create

| Field | Description |
|-------|-------------|
| **Screen Name** | Indicator Detail |
| **Purpose** | View or create a single indicator with full metadata |
| **Module** | Research Design |
| **Primary User(s)** | M&E Officer, Researcher |
| **Inputs** | Code, name, definition, type, level, unit, numerator, denominator, direction, frequency, data source, disaggregations, baseline, target, thresholds |
| **Outputs** | Saved indicator (Draft or Active) |
| **Key Components** | Full form with collapsible sections (Basic Info, Calculation, Data Source, Targets, Quality), validation feedback, "Save Draft" / "Submit" buttons, version history panel, "Link to Questions" section (read-only cross-ref) |
| **Navigate From** | Indicator Library (click create or existing) |
| **Navigate To** | Indicator Library (saved) |
| **States** | **Default**: Empty for creation; pre-populated for editing. **Loading**: Saving. **Error**: Validation. **Success**: Toast + redirect. **Edge**: Read-only view for approved indicators (edit disabled). |

### SCR-015: Study Indicators (Linked List)

| Field | Description |
|-------|-------------|
| **Screen Name** | Study Indicators |
| **Purpose** | View indicators linked to a specific study; set baselines and targets |
| **Module** | Research Design |
| **Primary User(s)** | Researcher, M&E Officer |
| **Inputs** | Add/remove indicators from library, edit study-specific target, baseline values |
| **Outputs** | Updated study indicator set |
| **Key Components** | Linked indicator table (code, name, target, baseline, current value, RAG status), "Link from Library" button, "Create New" button, per-indicator edit (target/baseline), progress bar for each |
| **Navigate From** | Study Detail → Indicators tab |
| **Navigate To** | Indicator Detail (click indicator), Indicator Library (link), Create Indicator |
| **States** | **Default**: Shows linked indicators. **Empty**: "No indicators linked yet. Link indicators from the library or create new ones." **Loading**: Skeleton list. **Error**: Retry. |

---

## Module: Questionnaire Builder

### SCR-016: Questionnaire Library

| Field | Description |
|-------|-------------|
| **Screen Name** | Questionnaires |
| **Purpose** | Browse, search, and manage all questionnaires for the organization |
| **Module** | Questionnaire Builder |
| **Primary User(s)** | Researcher, M&E Officer |
| **Inputs** | Search, filter by study/status/type |
| **Outputs** | Questionnaire list |
| **Key Components** | Search, filter chips, table/card view, status badges (Draft, Under Review, Approved, Published), "Create Questionnaire" button, version indicator |
| **Navigate From** | Sidebar "Questionnaires", Study Detail → Questionnaires tab |
| **Navigate To** | Form Builder (click/create), Form Preview, Form Review |
| **States** | **Default**: All accessible questionnaires. **Empty**: "No questionnaires yet. Design your first questionnaire." **Filtered (no results)**: Clear filters. **Loading**: Skeleton. |

### SCR-017: Form Builder (Full-Screen Editor)

| Field | Description |
|-------|-------------|
| **Screen Name** | Form Builder |
| **Purpose** | Design questionnaire with drag-and-drop, question configuration, skip logic, validation, translations |
| **Module** | Questionnaire Builder |
| **Primary User(s)** | Researcher, M&E Officer |
| **Inputs** | Question types dragged to canvas; property edits in right panel; skip logic connections drawn; validation rules configured; translations entered |
| **Outputs** | Saved questionnaire version |
| **Key Components** | **Left Panel**: Question palette (collapsible type categories). **Center**: Canvas (question list with drag reorder, section headers, visual skip logic lines). **Right Panel**: Question properties (dynamic based on type), options editor, validation rules, skip logic editor, indicator link dropdown, translation tab, required toggle. **Toolbar**: Undo/Redo, Save (auto-save indicator), Preview, Settings, Question count + estimated time. Section add button. |
| **Navigate From** | Questionnaire Library (create new) |
| **Navigate To** | Preview (toolbar button), Library (saved), Review/Approval |
| **States** | **Default**: Empty canvas + palette. **Loading**: Loading existing form. **Empty Canvas**: "Drag questions here to build your questionnaire." with illustration. **Dirty**: Unsaved changes indicator. **Auto-save**: "Draft saved" toast every 30s. **Error**: "Save failed — retrying..." **Edge**: 100+ questions — virtual scrolling + section collapse. **Mobile**: Simplified layout with larger tap targets. |

### SCR-018: Form Preview (Mobile + Web)

| Field | Description |
|-------|-------------|
| **Screen Name** | Form Preview |
| **Purpose** | Preview questionnaire exactly as enumerators and web users will see it; test skip logic |
| **Module** | Questionnaire Builder |
| **Primary User(s)** | Researcher, M&E Officer |
| **Inputs** | Interactive navigation through form (tap answers to test logic) |
| **Outputs** | Visual verification of form behavior |
| **Key Components** | Side-by-side or toggle between phone frame (mobile) and tablet frame (web), language switcher, test data entry, skip logic execution indicator |
| **Navigate From** | Form Builder (Preview button) |
| **Navigate To** | Form Builder (close preview) |
| **States** | **Default**: Shows form. **Empty form**: "Nothing to preview yet." **Interactive**: Tap through questions, see skip logic. **Edge**: Long form shows scroll position. |

### SCR-019: Form Review & Approval

| Field | Description |
|-------|-------------|
| **Screen Name** | Questionnaire Review |
| **Purpose** | Peer review and approval workflow for questionnaires |
| **Module** | Questionnaire Builder |
| **Primary User(s)** | Researcher (submitter), M&E Officer (reviewer) |
| **Inputs** | Review status (Approve/Request Changes), inline comments per question |
| **Outputs** | Approved questionnaire ready for deployment |
| **Key Components** | Read-only question list with comment threads per question, version diff (show changes from previous), "Approve", "Request Changes", "Reject" buttons, comment input box, reviewer decision summary |
| **Navigate From** | Form Builder (Submit for Review), Library (click "Under Review" item) |
| **Navigate To** | Form Builder (edit from review), Questionnaire Library (approved) |
| **States** | **Default**: Shows questions with comments. **Loading**: Submitting review. **Error**: "Review submission failed — retry". **Edge**: Multiple reviewers — consensus view. |

### SCR-020: Form Deployment

| Field | Description |
|-------|-------------|
| **Screen Name** | Deploy Questionnaire |
| **Purpose** | Publish questionnaire version and assign to enumerators/teams |
| **Module** | Questionnaire Builder |
| **Primary User(s)** | Researcher, Supervisor |
| **Inputs** | Select active version, select target enumerators or teams, optional force-update toggle |
| **Outputs** | Questionnaire published; assignments created; mobile users notified |
| **Key Components** | Version selector (active version), team/enumerator multi-select, assignment quota input, "Deploy" button, deployment status summary |
| **Navigate From** | Questionnaire Library → "Deploy" action |
| **Navigate To** | Data Collection → Assignments (success) |
| **States** | **Default**: Version selected, no team. **Loading**: Deploying. **Success**: "Deployed to N enumerators" toast. **Error**: "Deployment failed — some enumerators not reachable". **Edge**: Re-deploying (version change) shows warning: "N active submissions may be affected." |

---

## Module: Data Collection

### SCR-021: Assignments Overview (Web — Supervisor)

| Field | Description |
|-------|-------------|
| **Screen Name** | Assignments |
| **Purpose** | View and manage all survey assignments across team |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor, Researcher |
| **Inputs** | Filter by team/enumerator/status, search, sort |
| **Outputs** | Assignment management |
| **Key Components** | Assignment table (enumerator, survey, target, completed, due date, status), "Create Assignment" button, progress bars, overdue badges, bulk actions (reassign, extend deadline) |
| **Navigate From** | Study Detail → Data Collection tab, Sidebar → Data Collection |
| **Navigate To** | Create Assignment, Submission Viewer, Enumerator Detail |
| **States** | **Default**: All active assignments. **Empty**: "No assignments yet. Deploy a questionnaire to create assignments." **Loading**: Table skeleton. **Filtered**: No matching assignments. **Edge**: Enumerator with 0 submissions shows red status. |

### SCR-022: Create Assignment

| Field | Description |
|-------|-------------|
| **Screen Name** | New Assignment |
| **Purpose** | Assign a questionnaire to specific enumerators or teams with target count |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor, Researcher |
| **Inputs** | Questionnaire selection, enumerator/team selection, target count, due date, location/area, notes |
| **Outputs** | Assignment created; synced to enumerator mobile apps |
| **Key Components** | Questionnaire dropdown (pre-filtered by approved questionnaires), enumerator/team multi-select with search, target count input (with max cap), date picker, area text input, notes field |
| **Navigate From** | Assignments Overview → "Create Assignment" |
| **Navigate To** | Assignments Overview (success) |
| **States** | **Default**: Empty form. **Loading**: Creating. **Error**: "Assignment failed — enumerator already at capacity". **Success**: Toast + redirect. **Edge**: Max target validation against study sample cap. |

### SCR-023: Submission Viewer (Web)

| Field | Description |
|-------|-------------|
| **Screen Name** | Submissions |
| **Purpose** | View, filter, search, and review all collected submissions |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor, Researcher, M&E Officer |
| **Inputs** | Filters (enumerator, date range, status, flag status), search (respondent ID), sort |
| **Outputs** | Submission list for review actions |
| **Key Components** | Submission table (submission ID, enumerator, date, duration, status, flag indicator), filter bar, bulk action checkboxes, "Approve Selected", "Flag Selected", "Export", pagination |
| **Navigate From** | Study Detail → Data Collection → Submissions tab |
| **Navigate To** | Submission Detail (click row), Enumerator Detail (click name) |
| **States** | **Default**: All submissions for study. **Empty**: "No submissions yet. Assign questionnaires to enumerators." **Loading**: Skeleton. **Filtered (no results)**: Clear filters. **Error**: "Failed to load submissions." **Edge**: 10,000+ submissions — virtual scroll; date range filter encouraged. |

### SCR-024: Submission Detail (Read-Only)

| Field | Description |
|-------|-------------|
| **Screen Name** | Submission Detail |
| **Purpose** | View full submission responses, quality flags, metadata |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor, Researcher, M&E Officer |
| **Inputs** | Review actions: Approve, Reject, Flag for Back-check, Add Note |
| **Outputs** | Reviewed submission with decision |
| **Key Components** | Response list (question text + answer), metadata panel (enumerator, device, GPS, duration, form version), quality flag badges, action buttons, notes/comments section, audit trail of review actions |
| **Navigate From** | Submission Viewer (click row) |
| **Navigate To** | Submission Viewer (after action) |
| **States** | **Default**: Full submission data. **Loading**: Response data loading. **Error**: "Submission not found" or "Access denied". **Empty**: N/A (always has data). **Edge**: GPS not available — shows "Not captured". **Edge**: Media files — click to expand photo/audio. |

### SCR-025: Enumerator Performance (Web)

| Field | Description |
|-------|-------------|
| **Screen Name** | Enumerator Performance |
| **Purpose** | Monitor individual enumerator metrics, quality scores, trends |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor |
| **Inputs** | Select enumerator from list, date range |
| **Outputs** | Performance metrics dashboard for one enumerator |
| **Key Components** | Enumerator selector, KPI row (submissions, quality score, flags, avg duration), submissions over time chart, quality score trend, flag breakdown by type, recent submissions mini-list, "Send Message" button |
| **Navigate From** | Assignments → click enumerator name, Submission → click enumerator |
| **Navigate To** | Submission Detail (click submission), Messaging |
| **States** | **Default**: Selected enumerator with metrics. **Empty (no data)**: "This enumerator has no submissions yet." **Loading**: Skeleton. **Error**: "Could not load enumerator data." **Edge**: Enumerator deactivated shows "Inactive" badge. |

### SCR-026: Sync Monitor (Web — Supervisor)

| Field | Description |
|-------|-------------|
| **Screen Name** | Sync Status |
| **Purpose** | Monitor device sync health, pending uploads, sync errors |
| **Module** | Data Collection |
| **Primary User(s)** | Supervisor, Admin |
| **Inputs** | Filter by device status, enumerator |
| **Outputs** | Sync health overview |
| **Key Components** | Device status table (enumerator, device ID, last sync, pending uploads, pending downloads, errors), "Force Sync" button (for specific devices), error log with "Retry" |
| **Navigate From** | Study Detail → Data Collection → Sync tab |
| **Navigate To** | N/A (manage from this screen) |
| **States** | **Default**: All devices with sync status. **Empty**: "No devices registered." **Loading**: Refreshing. **Error**: "Sync monitor unavailable." **Edge**: Device not synced for 3+ days — red badge. |

### SCR-027: Mobile App — Home / Dashboard

| Field | Description |
|-------|-------------|
| **Screen Name** | Mobile Home |
| **Purpose** | Enumerator's starting screen — assignments, progress, sync status |
| **Module** | Data Collection |
| **Primary User(s)** | Enumerator |
| **Inputs** | Tap to navigate |
| **Outputs** | Navigation to assignments, sync, profile |
| **Key Components** | Assigned surveys count (with progress), today's completed count, pending sync badge (number), sync status indicator (green/yellow/red), quick action buttons ("Start Survey", "Sync All"), offline/online indicator |
| **Navigate From** | App launch |
| **Navigate To** | Surveys list, Sync screen, Profile |
| **States** | **Default**: Shows stats. **Empty**: "No assignments yet. Check back later." **Loading**: Initial data load. **Offline**: Banner "Working offline — data will sync when connected." **Error**: "Failed to load assignments." **Edge**: Battery low — warning banner. **Storage low** — warning banner. |

### SCR-028: Mobile App — Survey Form

| Field | Description |
|-------|-------------|
| **Screen Name** | Survey Form |
| **Purpose** | Collect responses question-by-question in the field |
| **Module** | Data Collection |
| **Primary User(s)** | Enumerator |
| **Inputs** | Tap/type answers, capture GPS/photo/audio/barcode, navigate questions |
| **Outputs** | Completed submission (saved locally, pending sync) |
| **Key Components** | Question display area (type-appropriate input widget), progress bar (Q X of Y), "Previous" / "Next" buttons, "Save as Draft" button, "Review" button (when on last question), GPS capture button, camera button, required indicator (*), validation error message, auto-save indicator |
| **Navigate From** | Assignments list → tap assignment → "Start New Submission" or "Resume Draft" |
| **Navigate To** | Review screen (after last question), Home (save as draft) |
| **States** | **Default**: First question displayed. **Loading**: Form loading. **Error**: "Could not load question." **Validation**: Inline error below question. **GPS**: Spinner while acquiring. **Media**: Camera/gallery opened in overlay. **Offline**: Continues normally. **Edge**: App crash — auto-saved state restored. **Edge**: Skip logic — dependent questions shown/hidden with animation. **Edge**: Required unanswered — cannot advance. |

### SCR-029: Mobile App — Review & Submit

| Field | Description |
|-------|-------------|
| **Screen Name** | Review Submission |
| **Purpose** | Review all answers before final submission |
| **Module** | Data Collection |
| **Primary User(s)** | Enumerator |
| **Inputs** | Swipe through answers, tap "Edit" to change, tap "Submit" |
| **Outputs** | Submission saved locally (status: Pending Sync) |
| **Key Components** | Scrollable answer list (question + value in read-only), "Edit" button per question, "Submit" button (full-width, prominent), "Save as Draft" link (smaller), submission metadata (respondent ID, GPS, duration) |
| **Navigate From** | Survey Form → "Review" button on last question |
| **Navigate To** | Home (submitted), Survey Form (edit a question) |
| **States** | **Default**: All answers shown. **Offline**: "Will sync when online" note below submit button. **Error during save**: "Save failed — retry" with retry button. **Edge**: Missing required answer (shouldn't happen — blocked at form level). **Success**: Confirmation screen "Submission saved!" with green checkmark + option to start next or return home. |

### SCR-030: Mobile App — Sync Status

| Field | Description |
|-------|-------------|
| **Screen Name** | Sync |
| **Purpose** | View pending submissions, sync progress, retry failed syncs |
| **Module** | Data Collection |
| **Primary User(s)** | Enumerator |
| **Inputs** | "Sync All" button, individual retry buttons |
| **Outputs** | Submissions synced to server |
| **Key Components** | Pending submissions list (submission ID, size, status), sync progress bar (overall), per-submission status icon (pending/syncing/synced/failed), "Sync All" button, last synced timestamp, network connectivity indicator |
| **Navigate From** | Home → Sync badge, Bottom tab "Sync" |
| **Navigate To** | Home (after sync) |
| **States** | **Default**: List of pending submissions. **Empty (all synced)**: "All submissions synced!" with green checkmark. **Syncing**: Progress bar + "Syncing N of M..." **Idle (pending)**: Tap "Sync All" to trigger. **Error**: Individual submission shows "Failed" with retry button. **Offline**: "No internet connection. Will sync when online." **Edge**: Large media files — "Uploading photo 3 of 5..." with per-file progress. |

### SCR-031: Mobile App — Enumerator Dashboard

| Field | Description |
|-------|-------------|
| **Screen Name** | My Progress |
| **Purpose** | Personal stats: completed today, this week, total, earnings (if applicable) |
| **Module** | Data Collection |
| **Primary User(s)** | Enumerator |
| **Inputs** | None (read-only stats) |
| **Outputs** | Motivation and progress tracking |
| **Key Components** | Today's completed count (large number), weekly trend mini-chart, total submissions, assignments remaining, earnings to date (if configured), "View All Submissions" link |
| **Navigate From** | Home → "View My Progress", Profile tab |
| **Navigate To** | Home |
| **States** | **Default**: Shows stats. **Empty**: "Start collecting data to see your progress." **Offline**: Cached stats from last sync. **Edge**: No assignments — "No active assignments." |

---

## Module: Dashboards

### SCR-032: Executive Dashboard

| Field | Description |
|-------|-------------|
| **Screen Name** | Dashboard |
| **Purpose** | Organization-wide overview of all projects, studies, and key metrics |
| **Module** | Dashboards |
| **Primary User(s)** | Country Director, Program Manager, Admin |
| **Inputs** | Click widgets to drill down, date range filter |
| **Outputs** | At-a-glance organizational health |
| **Key Components** | KPI row (Active Studies, Total Submissions, Active Enumerators, Quality Score), program/project cards with RAG status, activity feed, alerts panel (flags requiring attention), map widget (geographic distribution), date range selector, "Customize" button |
| **Navigate From** | Sidebar "Dashboard", App launch (default for most roles) |
| **Navigate To** | Project Dashboard (click project card), Study Dashboard (click study), Report Generation |
| **States** | **Default**: Full dashboard. **Empty (no data)**: "Welcome to Merline! Create your first project to start." with quick start guide. **Loading**: Skeleton widgets. **Error**: Widget-level error boundary (one broken widget doesn't crash page). **Filtered**: Widgets update with applied date range. **Edge**: Large portfolio shows top 10 indicators; "View All" link. |

### SCR-033: Study Dashboard (Auto-Generated)

| Field | Description |
|-------|-------------|
| **Screen Name** | Study Dashboard |
| **Purpose** | Real-time study metrics: submission progress, indicator tracking, quality |
| **Module** | Dashboards |
| **Primary User(s)** | Researcher, Program Manager, Supervisor, M&E Officer |
| **Inputs** | Click indicators for detail, apply filters, date range |
| **Outputs** | Real-time study performance view |
| **Key Components** | Submission counter (target vs actual with progress bar), quality score gauge, enumerator performance mini-table, indicator tracking section (cards with RAG, progress bars, sparklines), map widget (submission locations), filter bar, export button |
| **Navigate From** | Study Detail → Dashboard tab, Executive Dashboard → click study |
| **Navigate To** | Indicator Detail (click indicator), Submission Viewer, Enumerator Performance, Report Generation |
| **States** | **Default**: All metrics for study. **Empty (no data)**: "Deploy questionnaires and collect data to populate this dashboard." **Loading**: Skeleton. **Partial data**: "Data collection in progress — metrics update in real-time." **Error**: Widget-specific error fallback. **Edge**: 10+ indicators shows scrollable grid. |

### SCR-034: Indicator Detail Dashboard

| Field | Description |
|-------|-------------|
| **Screen Name** | Indicator Detail View |
| **Purpose** | Deep dive into a single indicator's performance, trends, and disaggregations |
| **Module** | Dashboards |
| **Primary User(s)** | Researcher, Program Manager, M&E Officer |
| **Inputs** | Disaggregation selectors, date range, filter dimensions |
| **Outputs** | Comprehensive indicator analysis |
| **Key Components** | KPI card (current value vs target with RAG), trend line chart (over time), bar chart by district/region, disaggregation breakdown (gender, age group), data table below charts, filter bar, export chart as PNG |
| **Navigate From** | Study Dashboard → click indicator card |
| **Navigate To** | Report Generation (export), Study Dashboard (back) |
| **States** | **Default**: All disaggregations shown. **Empty (no data)**: "No data collected for this indicator yet." **Loading**: Chart skeletons. **Filtered**: Charts update. **Edge**: Insufficient data for trend — "Need at least 3 data points." |

---

## Module: Reports

### SCR-035: Report Library

| Field | Description |
|-------|-------------|
| **Screen Name** | Reports |
| **Purpose** | Browse, search, and manage generated reports and templates |
| **Module** | Reporting |
| **Primary User(s)** | Program Manager, Researcher, M&E Officer, Country Director, Donor |
| **Inputs** | Search, filter by study/type/status |
| **Outputs** | Report list for viewing or management |
| **Key Components** | Report table (title, study, type, status, generated date), status badges (Draft, Final, Published), "Generate New Report" button, template gallery tab toggle, search/filter |
| **Navigate From** | Sidebar "Reports", Study Detail → Reports tab |
| **Navigate To** | Report Generation (click generate), Report Viewer (click report), Template Gallery (tab) |
| **States** | **Default**: All accessible reports. **Empty**: "No reports yet. Generate your first report." **Loading**: Skeleton. **Error**: "Failed to load reports." |

### SCR-036: Generate Report (Wizard)

| Field | Description |
|-------|-------------|
| **Screen Name** | Generate Report |
| **Purpose** | Walk through report generation: template, study, indicators, timeframe |
| **Module** | Reporting |
| **Primary User(s)** | Program Manager, Researcher, M&E Officer |
| **Inputs** | Step 1: Select template (donor report, evaluation brief, etc.). Step 2: Select data source (study, date range). Step 3: Select indicators/sections. Step 4: Configure branding. Step 5: Generate. |
| **Outputs** | Draft report ready for review |
| **Key Components** | Template selector (card grid with previews), study dropdown, date range picker, indicator checklist, brand config (logo, colors), "Generate" button with estimated time, progress indicator during generation |
| **Navigate From** | Report Library → "Generate New Report", Study Detail → "Generate Report" |
| **Navigate To** | Report Preview/Editor (success), Report Library (cancel) |
| **States** | **Default**: Step 1 — template selection. **Loading**: Generating. **Error**: "Generation failed — try again with fewer indicators." **Partial data warning**: "Some indicators have insufficient data." **Success**: Navigate to report editor. |

### SCR-037: Report Preview / Editor

| Field | Description |
|-------|-------------|
| **Screen Name** | Report Editor |
| **Purpose** | Review auto-generated report, edit content, finalize |
| **Module** | Reporting |
| **Primary User(s)** | Program Manager, Researcher |
| **Inputs** | Edit text sections, regenerate data sections, add/remove charts, reorder sections |
| **Outputs** | Finalized report ready for export |
| **Key Components** | Section navigation sidebar, content area (live preview), editable text fields, chart placeholders (embedded visualizations), "Save Draft", "Finalize", "Export" buttons, version indicator |
| **Navigate From** | Generate Report (success), Report Library → click Draft report |
| **Navigate To** | Report Viewer (after finalize), Export dialog |
| **States** | **Default**: Auto-generated content loaded. **Loading**: Content rendering. **Editing**: Inline edit mode for text sections. **Error**: "Could not load data for section X." **Edge**: Report with 50+ pages — section navigation essential. **Success**: "Report finalized" confirmation. |

### SCR-038: Report Viewer (Read-Only)

| Field | Description |
|-------|-------------|
| **Screen Name** | Report View |
| **Purpose** | View finalized report; export or share |
| **Module** | Reporting |
| **Primary User(s)** | All personas (with Report View permission) |
| **Inputs** | Export format selection, share options |
| **Outputs** | PDF/Word export; shareable link |
| **Key Components** | Full report display with pagination, table of contents sidebar, export buttons (PDF, Word, HTML), "Share" button (email or link), download progress indicator |
| **Navigate From** | Report Library → click Final report |
| **Navigate To** | Export download, Share dialog |
| **States** | **Default**: Full report rendered. **Loading**: Report content loading (for large reports). **Error**: "Report not found." **Edge**: Embedded charts not loading — fallback to table data. **Export**: Progress indicator. |

### SCR-039: Template Gallery

| Field | Description |
|-------|-------------|
| **Screen Name** | Report Templates |
| **Purpose** | Browse available report templates; preview structure |
| **Module** | Reporting |
| **Primary User(s)** | Program Manager, Researcher, M&E Officer |
| **Inputs** | Click template to preview or use |
| **Outputs** | Template selected for report generation |
| **Key Components** | Template card grid (title, description, thumbnail preview), "Preview" overlay, "Use Template" button, search/filter by type |
| **Navigate From** | Report Library → Templates tab, Generate Report → Step 1 |
| **Navigate To** | Generate Report (with template selected), Report Preview (preview overlay) |
| **States** | **Default**: All available templates. **Empty**: "No templates available. Contact your administrator." **Loading**: Card skeleton. |

---

## Module: Administration

### SCR-040: User Management

| Field | Description |
|-------|-------------|
| **Screen Name** | Users |
| **Purpose** | Manage organization users: invite, suspend, assign roles |
| **Module** | Administration |
| **Primary User(s)** | Admin |
| **Inputs** | Search, filter by status/role, select users for bulk actions |
| **Outputs** | Updated user list |
| **Key Components** | User table (name, email, role, status, last login), "Invite Users" button, bulk action bar (Suspend, Resend Invite, Assign Role), user status badges (Active, Invited, Suspended), pagination |
| **Navigate From** | Sidebar "Administration" → Users |
| **Navigate To** | User Detail (click user), Invite Users (click button) |
| **States** | **Default**: All org users. **Empty**: "No users yet. Invite your team members." **Loading**: Skeleton. **Filtered**: No matching users. **Error**: "Failed to load users." |

### SCR-041: Invite Users

| Field | Description |
|-------|-------------|
| **Screen Name** | Invite Users |
| **Purpose** | Invite one or multiple users via email with role assignment |
| **Module** | Administration |
| **Primary User(s)** | Admin |
| **Inputs** | Email(s), role selector, team assignment, optional message |
| **Outputs** | Invitation emails sent; user records created ("Invited" status) |
| **Key Components** | Email input (single or bulk paste), role dropdown, team dropdown, message textarea, "Send Invitations" button, summary preview |
| **Navigate From** | User Management → "Invite Users" |
| **Navigate To** | User Management (success) |
| **States** | **Default**: Empty email input. **Loading**: Sending invitations. **Error**: "Invalid email format" / "Email already registered". **Success**: "N invitations sent" toast. **Edge**: Bulk paste — validates each line separately; shows errors per line. |

### SCR-042: Organization Settings

| Field | Description |
|-------|-------------|
| **Screen Name** | Organization Settings |
| **Purpose** | Configure organization profile, branding, locale, security defaults |
| **Module** | Administration |
| **Primary User(s)** | Admin |
| **Inputs** | Organization name, logo upload, default language, timezone, MFA enforcement toggle |
| **Outputs** | Updated organization configuration |
| **Key Components** | Profile form, logo upload with preview, language selector, timezone selector, MFA toggle, password policy settings, "Save" button |
| **Navigate From** | Sidebar "Administration" → Settings |
| **Navigate To** | Saved (stay on page) |
| **States** | **Default**: Pre-populated. **Loading**: Saving. **Error**: "Save failed". **Success**: "Settings updated" toast. |

### SCR-043: Roles & Permissions

| Field | Description |
|-------|-------------|
| **Screen Name** | Roles & Permissions |
| **Purpose** | View and customize role-based permission policies |
| **Module** | Administration |
| **Primary User(s)** | Admin |
| **Inputs** | Select role, toggle permissions, save policy |
| **Outputs** | Updated permission policies |
| **Key Components** | Role list (sidebar or tabs), permission matrix (module x action checkboxes), "Save Changes" button, "Reset to Default" button, role description, user count per role |
| **Navigate From** | Sidebar "Administration" → Roles |
| **Navigate To** | Saved (stay on page) |
| **States** | **Default**: All roles with default permissions. **Loading**: Saving. **Error**: "Could not save — some permissions are in use." **Edge**: Changing permission for a role with active users — confirmation required. |

### SCR-044: Activity Log (MVP — Basic)

| Field | Description |
|-------|-------------|
| **Screen Name** | Activity Log |
| **Purpose** | View audit trail of user actions within the organization |
| **Module** | Administration |
| **Primary User(s)** | Admin |
| **Inputs** | Filter by user, action type, date range |
| **Outputs** | Filtered activity log |
| **Key Components** | Log table (timestamp, user, action, entity, details), filter bar, export button, pagination |
| **Navigate From** | Sidebar "Administration" → Activity Log |
| **Navigate To** | N/A (read-only) |
| **States** | **Default**: Recent activities. **Empty**: "No activity recorded yet." **Loading**: Table skeleton. **Filtered**: No matching entries. **Error**: "Could not load activity log." |

---

## Screen Count Summary

| Module | Screen Count | Screen Numbers |
|--------|-------------|----------------|
| Authentication & Org Management | 5 | SCR-001 to SCR-005 |
| Project & Study Management | 7 | SCR-006 to SCR-012 |
| Research Design | 3 | SCR-013 to SCR-015 |
| Questionnaire Builder | 5 | SCR-016 to SCR-020 |
| Data Collection | 11 | SCR-021 to SCR-031 |
| Dashboards | 3 | SCR-032 to SCR-034 |
| Reporting | 5 | SCR-035 to SCR-039 |
| Administration | 5 | SCR-040 to SCR-044 |
| **Total** | **44** | |

All 39 P0 MVP features are covered across 44 screens.
