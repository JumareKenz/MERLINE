# Merline Accessibility Requirements

## Standard

Merline meets **WCAG 2.2 Level AA** as a minimum. Where possible, AAA criteria are adopted for critical flows.

Accessibility is treated as a design requirement, not a compliance checklist. Every component must be usable by people with:
- Visual impairments (blindness, low vision, color blindness)
- Hearing impairments
- Motor impairments (limited fine motor control, tremor)
- Cognitive impairments (memory, attention, executive function)
- Temporary or situational limitations (bright sunlight, broken arm, slow network)

---

## 1. WCAG 2.2 AA Compliance Checklist by Component Type

### 1.1 Navigation

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.3.2 Meaningful Sequence | A | Navigation order preserves meaning | Sidebar → Top bar → Content → Footer; DOM order matches visual |
| 1.4.1 Use of Color | A | Color not sole indicator of active state | Active nav item: left border accent + bold text + background color change |
| 2.1.1 Keyboard | A | All navigation accessible via keyboard | Tab through nav items; Enter/Space to activate; arrow keys in nested menus |
| 2.4.1 Bypass Blocks | A | Skip to content link | "Skip to main content" link visible on focus (first tab stop) |
| 2.4.3 Focus Order | A | Focus follows logical order | Sidebar → Breadcrumbs → Tabs → Content → Actions → Footer |
| 2.4.5 Multiple Ways | AA | At least two ways to find content | Navigation sidebar + global search + breadcrumbs |
| 2.4.6 Headings and Labels | AA | Descriptive headings | Sidebar items describe content: "Projects", not "Items" |
| 2.4.7 Focus Visible | AA | Visible focus indicator | 2px solid outline with 2px offset; high contrast |

### 1.2 Forms and Inputs

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.1.1 Non-text Content | A | Form instructions have text alternatives | Icons in forms have aria-labels; error icons have text |
| 1.3.1 Info and Relationships | A | Form relationships programmatically determined | `<label>` element with `for` attribute; `fieldset` + `legend` for groups |
| 1.3.5 Identify Input Purpose | AA | Autofill purpose defined | `autocomplete` attributes on name, email, phone, address fields |
| 2.1.1 Keyboard | A | All form controls operable by keyboard | Tab through fields; Enter to submit; Escape to cancel |
| 2.4.6 Headings and Labels | AA | Clear, descriptive labels | Labels above fields; never placeholder-only |
| 3.2.2 On Input | A | No unexpected context change on input | Form input does not auto-submit; explicit submit action required |
| 3.3.1 Error Identification | A | Errors clearly identified | Inline error below field with red border + text description |
| 3.3.2 Labels or Instructions | A | Labels or instructions provided | Label + optional help text below input |
| 3.3.3 Error Suggestion | AA | Suggestions for correction | "Email must include @ symbol. Example: name@organization.org" |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Reversible submissions | Confirmation dialog before destructive form actions; undo available |
| 4.1.2 Name, Role, Value | A | Custom form controls expose accessibility name | All custom selects, date pickers, etc. have proper ARIA attributes |

### 1.3 Data Tables

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.3.1 Info and Relationships | A | Header cells associated with data cells | `<th>` with `scope="col"` or `scope="row"` |
| 1.4.1 Use of Color | A | Status not indicated by color alone | Status cells: color indicator + text label + icon |
| 2.1.1 Keyboard | A | Sort, filter, select via keyboard | Tab to header → Enter to sort; checkbox space to select |
| 2.4.3 Focus Order | A | Logical navigation through table | Header row → data rows left-to-right, top-to-bottom |
| 2.5.8 Target Size | AA | Minimum target size 24x24 CSS px | Sort icons, checkboxes meet minimum target size |

### 1.4 Modals and Dialogs

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.4.13 Content on Hover or Focus | AA | Dismissible tooltips | Tooltip dismissible via Escape or moving focus |
| 2.1.2 No Keyboard Trap | A | Focus can leave modal | Escape closes modal; focus returns to trigger element |
| 2.4.3 Focus Order | A | Focus moves to modal on open | Focus trapped within modal; Tab cycles through modal elements |
| 4.1.2 Name, Role, Value | A | Modal role communicated | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing title |

