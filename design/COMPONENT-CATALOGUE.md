# Merline Component Catalogue

## Overview

This catalogue defines every reusable UI component in the Merline design system. Each component includes its purpose, variants, states, accessibility requirements, and usage guidelines.

**Total Components: 53**

---

## 1. Buttons (7 variants × 5 sizes × 5 states)

### 1.1 Primary Button

| Property | Specification |
|----------|--------------|
| Purpose | Primary call to action — most important action on screen |
| Background | `--color-primary-500` |
| Text | White (#FFFFFF), 14px, 500 weight |
| Padding | 12px 20px (default), 8px 16px (small), 16px 28px (large) |
| Border radius | `--radius-md` (6px) |
| Icon | Optional, 16px (sm) / 20px (default/lg), left or right |

**States:**
```
Default:  #0D7377 bg, white text
Hover:   #0A5E61 bg, white text (shadow-1)
Active:  #074A4C bg, white text
Focus:   #0D7377 + 2px outline offset-2
Disabled: #E9ECEF bg, #ADB5BD text, not clickable
Loading: Shows 16px spinner left of text, disabled
```

### 1.2 Secondary Button

| Property | Specification |
|----------|--------------|
| Purpose | Alternative action — important but not primary |
| Border | 1px solid `--border-default` |
| Background | Transparent |
| Text | `--text-primary` |

**States:**
```
Default:  transparent bg, 1px #DEE2E6 border
Hover:   #F1F3F5 bg, 1px #CED4DA border
Active:  #E9ECEF bg, 1px #ADB5BD border
Focus:   2px outline on primary
Disabled: transparent, #E9ECEF border, #ADB5BD text
```

### 1.3 Ghost Button

| Property | Specification |
|----------|--------------|
| Purpose | Low emphasis action — secondary or tertiary |
| Background | Transparent, no border |
| Text | `--text-secondary` |

**States:**
```
Default:  transparent bg, secondary text
Hover:   rgba(0,0,0,0.04) bg (light) / rgba(255,255,255,0.06) (dark)
Active:  rgba(0,0,0,0.08) bg
Focus:   2px outline
Disabled: #ADB5BD text
```

### 1.4 Danger Button

| Property | Specification |
|----------|--------------|
| Purpose | Destructive actions — delete, archive, reject |
| Background | `--color-error` (#BC1C1C) |
| Text | White |

**States:**
```
Default:  #BC1C1C bg, white text
Hover:   #A01515 bg
Active:  #800C0C bg
Focus:   #BC1C1C outline
Disabled: #F5C2C2 bg, #E08787 text
```

### 1.5 Link Button

| Property | Specification |
|----------|--------------|
| Purpose | Text-link styled button for inline actions |
| Background | Transparent, no border |
| Text | `--text-link` (#0D7377), underlined on hover |

**States:**
```
Default:  transparent, link color
Hover:   underlined
Active:  #074A4C
Focus:   2px outline
Disabled: #ADB5BD, not underlined
```

### 1.6 Button Sizes

| Size | Height | Padding | Font Size | Icon Size |
|------|--------|---------|-----------|-----------|
| xs | 28px | 6px 12px | 12px | 14px |
| sm | 32px | 8px 14px | 13px | 16px |
| md (default) | 40px | 10px 20px | 14px | 16px |
| lg | 48px | 12px 24px | 16px | 20px |
| xl | 56px | 16px 32px | 18px | 24px |

### 1.7 Icon-Only Button

Same sizes as text buttons. Square aspect ratio. Tooltip on hover describes action. `aria-label` required.

### 1.8 Button Group

```
[ Primary ] [ Secondary ] [ Ghost ]
```

- Spacing: 8px between buttons
- Primary always leftmost
- Danger buttons have 12px gap from other types (prevention)
- Button groups have `role="group"` and `aria-label`

---

## 2. Inputs (8 types × 4 states)

### 2.1 Text Input

| Property | Specification |
|----------|--------------|
| Height | 40px (default), 48px (large) |
| Padding | 10px 12px |
| Border | 1px solid `--border-default` |
| Border radius | `--radius-sm` (4px) |
| Background | `--bg-inset` |
| Text | `--text-primary`, 16px (to prevent iOS zoom) |
| Label | 14px, 500 weight, above input, 4px gap |
| Help text | 12px, `--text-secondary`, below input, 4px gap |
| Placeholder | `--text-tertiary` |

**States:**
```
Default:  #F1F3F5 bg, #DEE2E6 border
Hover:   #F1F3F5 bg, #CED4DA border
Focus:   white bg, 2px #0D7377 border, shadow-1
Active:  white bg, #ADB5BD border
Disabled: #F1F3F5 bg, #E9ECEF border, disabled text
Error:   white bg, #BC1C1C border, error icon right
Success: white bg, #1E7E34 border, check icon right
Read-only: #F8F9FA bg, no border change
```

### 2.2 Textarea

Same as text input with:
- Min height: 80px (3 lines)
- Auto-resize up to 320px (12 lines)
- Character count bottom-right (when `maxLength` set)
- Resize handle: bottom-right corner, `--color-neutral-300`

### 2.3 Number Input

Same as text input with:
- Stepper buttons (increment/decrement) inside right side
- Min/max validation on blur
- Step increment (default 1)
- Decimal support via `step` attribute

### 2.4 Select Dropdown

| Property | Specification |
|----------|--------------|
| Chevon icon | Right-aligned, 16px, `--text-tertiary` |
| Dropdown panel | Shadow-2, 4px below input, same width as input |
| Options | 40px height, 12px padding, hover state |
| Search | Input at top of dropdown for 10+ options |
| Empty option | "No options found" |

**States:**
```
Dropdown closed: Same as text input
Dropdown open: Panel appears with slide animation (100ms)
Option hover: #F1F3F5 bg
Option selected: primary-50 bg (#EBF5F5) + checkmark icon
Option disabled: #F1F3F5, disabled text
```

### 2.5 Multi-Select

Same as select with:
- Selected values shown as removable chips inside input
- Dropdown with checkboxes per option
- "N selected" counter when many selected
- Clear all button

### 2.6 Date Picker

| Property | Specification |
|----------|--------------|
| Trigger | Text input with calendar icon |
| Panel | Shadow-3, calendar grid, 320px × 360px |
| Navigation | Chevron left/right for month, month name clickable for year |
| Selection | Single date click, range click-and-drag |
| Today | Circle indicator |
| Selected | Primary bg, white text |

### 2.7 Search Input

| Property | Specification |
|----------|--------------|
| Icon | 16px search icon left-aligned |
| Clear | X icon appears when text entered |
| Debounce | 300ms |
| Height | 40px |
| Placeholder | "Search..." with context-specific text |

### 2.8 Form Field Composition

```
┌─────────────────────────────────────────┐
│ Label *                              [ℹ]│  ← 14px, 500 weight
│ ┌───────────────────────────────────────┐│
│ │ Input                                 ││  ← 40px height
│ └───────────────────────────────────────┘│
│ Help text about this field              │  ← 12px, secondary
│ Error message (when applicable)         │  ← 12px, error color
└─────────────────────────────────────────┘
```

---

## 3. Forms

### 3.1 Form Structure

```
<form>
  <FormSection label="Basic Information">
    <FormField label="Study Name" required hint="A descriptive title">
      <Input />
    </FormField>
    <FormField label="Methodology">
      <Select options={[...]} />
    </FormField>
  </FormSection>
</form>
```

| Element | Spec |
|---------|------|
| Section spacing | 32px between sections |
| Field spacing | 20px between fields |
| Label | 14px, 500 weight, above field |
| Required indicator | Red asterisk `*` after label |
| Help text | 12px, secondary, below field |
| Error text | 12px, error color, below help text |
| Valid text | 12px, success color, below help text |

### 3.2 Validation States

```
Valid:    Green border + checkmark icon
Invalid:  Red border + X icon + error message below
Warning:  Amber border + warning icon + message below
Loading:  Spinner icon on right of input
```

### 3.3 Form Layouts

| Type | Columns | Max Width |
|------|---------|-----------|
| Simple | 1 column | 600px |
| Dense | 2 columns | 800px |
| Wizard | 1 column, stepped | 720px |
| Inline | Horizontal label + field | Variable |

---

## 4. Data Tables

### 4.1 Standard Table

| Property | Specification |
|----------|--------------|
| Header | `--bg-surface`, 14px, 600 weight, uppercase optional |
| Rows | Alternating (even: transparent, odd: `--bg-surface` at 50%) |
| Row height | 48px (default), 40px (compact), 56px (comfortable) |
| Padding | 12px 16px |
| Border | Horizontal `--border-subtle` between rows |
| Hover | `--bg-hover` on row |
| Selected | `--color-primary-50` background + left border |

### 4.2 Table Components

| Feature | Implementation |
|---------|---------------|
| Sort | Click header to cycle: none → asc → desc |
| Filter | Filter chips above table + "Filters" button |
| Selection | Checkbox column (first), Shift+click for range |
| Bulk actions | Floating bar: "N selected" + action buttons |
| Pagination | "Showing 1-25 of 100" + page controls |
| Column resize | Drag handle on header right edge |
| Column reorder | Drag header to new position |
| Row actions | Menu button on last column or row hover action |

### 4.3 Table Empty State

```
┌──────────────────────────────────────┐
│ Empty state illustration             │
│ "No submissions yet"                 │
│ "Deploy a questionnaire to begin."   │
│ [Go to Assignments]                  │
└──────────────────────────────────────┘
```

---

## 5. Cards

### 5.1 Card Variants

| Type | Background | Border | Shadow | Padding | Radius |
|------|-----------|--------|--------|---------|--------|
| Default | `--bg-elevated` | None | shadow-1 | 20px | lg (8px) |
| Clickable | `--bg-elevated` | None | shadow-1, shadow-2 on hover | 20px | lg |
| Selected | `--color-primary-50` | 2px primary | shadow-2 | 20px | lg |
| With header | `--bg-elevated` | None | shadow-1 | 0 (header: 20px, body: 20px) | lg |
| Elevated | `--bg-elevated` | None | shadow-3 | 24px | lg |
| Bordered | Transparent | 1px `--border-subtle` | none | 20px | lg |

### 5.2 Card Composition

```
┌──────────────────────────────────────┐
│ [Icon] Title                    [⋯]  │  ← Header row
├──────────────────────────────────────┤
│ Content area                         │  ← Body
│                                      │
├──────────────────────────────────────┤
│ Action row: [link]      [Button]     │  ← Footer
└──────────────────────────────────────┘
```

### 5.3 Clickable Card

- Entire card is a single link (`role="link"`, `tabindex="0"`)
- Hover: shadow-2, subtle lift transform (translateY(-2px))
- Active: shadow-1, translateY(0)
- Focus: 2px outline on card container
- Keyboard: Enter/Space to activate

---

## 6. Modals (5 types)

### 6.1 Modal Types

| Type | Width | Close | Animation |
|------|-------|-------|-----------|
| Alert | 400px | Button click only | Fade + scale (200ms) |
| Confirmation | 480px | Escape or outside click | Fade + scale |
| Form | 520px | Escape or outside click | Fade + scale |
| Slide-in panel | 560px | Escape, outside, or X button | Slide from right (300ms) |
| Full-screen | 100% | X button or Escape | Fade |

### 6.2 Modal Structure

```
┌──────────────────────────────────────┐
│ Title                           [✕]  │  ← Header: 20px padding
├──────────────────────────────────────┤
│ Content / Body                       │  ← Body: scrollable, 20px padding
│                                      │
├──────────────────────────────────────┤
│ [Cancel]                    [Submit]  │  ← Footer: 16px padding, flex-end
└──────────────────────────────────────┘
```

### 6.3 Modal Behavior

| Behavior | Implementation |
|----------|---------------|
| Backdrop | `--opacity-overlay` (50% black), z-overlay |
| Focus trap | Tab cycles within modal; Shift+Tab reverses |
| Initial focus | First focusable element (or primary button) |
| Return focus | Element that triggered modal |
| Scroll lock | Body scroll disabled while modal open |
| Escape | Closes (except alert modals) |
| Confirmation | Unsaved changes prompt if form is dirty |

### 6.4 Confirmation Modal

```
┌──────────────────────────────────────┐
│ ⚠ Archive Study?                     │
│                                      │
│ This will prevent new submissions.   │
│ Existing data will be preserved.     │
│                                      │
│ [Cancel]            [Archive Study]  │
└──────────────────────────────────────┘
```

---

## 7. Navigation (5 types)

### 7.1 Sidebar

| Property | Specification |
|----------|--------------|
| Expanded width | 280px |
| Collapsed width | 64px |
| Background | `--bg-surface` |
| Border right | 1px `--border-subtle` |
| Transition | 200ms, ease-standard |

**Items:**
```
Active:   Primary-50 bg (light) / primary-900 (dark), left border 3px primary-500
Hover:    --bg-hover
Inactive: transparent bg, secondary text
Collapsed: icon only, tooltip on hover
```

### 7.2 Top Navigation Bar

| Property | Specification |
|----------|--------------|
| Height | 56px |
| Background | `--bg-elevated` |
| Border bottom | 1px `--border-subtle` |

**Elements (left to right):**
```
Sidebar toggle | Breadcrumb | (flex-grow) | Notifications | Help | Profile
```

### 7.3 Tabs (Underline)

```
Active:   Underline 2px primary-500, text primary-900 semibold
Inactive: Text secondary, hover: text primary
Badge:    Counter in primary-50 bg, primary-500 text
Overflow: Horizontal scroll with fade edges
```

### 7.4 Breadcrumbs

```
Projects / Health Program / Baseline Survey (current)
   ↑ link       ↑ link           ↑ not linked
```

- Separator: `›` chevron (16px, tertiary color)
- Max 4 levels; truncate with "..." + tooltip
- Each segment is clickable except current

### 7.5 Pagination

```
[< Prev]  1  2  3 ...  12  13  [Next >]
```

- Page numbers: 40x40px square, border-radius sm
- Active: primary-500 bg, white text, semibold
- Inactive: hover bg, primary text
- Ellipsis for large gaps
- Total count: "Showing 1-25 of 300"

---

## 8. Notifications (5 types)

### 8.1 Toast

| Property | Specification |
|----------|--------------|
| Position | Bottom-right (desktop), Top (mobile) |
| Max visible | 3 (older stack/collapse) |
| Width | 380px (desktop), full width - 32px (mobile) |
| Padding | 12px 16px |
| Border radius | md (6px) |
| Shadow | shadow-5 |
| Animation | Slide in from right (200ms), fade out (200ms) |

**Types:**
```
Success:  green left border, checkmark icon
Error:    red left border, X icon, persistent
Warning:  amber left border, warning icon, 5s
Info:     blue left border, info icon, 4s
Offline:  gray left border, signal icon, persistent
```

### 8.2 Banner

| Property | Specification |
|----------|--------------|
| Position | Below top nav, full width |
| Height | 48px |
| Animation | Slide down from top |

**Types:**
```
Info:     blue bg, white text
Warning:  amber bg, dark text
Error:    red bg, white text
Offline:  gray bg, white text
```

### 8.3 Inline Alert

Shown within a card or section context. Uses same semantic color system. Left border accent + background tint.

### 8.4 Badge

```
Count badge:  20px height, 8px horizontal padding, primary-500 bg, 11px white text
Status badge: 22px height, 12px padding, 11px text, status-colored bg + icon
Dot badge:    8px circle, absolute positioned top-right
```

### 8.5 Alert Dialog

Full modal for critical alerts. No close button. Must be explicitly dismissed by action button.

---

## 9. Avatars and Badges

### 9.1 Avatar

| Size | Dimension | Font Size | Usage |
|------|-----------|-----------|-------|
| xs | 24px | 10px | Table cells, comments |
| sm | 32px | 12px | User lists |
| md | 40px | 16px | Default, profile |
| lg | 56px | 22px | Profile page, cards |
| xl | 80px | 32px | Large profile, empty states |

**Variants:**
```
Image:    Rounded-full, object-fit cover
Initials: bg-color based on hash of user ID, white text
Online:   8px green dot bottom-right
Offline:  No dot (clean)
```

### 9.2 Badge Component

| Variant | Background | Text Color | Border Radius |
|---------|-----------|------------|---------------|
| Neutral | #F1F3F5 | #495057 | 4px |
| Primary | #EBF5F5 | #0D7377 | 4px |
| Success | #E8F5E9 | #1E7E34 | 4px |
| Warning | #FFF8E1 | #8A6100 | 4px |
| Error | #FFEBEE | #BC1C1C | 4px |
| New | #EEF2FF | #4F46E5 | 4px |

---

## 10. Progress Indicators (4 types)

### 10.1 Linear Progress

| Property | Specification |
|----------|--------------|
| Height | 4px (default), 6px (large), 2px (thin) |
| Track | `--color-neutral-200` |
| Fill | `--color-primary-500` |
| Radius | `--radius-full` |
| Animation | Fill width transition (300ms ease) |
| Indeterminate | Animated shimmer across full width |

### 10.2 Circular Progress

| Property | Specification |
|----------|--------------|
| Size | 20px (inline), 32px (section), 48px (page), 64px (large) |
| Stroke | 3px (small), 4px (medium), 6px (large) |
| Track | `--color-neutral-200` |
| Fill | `--color-primary-500` |
| Label | Center: percentage text |

### 10.3 Skeleton

```
Line skeleton:  height 12-16px, full width, border-radius 4px
Card skeleton:  height matches card, border-radius lg, width matches
Table skeleton: row height 48px, alternating widths (60%, 80%, 40%)
Chart skeleton: shape-matched placeholder with bar/line outlines
```

Animation: Pulse animation (opacity 0.1 → 0.15 → 0.1) at 1.5s cycle.

### 10.4 Spinner

| Size | Dimension | Stroke | Usage |
|------|-----------|--------|-------|
| sm | 16px | 2px | Inline with button text |
| md | 24px | 3px | Section loading, small areas |
| lg | 40px | 4px | Page loading areas |

---

## 11. Empty States

### 11.1 Empty State Template

```
┌──────────────────────────────────────────────┐
│                                              │
│           [Illustration / Icon]               │
│               64-120px                        │
│                                              │
│              Title (h3, centered)             │
│         "No projects yet"                     │
│                                              │
│         Subtitle (body, centered,             │
│          secondary color)                     │
│   "Create your first project to get started"  │
│                                              │
│           [Primary CTA Button]                │
│                                              │
│           Secondary: [Learn more]             │
│                                              │
└──────────────────────────────────────────────┘
```

- Illustration area: 120px × 120px max
- Centered layout with generous vertical spacing (32px between elements)
- Primary CTA: Button
- Secondary: Text link
- No more than 3 lines of subtitle text

---

## 12. Charts and Data Visualization

See detailed specification in `DATA-VISUALIZATION.md`.

### Chart Component Inventory

| Component | Variants |
|-----------|----------|
| BarChart | Vertical, horizontal, stacked, grouped |
| LineChart | Single, multi-series, with area, with confidence band |
| AreaChart | Stacked, overlapping, with threshold |
| PieChart | Donut, semi-donut, with center label |
| ScatterPlot | With regression, with quadrant, bubble |
| Heatmap | Calendar, matrix, geographic |
| Gauge | Semi-circle, with range, with target marker |
| KPI | Single value, with trend, with comparison |
| Map | Point markers, heatmap, choropleth, clusters |
| Sparkline | Inline mini line chart for tables/cards |

---

## 13. AI Interaction Components

### 13.1 AI Suggestion Card

```
┌─ [✨] AI Suggestion ──────────────────────┐
│                                           │
│ Based on your study type (Baseline),      │
│ we recommend a stratified random sample   │
│ of 1,200 households.                      │
│                                           │
│ [Apply] [Dismiss] [Learn Why]             │
│                                           │
│ Confidence: High (88%)                    │
└───────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Header | Secondary (indigo) icon + "AI" label |
| Body | Secondary text, 14px |
| Confidence | Progress bar or percentage, right-aligned |
| Actions | Apply (primary), Dismiss (ghost), Learn Why (link) |
| Border | 1px secondary-200 (light) / secondary-700 (dark) |
| Background | secondary-50 (light) / secondary-900 at 30% (dark) |

### 13.2 Confidence Indicator

```
High:     Green bar, 80-100%
Medium:   Amber bar, 50-79%
Low:      Red bar, <50%
```

Show as: small bar + percentage text. Always visible when AI contributes content.

### 13.3 Citation Component

```
High vaccination rates correlate with
community health worker presence [1].

[1] WHO Health Report 2025 · Source: Study #342, Page 12
```

- Superscript number in brackets
- Citation panel expands on click
- Citation includes source name, link, and snippet

### 13.4 AI Feedback Buttons

```
[👍] Helpful    [👎] Not helpful    [✏️] Edit
```

Always present on AI-generated content. Feedback collected anonymously for model improvement.

---

## 14. Component Status Summary

| Component | Variants | States | Status |
|-----------|----------|--------|--------|
| Button | 7 (primary, secondary, ghost, danger, link, icon-only, loading) | 5 (default, hover, active, focus, disabled) | Ready |
| Input | 8 (text, number, select, multi-select, date, time, search, textarea) | 6 (default, hover, focus, active, disabled, error) | Ready |
| Form | 4 layouts | All validation states | Ready |
| Table | 3 (standard, compact, comfortable) | Sort, filter, select, bulk | Ready |
| Card | 6 variants | 4 states per variant | Ready |
| Modal | 5 types | Open, close, loading, error | Ready |
| Navigation | 5 types | Active, hover, collapsed, focus | Ready |
| Notification | 5 types | Show, dismiss, stack, persistent | Ready |
| Avatar | 5 sizes | Image, initials, online indicator | Ready |
| Badge | 6 variants | Default only | Ready |
| Progress | 4 types | Determinate, indeterminate | Ready |
| Empty state | 10+ screen-specific | Default only | Ready |
| Chart | 10+ types | Hover, click, drill-down | Ready |
| AI component | 4 types | Suggestion, confidence, citation, feedback | Ready |

---

## Component Architecture Principles

1. **Every component supports light and dark mode** via CSS custom properties
2. **Every component is keyboard accessible**
3. **Every component has ARIA attributes** where needed
4. **Every component supports `className` override** for edge customization
5. **Every component supports `data-testid`** for testing
6. **Every component is theme-aware** — respects reduced motion and high contrast
7. **No component depends on another component's internal structure**
8. **Composition over configuration** — prefer composable primitives over monolithic components
