# Merline Interaction Specifications

## 1. Navigation Patterns

### 1.1 Sidebar Navigation (Desktop)

**Behavior:**
- Fixed left sidebar, 240px width
- Collapsible to icon-only (64px) via hamburger toggle or `Ctrl+\`
- Active item highlighted with accent color + left border
- Hover reveals tooltip for collapsed state
- Sections separated by subtle dividers
- "Recent Studies" section at bottom (3-5 items, populated from history)
- User avatar + name at bottom with dropdown (Profile, Settings, Logout)

**States:**
| State | Visual |
|-------|--------|
| Default | Expanded, active item highlighted |
| Collapsed | Icons only; tooltip on hover |
| Hover | Background color change on item |
| Active | Left border accent + bold text |

**Mobile adaptation:**
- Sidebar becomes a bottom-drawer overlay
- Triggered by hamburger icon top-left
- Full-screen overlay with backdrop

### 1.2 Top Bar (Contextual)

**Behavior:**
- Breadcrumb trail (always visible): `Projects > [Project] > [Study]`
- Module-specific horizontal tabs below breadcrumbs
- Action buttons right-aligned (Filter, Export, Share, More menu)
- Back button appears when navigating into detail from list
- Breadcrumb segments are clickable for quick upward navigation

**Breadcrumb truncation:**
- Max 4 levels; if exceeded, truncate middle with "..."
- Tooltip on "..." shows full path

### 1.3 Tab Navigation

**Pattern:** Underline tabs (not pills) for module-level navigation
- Active tab: underline + bold text
- Inactive: hover underline animation
- Badge count on tabs where applicable (e.g., "Flags (5)")
- Tabs scroll horizontally on overflow (no wrap)
- Tab state preserved in URL for deep linking

### 1.4 Stepped Wizard

**Pattern for multi-step processes (Create Study, Generate Report):**
- Horizontal step indicator at top
- Steps numbered: `1 → 2 → 3 → 4 → 5`
- Current step highlighted; completed steps show checkmark
- Back/Next navigation at bottom
- "Save as Draft" option persists progress
- Validation on Next (each step validated before advancing)
- Step content changes with slide animation

## 2. Form Design Patterns

### 2.1 Form Layout Principles

- Single-column layout for most forms (proven to reduce errors)
- Two-column only for data-dense forms (e.g., indicator definition)
- Related fields grouped with subtle background or spacing
- Labels above inputs (left-aligned)
- Required fields marked with `*` and subtle red accent
- Help text below inputs in secondary color
- Inline validation on blur (not on keypress — reduces cognitive load)

### 2.2 Input Types

| Data Type | Component | Notes |
|-----------|-----------|-------|
| Short text | Single-line input | Max 255 chars; character counter optional |
| Long text | Textarea | Auto-resize; max 2000 chars |
| Number | Number input | With increment/decrement buttons |
| Date | Date picker | Calendar dropdown; keyboard entry allowed |
| Select (single) | Dropdown | Searchable if >10 options |
| Select (multiple) | Multi-select with chips | Selected options shown as removable chips |
| Yes/No | Toggle switch | Better than radio for binary |
| Rating | Star rating | 1-5 stars |
| Email | Email input | Validates format on blur |
| URL | URL input | Validates format |
| Phone | Phone input | Country code prefix selector |
| Color | Color picker | Preset swatches + custom |

### 2.3 Form Builder (Questionnaire) Pattern

**Layout (3-panel):**
```
┌──────────────┬──────────────────────┬──────────────┐
│ Question     │     Canvas           │  Properties   │
│ Palette      │                      │  Panel        │
│              │  ┌────────────────┐  │              │
│ • Text       │  │ Section A      │  │ Question     │
│ • Number     │  │ Q1. What is... │  │ Text: ____   │
│ • Select One │  │ Q2. How many.. │  │ Type: [ ▼]   │
│ • GPS        │  │ [Add Question] │  │ Required [✓] │
│ • Photo      │  └────────────────┘  │              │
│ • ...        │                      │ Skip Logic   │
│              │                      │ [Configure]  │
│              │                      │              │
│              │                      │ Translation  │
│              │                      │ [Add Lang ▼] │
└──────────────┴──────────────────────┴──────────────┘
```

**Drag-and-drop behavior:**
- Question types draggable from palette to canvas
- Questions reorderable within canvas via drag handle (≡)
- Sections draggable as a block
- Drop zone highlighted on hover (blue outline)
- Scrollable canvas for long forms
- Undo/redo toolbar (Ctrl+Z / Ctrl+Shift+Z)

**Right panel dynamics:**
- Panel content changes based on question type selected
- Number type shows min/max/decimal fields
- Select types show option list editor
- GPS type shows accuracy requirement
- Skip logic tab: "When [this question] = [value], show [question list]"
- Translation tab: language selector + per-language text inputs

**Auto-save:**
- Saves every 30 seconds if changes detected
- Visual indicator: "Saved" (gray) / "Saving..." (animated) / "Unsaved changes" (yellow)
- Form data persisted in localStorage as backup

### 2.4 Skip Logic Configuration

**Pattern:** Visual logic builder (not code)
```
┌───────────────────────────────────────────────┐
│ When question: [Q12. Crop types grown ▼]       │
│ Operator: [is equal to ▼]                      │
│ Value: ["None – no crops grown"]               │
│ Then: [Hide ▼] questions: [Q13 ▼] [Q14 ▼] ... │
│        [Show ▼] section: [Section C ▼]        │
│ [+ Add Condition]  [+ Add Action]              │
└───────────────────────────────────────────────┘
```

**Validation:**
- Detect circular references (Question A → B → C → A)
- Detect orphan targets (referenced question deleted)
- Warn if target is before source in flow order
- Visual indicator on canvas: colored lines connecting source → target
- Toggle: Show/hide logic lines on canvas

## 3. Data Table Interactions

### 3.1 Table Design

**Defaults:**
- Striped rows (subtle alternating background)
- Sticky header on scroll
- Row hover highlight
- Column sort indicators (↑↓) on hover
- Resizable columns (drag handle at column edge)
- Checkbox column for multi-select (first column)

### 3.2 Sorting

- Click column header to sort ascending (↑)
- Click again to sort descending (↓)
- Click third time to remove sort
- Multi-sort: Shift+click additional columns
- Visual: sorted column header bold with arrow
- Server-side sort for datasets >100 rows

### 3.3 Filtering

| Type | Component | Location |
|------|-----------|----------|
| Text search | Search input with debounce (300ms) | Above table |
| Status | Filter chips (horizontal scroll) | Above table |
| Date range | Date picker dropdown | Above table |
| Advanced | "Filters" button → popover panel | Above table right |
| Saved filters | Dropdown with user-saved presets | Above table left |

**Filter behavior:**
- Applied filters shown as removable chips above table
- "Clear All" link when filters active
- URL query params update: `?status=active&sort=-created_at`
- Filter count badge on filter button when active

### 3.4 Selection + Bulk Actions

- Checkbox in header: select all visible / deselect all
- Checkbox per row: select individual
- Shift+click: range select
- Selected count shown in floating bar: "N selected" with action buttons
- Bulk actions: Approve, Reject, Flag, Assign, Export, Delete (with confirmation)
- Bulk bar disappears when selection cleared

### 3.5 Pagination

- "Show X of Y" with Previous/Next buttons
- Page size selector: 25, 50, 100 (default: 25)
- Cursor-based pagination for real-time data (submissions)
- Page-based for stable data (studies, users)
- "Loading more..." when scrolling in infinite scroll mode

## 4. Dashboard Interactions

### 4.1 Widget Grid

**Layout:**
- CSS Grid with responsive columns (1-4 based on viewport)
- Widgets auto-arrange in grid flow
- Resizable widget corners (drag to resize)
- Some widgets draggable to reorder (future: custom layout)

### 4.2 Filtering (Dashboard-Wide)

- Global date range selector at top applies to all widgets
- Per-widget filters via dropdown menu (≡)
- Filtered state shown in widget header: "Q2 2026 | Northern Region"
- "Reset Filters" link clears all applied filters
- Filters reflected in URL for shareable dashboard states

### 4.3 Drill-Down

- Click on chart element (bar, pie segment, data point) to drill down
- Drill-down opens detail panel (slide-in or modal)
- Breadcrumb: "Dashboard > Indicator > Northern Region"
- Back button returns to previous view without losing filter context
- Right-click or long-press for context menu: "View Raw Data", "Export Chart"

### 4.4 Chart Interactions

| Interaction | Behavior |
|-------------|----------|
| Hover data point | Tooltip with exact value |
| Click legend item | Toggle visibility of that series |
| Click chart element | Drill down or navigate to detail |
| Pinch/scroll (touch) | Zoom on time-series charts |
| Double-click | Reset zoom |
| Context menu (right-click) | Export as PNG, Copy data |

## 5. Modal/Dialog Patterns

### 5.1 Modal Types

| Type | Use Case | Width | Close Behavior |
|------|----------|-------|----------------|
| Alert | Confirmation (destructive actions) | 400px | Must click button |
| Dialog | Short forms (invite user, create team) | 480px | Click outside or Esc |
| Panel | Detail view (submission review, indicator detail) | 600px | Click outside or Esc |
| Full-screen | Form builder, report editor | Full | Dedicated close button |
| Tooltip | Quick help, definitions | 300px | Click outside or Esc |

### 5.2 Modal Patterns

**Confirmation dialogs:**
- Title: action being confirmed (e.g., "Archive Study?")
- Body: consequence explanation (e.g., "This will prevent new submissions.")
- Two buttons: Cancel (secondary) + Confirm (primary/destructive)
- Destructive actions: red confirm button
- Hard deletes: require typing "DELETE" to confirm

**Form dialogs:**
- Title matches action
- Single-column form
- Submit + Cancel buttons bottom-right
- Validation on submit (not on every keystroke in modals)
- Esc closes; unsaved changes warning: "You have unsaved changes. Discard?"

**Slide-in panel:**
- Slides from right; width 480-600px
- Backdrop dims rest of page
- Content scrollable within panel
- Close button top-right + Esc
- Panel URL updates for deep linking

## 6. Notification and Alert Patterns

### 6.1 Toast Notifications

| Type | Icon | Duration | Action |
|------|------|----------|--------|
| Success | ✓ Checkmark | 3s | Dismiss; optional Undo |
| Error | ✕ X | Persistent | Dismiss; Retry button |
| Warning | ⚠ Triangle | 5s | Dismiss; optional action |
| Info | ℹ Circle | 4s | Dismiss |
| Offline | 📡 No signal | Persistent | Dismiss when online |

**Position:** Bottom-right (desktop), Top (mobile)
**Stack:** Maximum 3 visible; older ones collapse
**Animation:** Slide in from right, fade out

### 6.2 In-App Notification Center

- Bell icon in top bar with unread count badge
- Click opens notification drawer (slide-in from right)
- Grouped by date (Today, Yesterday, Earlier)
- Each notification: icon, title, timestamp, click to navigate
- "Mark all read" button
- Unread = bold text + blue dot
- Real-time updates via WebSocket (Phase 2+)

### 6.3 Status Indicators

| Pattern | Location | Meaning |
|---------|----------|---------|
| Green dot | Entity status badge | Active, Approved, Synced |
| Yellow dot | Entity status badge | Warning, Pending, Partial data |
| Red dot | Entity status badge | Error, Rejected, Overdue |
| Gray dot | Entity status badge | Draft, Inactive, Archived |
| Spinning | Button, area | Loading in progress |
| Progress bar | Multi-step, upload | X% complete |

## 7. Error Recovery Patterns

### 7.1 Inline Validation Errors

**Pattern:**
- Error message below the invalid field (not above)
- Red border on field
- Error text: specific, actionable ("Enter a valid email address" not "Invalid input")
- Field label stays visible (doesn't change color)
- Multiple errors: all shown simultaneously (not one at a time)
- Error cleared when field value corrected

### 7.2 Form Submission Errors

**Pattern:**
- Toast: "Save failed — [specific reason]"
- Form state preserved (don't clear fields)
- "Retry" button in toast
- Auto-retry for transient errors (network): 3 retries with 2s backoff
- Draft auto-saved locally before submission attempt

### 7.3 Network Errors

| Scenario | User Experience |
|----------|-----------------|
| Offline during form | Continues working; banner "Working offline" |
| Sync interrupted | Auto-resume from checkpoint |
| API timeout | Toast "Taking longer than expected — retrying" |
| Server error (5xx) | "Something went wrong. Please try again." with retry |
| Rate limited | "Too many requests. Please wait N seconds." |

### 7.4 Undo Pattern

- Destructive actions show undo toast for 5 seconds
- Undo available for: Delete draft submission, Archive study (not complete deletion), Remove team member, Reject submission
- Not available for: Hard delete, Export, Send invitation
- "Undo" button in toast triggers reversal API call

## 8. Offline Status Indicators

### 8.1 Desktop Web

| State | Indicator |
|-------|-----------|
| Online | No indicator (clean UI) |
| Offline | Banner at top: "You're offline. Some features may be unavailable." |
| Reconnecting | Banner + spinner: "Reconnecting..." |
| Back online | Toast: "You're back online." + auto-refresh if needed |

### 8.2 Mobile App

| State | Indicator |
|-------|-----------|
| Online | Small icon in status bar (faint signal bars) |
| Offline | Persistent banner: "Offline — data will sync when connected" |
| Low connectivity | Banner: "Slow connection — syncing may take longer" |
| Syncing | Animated sync icon + progress bar |
| Sync complete | Green checkmark + "All synced" |
| Sync error | Red exclamation + "N submissions failed to sync — tap to retry" |

### 8.3 Sync Status Colors (Mobile)

- Green: All synced
- Yellow: Some pending sync
- Red: Sync errors need attention
- Gray: Offline (no connection)

## 9. Sync Status Communication

### 9.1 Submission Sync States

| State | Visual | Description |
|-------|--------|-------------|
| Draft | Pencil icon | Not yet submitted |
| Pending Sync | Up arrow icon | Submitted locally, waiting for upload |
| Syncing | Spinning arrows | Currently uploading |
| Synced | Green checkmark | Successfully uploaded to server |
| Failed | Red exclamation + "Retry" | Upload failed |
| Conflict | Yellow warning icon | Server has newer version; resolution needed |

### 9.2 Background Sync Behavior

- Sync triggers automatically on connectivity change
- Manual sync button available ("Sync All")
- Sync progress shown in notification area
- Large media syncs show per-file progress
- Battery-aware: defers sync when battery < 15%
- Data-aware: prioritizes WiFi for media uploads
- Silent failure: failed items retry with exponential backoff (30s, 2min, 5min, 15min)

## 10. Loading and Progress Patterns

### 10.1 Skeleton Screens

- Content-shaped gray placeholders that pulse
- Match layout of final content (cards, tables, charts)
- Appear instantly (no delay); replaced by content when loaded
- Apply to: list views, detail pages, dashboard widgets

### 10.2 Progress Indicators

| Context | Component | Notes |
|---------|-----------|-------|
| Page load | Skeleton screen | Not spinner |
| Form submission | Button spinner + disabled state | Prevent double-submit |
| File upload | Progress bar (X%) + filename | Cancel button |
| Report generation | Stepped progress with status | "Generating methodology..." |
| Dashboard load | Widget skeleton | Each widget loads independently |
| Data export | Progress overlay | Background: continue working |
| Bulk action | Progress overlay + count | "Processing 5 of 25..." |
| Sync | Progress bar + per-item status | Expandable for details |

### 10.3 Optimistic UI

- List changes reflected immediately (before server confirmation)
- Roll back on error with undo option
- Toast confirms server sync (may show delay)
- Apply to: status changes, approvals, flags, assignment edits

## 11. Empty State Designs

### 11.1 Empty State Template

Every empty screen follows this structure:
```
┌──────────────────────────────────────┐
│                                      │
│          [Illustration]               │
│                                      │
│     Title: What's missing            │
│     Subtitle: Why it's empty         │
│     Action: What to do next          │
│                                      │
│     [Primary CTA button]             │
│                                      │
│     Secondary: [Learn more]          │
│                                      │
└──────────────────────────────────────┘
```

### 11.2 Screen-Specific Empty States

| Screen | Title | Subtitle | CTA |
|--------|-------|----------|-----|
| Project List | "No projects yet" | "Create your first project to organize your studies and team." | "Create Project" |
| Study List | "No studies yet" | "Studies are the core of your research. Start designing one." | "Create Study" |
| Questionnaire Library | "No questionnaires yet" | "Design your first questionnaire to start collecting data." | "Create Questionnaire" |
| Indicator Library | "No indicators yet" | "Indicators measure your progress. Create your first one." | "Create Indicator" |
| Submissions | "No submissions yet" | "Deploy questionnaires to start collecting data from the field." | "Go to Assignments" |
| Reports | "No reports yet" | "Generate your first report from your study data." | "Generate Report" |
| Dashboard | "Welcome to Merline!" | "Your dashboard will populate as you create studies and collect data." | "Create Your First Study" |
| Users | "No users yet" | "Invite your team members to get started." | "Invite Users" |

### 11.3 Filter Empty States

- "No results match your filters"
- Show current active filters as chips
- "Clear all filters" link
- Suggestions: "Try adjusting your search or filter criteria"
- Background: previous full data (dimmed) to show context

### 11.4 Error States (Screen Level)

- Full-page error: centered illustration + message + retry
- Widget-level error: widget shows "Failed to load" with retry (doesn't break page)
- Boundary errors: caught by React error boundary; parent functionality preserved
- "Something went wrong" + "Contact support" + error reference code