### 1.5 Notifications and Alerts

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.3.1 Info and Relationships | A | Alert role | `role="alert"` on toast notifications |
| 1.4.1 Use of Color | A | Alert type not color-only | Icon + type text + color for each alert type |
| 2.1.1 Keyboard | A | Dismissible via keyboard | Tab to close button; Enter to dismiss |
| 4.1.3 Status Messages | AA | Status messages announced | Live region (`aria-live="polite"`) for toast messages |

### 1.6 Charts and Visualizations

| Success Criterion | Level | Requirement | Implementation |
|-------------------|-------|-------------|----------------|
| 1.1.1 Non-text Content | A | Charts have text alternatives | `aria-label` describing chart type and key data point |
| 1.3.1 Info and Relationships | A | Data relationships clear | Chart data also available in accessible table below |
| 1.4.1 Use of Color | A | Color not sole meaning | Patterns/texture + labels for color-coded elements |
| 2.4.3 Focus Order | A | Interactive charts keyboard accessible | Tab through data points; Enter to select/drill |

---

## 2. Keyboard Navigation Specification

### 2.1 Global Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Tab` | Move focus forward | Global |
| `Shift+Tab` | Move focus backward | Global |
| `Enter` or `Space` | Activate focused element | Global |
| `Escape` | Close modal, menu, tooltip, dismiss toast | Global |
| `Ctrl+K` or `Cmd+K` | Open global search | Global |
| `Ctrl+\` | Toggle sidebar collapse | Global |
| `Ctrl+Z` | Undo (in form builder) | Form Builder |
| `Ctrl+Shift+Z` | Redo (in form builder) | Form Builder |
| `Ctrl+S` | Save (in form builder, report editor) | Editor contexts |
| `?` | Show keyboard shortcuts help | Global |

### 2.2 Component-Level Keyboard Interaction

**Sidebar Navigation:**
- `Tab` to enter sidebar → `Up/Down Arrow` to navigate items → `Enter` to activate
- `Home` → first item, `End` → last item
- Focus wraps at top/bottom of list

**Data Tables:**
- `Tab` into table → focus on first header → `Left/Right Arrow` between headers
- `Tab` again → focus on first data row → `Up/Down Arrow` between rows
- `Space` on checkbox row to select/deselect
- `Shift+Click` or `Shift+Arrow` for range selection
- `Enter` on row → navigate to detail

**Modals:**
- Focus trapped inside modal on open
- `Tab` cycles through modal elements
- `Shift+Tab` cycles backward
- `Escape` closes modal (unless destructive with confirmation)
- Focus returns to trigger element on close

**Form Builder (Canvas):**
- `Tab` into question list
- `Up/Down Arrow` to navigate between questions
- `Enter` to select question → opens properties panel
- `Ctrl+Arrow` to reorder question
- `Delete` to remove selected question (with confirmation)
- Drag-and-drop has keyboard alternative: "Move up" / "Move down" buttons

**Dropdowns and Selects:**
- `Enter` or `Space` to open
- `Up/Down Arrow` to navigate options
- `Enter` to select option
- `Escape` to close without selecting
- Type to auto-filter option list
- `Home` / `End` to jump to first/last option

---

## 3. Screen Reader Support Requirements

### 3.1 General Requirements

- All interactive elements have descriptive `aria-label` or visible label
- Custom components use appropriate ARIA roles (`button`, `tab`, `progressbar`, etc.)
- Dynamic content updates announced via `aria-live` regions
- Loading states announced: "Loading projects" via `aria-busy`
- Error states announced: "Error loading projects" via `role="alert"`
- Empty states announced: "No projects found"
- Images have meaningful `alt` text (decorative images have `alt=""`)
- Status changes announced (e.g., "Study approved" toast)

### 3.2 Component-Specific Requirements

| Component | ARIA Attribute | Value |
|-----------|---------------|-------|
| Sidebar | `role="navigation"` `aria-label="Main navigation"` | |
| Breadcrumb | `nav` with `aria-label="Breadcrumb"` | |
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected` | |
| Data Table | `role="table"`, `aria-label` describing content | |
| Sortable Column | `aria-sort="ascending"` / `"descending"` / `"none"` | |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | |
| Toast | `role="alert"` + `aria-live="polite"` | |
| Progress Bar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | |
| Form Error | `aria-describedby` on input pointing to error element | |
| Required Field | `aria-required="true"` + `*` visual indicator | |
| Skip Link | First tab stop: "Skip to main content" | |
| Chart (decorative) | `role="img"` with `aria-label` summarizing data | |
| Chart (interactive) | Keyboard navigable data points + accessible data table below | |

