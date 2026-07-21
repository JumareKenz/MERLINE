# Merline Layout System

## 1. Page Layout Templates

### 1.1 Sidebar + Content (Default)

```
┌──────────┬─────────────────────────────────────────────┐
│          │  Breadcrumb                     [Notif] [👤] │  ← Top bar (56px)
│  Sidebar │─────────────────────────────────────────────│
│  (280px) │                                             │
│          │  Page Content                               │
│          │                                             │
│          │  ┌─────────────────────────────────────────┐│
│          │  │  Card/Table/Widget Area                  ││
│          │  └─────────────────────────────────────────┘│
│          │                                             │
└──────────┴─────────────────────────────────────────────┘
```

| Region | Width | Scroll | Background |
|--------|-------|--------|------------|
| Sidebar | 280px (expanded), 64px (collapsed) | Independent | `--bg-surface` |
| Top bar | Full width - sidebar | N/A | `--bg-elevated` |
| Content | Remaining | Page | `--bg-page` |

### 1.2 Full-Width Layout

```
┌────────────────────────────────────────────────────────┐
│  Breadcrumb                              [Notif] [👤]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Full-width content area (dashboard, reports)          │
│                                                        │
│  Max content width: 1600px (centered)                  │
└────────────────────────────────────────────────────────┘
```

**Used for:** Executive Dashboard, Report Viewer, Form Builder

### 1.3 Split-Panel Layout

```
┌────────────────────────┬───────────────────────────────┐
│                        │                               │
│  Left Panel            │  Right Panel                  │
│  (40-60% of width)     │  (60-40% of width)            │
│                        │                               │
│  Master / Detail       │  Context / Properties         │
│  List / Content        │  Preview / Editor             │
│                        │                               │
└────────────────────────┴───────────────────────────────┘
```

**Used for:** Form Builder (question palette + canvas + properties), Submission Detail, Indicator Detail

Resizable divider: 8px grab handle at center. Draggable. Min panel width: 320px.

---

## 2. Dashboard Layout Grid

### 2.1 Dashboard Grid System

```
Desktop (≥1280px):   4 columns
Tablet (768-1279px): 2 columns
Mobile (<768px):     1 column

Gap: 24px (desktop), 20px (tablet), 16px (mobile)
Max content width: 1600px
```

### 2.2 Widget Sizing

| Widget Size | Desktop Columns | Height |
|-------------|-----------------|--------|
| 1x1 (small) | 1 | 200px |
| 2x1 (medium) | 2 | 200px |
| 1x2 (tall) | 1 | 420px |
| 2x2 (large) | 2 | 420px |
| 3x1 (wide) | 3 | 200px |
| 4x1 (full) | 4 | 200px |

### 2.3 Dashboard Layout (Executive)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│   Active Studies │    Submissions   │    Enumerators   │  Quality Score   │
│        12        │     3,247        │        48        │      91%         │
├──────────────────┴──────────────────┴──────────────────┴──────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Map Widget (4 columns)                                            │  │
│  │  Geographic distribution of active studies                         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  ┌────────────────────────────────┐│
│  │  Indicator Tracking (2 cols)    │  │  Alerts & Flags (2 cols)       ││
│  │  Top 10 indicators with RAG    │  │  Recent flags requiring        ││
│  │  status and progress bars      │  │  attention, sorted by urgency  ││
│  └─────────────────────────────────┘  └────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Recent Activity Feed (4 columns)                                 │  │
│  │  Timeline of recent actions across all projects                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Dashboard Widget Header

```
┌───────────────────────────────────────────────────────┐
│ Title                                    [⋯] [↗] [🔄] │  ← 16px padding
├───────────────────────────────────────────────────────┤
│                                                       │
│  Widget content                                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Title | 16px, 600 weight |
| Menu | Three-dot overflow menu |
| Expand | Opens full-screen view |
| Refresh | Manual refresh button |
| Spacing | 16px between widgets |

---

## 3. Form Layout Patterns

### 3.1 Single-Column Form

```
┌────────────────────────────────────────────────────────┐
│  Label                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Input                                            │ │
│  └──────────────────────────────────────────────────┘ │
│  Help text                                            │
│                                                        │
│  Label                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Input                                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [Cancel]                              [Save & Next]  │
└────────────────────────────────────────────────────────┘
```

- Max width: 600px
- Use for: Simple forms, settings, short data entry
- Proven to reduce completion time and errors vs multi-column

### 3.2 Two-Column Form

```
┌────────────────────────┬───────────────────────────────┐
│  Label                 │  Label                        │
│  ┌──────────────────┐  │  ┌─────────────────────────┐ │
│  │ Input             │  │  │ Input                   │ │
│  └──────────────────┘  │  └─────────────────────────┘ │
│                         │                               │
│  Label                 │  Label                        │
│  ┌──────────────────┐  │  ┌─────────────────────────┐ │
│  │ Input             │  │  │ Input                   │ │
│  └──────────────────┘  │  └─────────────────────────┘ │
└────────────────────────┴───────────────────────────────┘
```

- Max width: 800px
- Use for: Data-dense forms, indicator definitions, user profiles
- Fields should be grouped by logical relationship

### 3.3 Wizard Form

```
Step 1  ────  Step 2  ────  Step 3  ────  Step 4  ────  Step 5
  ●           ○             ○             ○             ○