### 3.3 Announcement Patterns

| Event | Announcement |
|-------|-------------|
| Page loaded | "Projects page loaded. 15 projects." |
| Table sorted | "Sorted by name, ascending." |
| Filter applied | "Status filter: Active. 8 results." |
| Item selected | "3 items selected." |
| Toast appears | "Study approved. [Link to study]" |
| Error occurs | "Error: Could not save changes. Please try again." |
| Action completed | "Submission approved." |
| Async action started | "Report generation started. You'll be notified when complete." |
| Async action complete | "Report ready for review." |

---

## 4. Color Contrast Requirements

### 4.1 Minimum Contrast Ratios

| Context | Ratio | Standard |
|---------|-------|----------|
| Normal text (<18pt) | 4.5:1 | AA |
| Large text (≥18pt or ≥14pt bold) | 3:1 | AA |
| UI components and graphical objects | 3:1 | AA |
| Normal text (enhanced) | 7:1 | AAA (target) |
| Large text (enhanced) | 4.5:1 | AAA (target) |

### 4.2 Color Palette Contrast

| Token | Foreground | Background | Ratio | Pass |
|-------|-----------|------------|-------|------|
| Text primary | #1A1A1A | #FFFFFF | 16.7:1 | AAA |
| Text secondary | #5A5A5A | #FFFFFF | 7.1:1 | AAA |
| Text disabled | #9A9A9A | #FFFFFF | 3.5:1 | AA (large only) |
| Link | #1A6DB5 | #FFFFFF | 5.9:1 | AAA |
| Error text | #BC1C1C | #FFFFFF | 7.8:1 | AAA |
| Success text | #1E7E34 | #FFFFFF | 5.4:1 | AAA |
| Warning text | #8A6100 | #FFFFFF | 5.5:1 | AAA |
| Info text | #1A6DB5 | #FFFFFF | 5.9:1 | AAA |
| Button primary | #FFFFFF | #1A6DB5 | 5.9:1 | AAA |
| Button danger | #FFFFFF | #BC1C1C | 7.8:1 | AAA |
| Input border | #5A5A5A | #FFFFFF | 7.1:1 | AAA |
| Selected row | #1A6DB5 | #E8F0FE | 4.8:1 | AA |

### 4.3 RAG Status Color Alternatives

RAG (Red/Amber/Green) status indicators must not rely on color alone:

- **Red**: Red circle + "X" icon + text label "Off Track"
- **Amber**: Yellow circle + "!" icon + text label "At Risk"
- **Green**: Green circle + "✓" icon + text label "On Track"
- Additional visual: pattern overlay (stripes for red, solid for green)
- Tooltip on hover: numeric value and threshold

### 4.4 Focus Indicator

- Visible focus ring: 2px solid (#1A6DB5) + 2px offset
- High contrast mode: outline remains visible regardless of background
- Never removed via `outline: none` without providing alternative

---

## 5. Focus Management

### 5.1 Page Navigation

- First focusable element: "Skip to main content" link
- Second: Global search (Ctrl+K)
- Then: Sidebar navigation → Breadcrumb → Main content → Actions
- Focus order matches visual order (left-to-right, top-to-bottom)
- No focus jumps or unexpected reordering

### 5.2 Dynamic Content

| Scenario | Focus Behavior |
|----------|----------------|
| Modal opens | Focus moves to first focusable element inside modal |
| Modal closes | Focus returns to element that triggered modal |
| New page loads | Focus moves to `<h1>` of new page |
| Error appears | Focus moves to first error field |
| Toast appears | Announcement only (focus not moved) |
| Sorted table | Focus stays on sorted column header |
| Filter applied | Focus stays on filter control |
| Item deleted | Focus moves to next item in list (or parent container) |
| Section collapsed | Focus stays on collapse trigger |
| Section expanded | Focus moves to first focusable in expanded section |

### 5.3 Tab Traps (Intentional)

Only in:
- Modals (focus contained; Escape to exit)
- Slide-in panels (focus contained; Escape to close)
- Full-screen editors (Form Builder, Report Editor)

---

## 6. Reduced Motion Support

### 6.1 Media Query

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all non-essential animations */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.2 Affected Components

| Animation | Reduced Motion Alternative |
|-----------|---------------------------|
| Page transitions (slide) | Instant appear |
| Modal open (fade + scale) | Instant appear |
| Toast slide in | Instant appear |
| Skeleton pulse | Static gray placeholder |
| Progress bar fill | Instant jump to percentage |
| Drag-and-drop animation | Instant reposition |
| Chart transitions | Instant data display |
| Loading spinner (rotating) | Static hourglass icon or progress bar |
| Scroll animations | No animation; content in place |

---

## 7. Touch Target Sizes

### 7.1 Minimum Sizes

| Context | Minimum Size | WCAG |
|---------|-------------|------|
| All touch targets | 24 x 24 CSS px | AA (2.5.8) |
| Critical actions (Submit, Sync, Save) | 48 x 48 CSS px | AAA (target) |
| Links in text | 44 x 44 CSS px (with padding) | — |
| Form inputs (mobile) | 48px height | — |
| Bottom tab bar items | 56 x 56 CSS px | — |
| Filter chips | 40px height | — |
| Drag handles | 44 x 44 CSS px | — |

### 7.2 Spacing Between Targets

- Minimum 4px between interactive elements (AA requirement)
- 8px preferred between actionable buttons
- No overlapping touch targets

---

## 8. Form Accessibility Patterns

### 8.1 General Form Structure

```
<form aria-label="Create study" novalidate>
  <div role="group" aria-labelledby="basic-info">
    <h3 id="basic-info">Basic Information</h3>
    
    <label for="study-name">Study name <span aria-hidden="true">*</span></label>
    <input id="study-name" 
           type="text" 
           required 
           aria-required="true"
           aria-describedby="study-name-hint study-name-error"
           maxlength="500">
    <span id="study-name-hint" class="hint">A descriptive title for your study</span>
    <span id="study-name-error" class="error" role="alert"></span>
  </div>
</form>
```

### 8.2 Error Announcement

- Errors announced via `aria-live="polite"` region
- Focus moves to first error field
- Error list at top of form: "There are 3 errors in this form"
- Each error links to its corresponding field

### 8.3 Multi-Step Forms (Wizard)

- Current step announced: "Step 2 of 5: Methodology"
- Progress indicator has `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Form validation on "Next" button
- All data preserved when navigating between steps

### 8.4 Drag-and-Drop (Alternatives)

- Every draggable item has keyboard alternatives: "Move up" / "Move down" buttons
- Target area receives focus for keyboard reordering
- Drop state announced: "Question moved to position 3"

---

## 9. Data Table Accessibility

### 9.1 Table Structure

- `<table>` with `<caption>` for title
- `<thead>` with `<th scope="col">` for columns
- `<tbody>` with `<th scope="row">` for row headers (if applicable)
- Sorting: `aria-sort` on column headers
- Selection: checkbox with `aria-label="Select row N"`
- `aria-rowcount` and `aria-colcount` for large tables

### 9.2 Table Interactions for Screen Readers

- Sort: "Activate to sort by [column name]"
- Filter: "Filter applied: [filter name]"
- Selection: "Row N selected. 3 of 15 selected."
- Pagination: "Page 3 of 12. Showing 51-75 of 300."

### 9.3 Responsive Tables

- On small screens, table transforms to list layout
- Each row becomes a card with labeled fields
- Relationship between label and value preserved via `aria-label`
- Sort/filter controls remain accessible

---

## 10. Testing Requirements

| Test Type | Frequency | Tools |
|-----------|-----------|-------|
| Automated accessibility audit | Per commit (CI) | axe-core, Lighthouse |
| Keyboard-only navigation | Per feature | Manual testing |
| Screen reader testing | Per release | NVDA (Windows), VoiceOver (Mac), TalkBack (Android) |
| Color contrast audit | Per design review | Stark, Colour Contrast Analyser |
| Reduced motion testing | Per release | Browser devtools toggle |
| Zoom testing (200%) | Per feature | Browser zoom |
| Touch target testing | Per mobile release | Mobile device testing |
| User testing with disabilities | Per major release | Recruitment via accessibility organizations |
| WCAG 2.2 AA conformance audit | Annual | Third-party auditor |