┌────────────────────────────────────────────────────────┐
│                                                        │
│  Step content (single column, 720px max)               │
│                                                        │
│                                                        │
│  [Back]                                    [Continue]  │
└────────────────────────────────────────────────────────┘
```

**Used for:** Create Study, Generate Report, Create Project

### 3.4 Form Field Spacing

| Relationship | Spacing |
|-------------|---------|
| Label to input | 6px |
| Input to help text | 4px |
| Input to error text | 4px |
| Fields within group | 20px |
| Field groups | 32px |
| Form sections | 40px |
| Form to action buttons | 32px |

---

## 4. Responsive Breakpoints

| Name | Min Width | Max Width | Columns | Gutter | Margin | Behavior |
|------|-----------|-----------|---------|--------|--------|----------|
| xs | 0 | 639px | 4 | 16px | 16px | Stack layouts, bottom nav |
| sm | 640px | 1023px | 8 | 20px | 24px | Sidebar collapses to icons |
| md | 1024px | 1279px | 12 | 24px | 32px | Sidebar expanded |
| lg | 1280px | 1599px | 12 | 24px | 40px | Full desktop layout |
| xl | 1600px | + | 12 | 24px | 64px | Max content width 1600px |

### 4.1 Layout Behavior by Breakpoint

| Element | xs (<640px) | sm (640-1023px) | md (1024-1279px) | lg (1280-1599px) | xl (1600px+) |
|---------|------------|-----------------|------------------|------------------|--------------|
| Sidebar | Overlay drawer | Collapsed (64px) | Expanded (280px) | Expanded | Expanded |
| Content padding | 16px | 24px | 32px | 40px | 64px |
| Dashboard columns | 1 | 2 | 3 | 4 | 4 |
| Form width | Full | 100% | 75% | 60% | 60% |
| Max content | 100% | 100% | 1200px | 1200px | 1600px |

### 4.2 Stacking Order

At xs breakpoint, layouts stack vertically in this order:
1. Top bar (contains hamburger + breadcrumb)
2. Content (full width)
3. Bottom navigation bar (mobile)

---

## 5. Content Density Modes

### 5.1 Comfortable (Default)

| Element | Value |
|---------|-------|
| Row height | 56px |
| Card padding | 24px |
| Section spacing | 40px |
| Font size | 16px (body) |
| Touch targets | 48px |

### 5.2 Compact

| Element | Value |
|---------|-------|
| Row height | 40px |
| Card padding | 16px |
| Section spacing | 24px |
| Font size | 14px (body) |
| Touch targets | 40px |

**Toggle:** User preference stored in profile. Default: Comfortable. Access via View menu in data-heavy screens (tables, lists).

---

## 6. Sidebar Behavior

### 6.1 Sidebar States

| State | Width | Content | Animation |
|-------|-------|---------|-----------|
| Expanded | 280px | Icons + labels + sections | 200ms ease |
| Collapsed | 64px | Icons only | 200ms ease |
| Hover (collapsed) | 280px overlay | Icons + labels | 200ms ease, no layout shift |
| Mobile | Full screen - 0px margin | Full sidebar as overlay | 200ms slide from left |

### 6.2 Sidebar Overlay (Mobile)

- Trigger: Hamburger icon top-left
- Overlay: `--opacity-overlay` backdrop
- Width: 100vw (or 280px depending on design)
- Transition: Slide from left, 300ms
- Close: Tap overlay, swipe right, or X button
- Focus trap: When open, focus cycles within sidebar

### 6.3 Sidebar Content

```
┌──────────────────────┐
│ Merline Logo   [≡]   │  ← 56px header
├──────────────────────┤
│ [Icon]  Dashboard    │  ← Active state
│ [Icon]  Projects     │
│ [Icon]  Studies      │  ← Group 1: Primary Workspace
│ [Icon]  Question.    │
│──────────────────────│
│ [Icon]  Data Coll.   │  ← Group 2: Operations
│ [Icon]  Reports      │
│──────────────────────│
│ [Icon]  Admin        │  ← Group 3: Administration
│──────────────────────│
│                      │
│ Recent Studies:      │  ← Dynamic section
│ › Health Baseline    │
│ › Education KAP      │
│                      │
├──────────────────────┤
│ [Avatar] Dr. Amara ▼ │  ← 56px footer
└──────────────────────┘
```

- Groups separated by 8px gap with subtle divider
- Recent studies: 3-5 items, populated from history
- User footer: Avatar, name, role, chevron dropdown

---

## 7. Header and Footer

### 7.1 Top Bar

```
┌────────────────────────────────────────────────────────┐
│ [≡]  Projects > Health > Baseline        🔍 [🔔] [?] │
└────────────────────────────────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Height | 56px |
| Background | `--bg-elevated` |
| Border-bottom | 1px `--border-subtle` |
| Padding | 0 24px |

**Left:** Sidebar toggle (collapsed state), Breadcrumb
**Right:** Global search icon, Notifications (bell + badge), Help (?), Profile avatar

### 7.2 Page Footer

Minimal footer with:
- Version number
- Status indicators (optional)
- No copyright in primary workspace (reserved for marketing/landing pages)

---

## 8. Responsive Adaptation Rules

### 8.1 Table → Card List

At xs breakpoint, data tables transform to card list:
- Each row becomes a card
- Labels appear inline with values
- Actions move to card bottom
- Sort/filter controls remain accessible

### 8.2 Multi-Column → Single Column

At xs and sm breakpoints:
- 2-column forms become 1-column
- Dashboard grid becomes 1-column
- Split panels stack vertically
- Sidebar becomes drawer

### 8.3 Touch Optimization

At xs and sm:
- All touch targets minimum 44px
- Increased spacing between interactive elements (8px min)
- Bottom tab bar replaces sidebar for primary navigation
- Floating action button for primary actions
