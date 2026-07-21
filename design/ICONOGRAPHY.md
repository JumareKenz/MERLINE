# Merline Iconography

## Design Philosophy

Icons in Merline support communication — they never replace it. Icons clarify actions, identify status, and reduce cognitive load. Every icon earns its place.

The icon style is **outline-based, geometric, and precise** — matching the scientific, professional brand identity.

---

## 1. Icon Style

| Property | Specification | Rationale |
|----------|--------------|-----------|
| Style | Outline (line-based) | Clean, professional, works at small sizes |
| Stroke width | 1.5px | Visible at 16px, not heavy at 24px |
| Corner radius | 2px | Consistent with border radius system |
| Cap style | Round | More approachable than square |
| Join style | Round | Clean intersections |
| Filled variants | Reserved for status/active states | Avoid decorative filled icons |

### Icon Grid

```
16px grid:  16×16px viewBox, 1px padding
20px grid:  20×20px viewBox, 1.5px padding
24px grid:  24×24px viewBox, 2px padding
32px grid:  32×32px viewBox, 2px padding
48px grid:  48×48px viewBox, 3px padding
```

---

## 2. Icon Size Tokens

| Token | Size | Usage |
|-------|------|-------|
| `--icon-xs` | 12px | Inline with text, small badges, dot indicators |
| `--icon-sm` | 16px | Default icon for buttons, menu items, table cells |
| `--icon-md` | 20px | Navigation items, card icons, section headers |
| `--icon-lg` | 24px | Feature icons, empty states (main icon), CTAs |
| `--icon-xl` | 32px | Page-level illustrations, section hero icons |
| `--icon-2xl` | 48px | Large empty states, onboarding illustrations |

---

## 3. Icon Color Usage

| Context | Color Token | Example |
|---------|-------------|---------|
| Navigation | `--text-secondary` | Dashboard icon in sidebar |
| Active nav | `--color-primary-500` | Dashboard icon when selected |
| Primary action | `--color-primary-500` | + Add button icon |
| Secondary action | `--text-secondary` | Edit icon in secondary button |
| Danger action | `--color-error` | Delete icon |
| Disabled | `--text-tertiary` | Disabled button icon |
| Status success | `--color-success` | Green checkmark |
| Status warning | `--color-warning` | Amber warning |
| Status error | `--color-error` | Red X |
| Status info | `--color-info` | Blue info |
| AI feature | `--color-secondary-500` | AI suggestion icon |
| On brand bg | `#FFFFFF` | Icon on primary button |

### Icon Color Rules

- Icons inherit text color by default
- Use `currentColor` for SVG fill/stroke
- Never use hardcoded icon colors — always use CSS tokens
- Interaction icons (add, edit, delete) use semantic colors for emphasis
- Decorative icons use secondary text color

---

## 4. Icon Categories

### 4.1 Navigation Icons

| Icon | Usage |
|------|-------|
| Dashboard | Executive Dashboard sidebar |
| Folder | Projects module |
| Clipboard | Studies module |
| Form | Questionnaires module |
| BarChart | Reports module |
| Map | Data Collection (web) |
| Settings | Administration |
| Users | User management |
| Shield | Security, permissions |

### 4.2 Action Icons

| Icon | Usage |
|------|-------|
| Plus | Create, add |
| Pencil | Edit |
| Trash | Delete |
| Copy | Duplicate |
| Download | Export, download |
| Upload | Import, upload |
| Share | Share, send |
| Link | Link, reference |
| Search | Global search, search within list |
| Filter | Filter controls |
| Sort | Sort controls |
| MoreHorizontal | Overflow menu (three dots) |
| MoreVertical | Context menu |
| ChevronDown | Dropdown indicators |
| ChevronLeft | Back, collapse |
| ChevronRight | Forward, expand |
| ChevronUp | Collapse up |
| X | Close, dismiss, clear |
| Check | Confirm, approve, complete |
| Undo | Undo action |
| Refresh | Refresh, reload |
| Play | Start, preview |
| Pause | Pause submission |
| Stop | Stop, cancel action |
| Save | Save draft |

### 4.3 Status Icons

| Icon | Usage |
|------|-------|
| CheckCircle | Success, complete, approved |
| XCircle | Error, failed, rejected |
| AlertTriangle | Warning, at risk |
| Info | Information, help content |
| HelpCircle | Question, unknown |
| Clock | Pending, awaiting, in progress |
| Ban | Blocked, disabled |
| Shield | Verified, secure |
| Eye | Visible, viewed |
| EyeOff | Hidden, confidential |
| Flag | Flagged, needs attention |
| Star | Favorite, important |

### 4.4 File Type Icons

| Icon | Usage |
|------|-------|
| File | Generic file |
| FileText | Document (PDF, Word) |
| FileSpreadsheet | CSV, Excel |
| FileImage | Photo, image |
| FileVideo | Video recording |
| FileAudio | Audio recording |
| FileCode | Code, API payload |
| Folder | Directory, project |

### 4.5 Object Icons

| Icon | Usage |
|------|-------|
| Calendar | Date picker, schedule |
| Clock | Time, duration |
| MapPin | Location, GPS |
| Globe | Region, country |
| Building | Organization |
| User | User, profile |
| Users | Team, group |
| Mail | Email, message |
| Bell | Notifications |
| Camera | Photo capture |
| Microphone | Audio capture |
| Location | GPS coordinates |
| Smartphone | Mobile device |
| Database | Data, storage |
| Graph | Chart, analytics |
| Target | Indicator, goal |
| Layers | Multi-level, sections |
| Tag | Label, category |
| Gift | Feature, new, upgrade |
| Zap | AI, automation, fast |
| Brain | AI intelligence |
| Sparkles | AI suggestion, smart |

### 4.6 Social / Communication Icons

| Icon | Usage |
|------|-------|
| MessageCircle | Chat, comments |
| MessageSquare | Feedback form |
| Send | Send message |
| Paperclip | Attachment |
| AtSign | Mention, @ tag |
| ThumbsUp | Positive feedback |
| ThumbsDown | Negative feedback |
| ExternalLink | Open in new tab |

---

## 5. Icon Usage Guidelines

### 5.1 Icon + Text

```
[Icon] 16px    Label text 14px
              ─── 8px gap ───
```

| Context | Icon Size | Text Size | Gap |
|---------|-----------|-----------|-----|
| Button | 16px | 14px | 8px |
| Navigation | 20px | 14px | 12px |
| Card header | 20px | 16px | 10px |
| Empty state | 64px | 24px (h3) | 16px |
| Alert | 20px | 14px | 12px |
| Toast | 20px | 14px | 12px |

### 5.2 Standalone Icon

- Must have `aria-label` describing the action
- Must have tooltip on hover/ focus
- Minimum touch target: 24×24px (use padding for small icons)
- Example: icon-only button, status indicator, toggle

### 5.3 Icon in Button

| Button Size | Icon Size | Position |
|-------------|-----------|----------|
| xs | 14px | Left of text |
| sm | 16px | Left of text |
| md | 16px | Left of text |
| lg | 20px | Left or right of text |
| xl | 24px | Left of text |
| Icon-only | Equal to height | Centered |

### 5.4 Icon in Tables

| Column Type | Icon | Size |
|-------------|------|------|
| Status | Status icon | 16px |
| Actions | Action menu | 16px |
| Expanded row | Chevron | 16px |
| Attachment | File icon | 16px |
| Favorite | Star | 16px |

---

## 6. Dark Mode Icon Treatment

| Aspect | Light Mode | Dark Mode | Change |
|--------|-----------|-----------|--------|
| Navigation icon | `--text-secondary` (#495057) | `--text-secondary` (#86898E) | Lighter on dark |
| Active nav icon | `--color-primary-500` (#0D7377) | `--color-primary-500` (#4DB8B8) | Brighter on dark |
| Status icon | Same hex | Same hex | No change (already accessible) |
| Action icon | `--text-secondary` | `--text-secondary` | Adjusted via token |
| Disabled icon | `--text-tertiary` (#ADB5BD) | `--text-tertiary` (#6C6F73) | Adjusted via token |
| Decorative icon | `--color-neutral-400` | `--color-neutral-500` | Adjusted via token |

**No icon redesign needed for dark mode.** All colors are tokenized. Icon artifacts remain identical — only color tokens change.

---

## 7. Icon Format and Delivery

| Property | Specification |
|----------|--------------|
| Format | SVG (inline or sprite) |
| Rendering | `currentColor` for fill/stroke |
| Accessibility | `<svg role="img" aria-label="...">` or `<svg aria-hidden="true">` for decorative |
| Loading | Sprite sheet (web), bundled asset (mobile) |
| Animation | No animated icons by default (except loading spinners) |

### Implementation

```tsx
// Usage
<Icon name="dashboard" size="sm" color="secondary" />
<Icon name="check" size="md" color="success" />

// Icon component
<svg
  width={sizeMap[size]}
  height={sizeMap[size]}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth={1.5}
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden={label ? undefined : true}
  role={label ? "img" : undefined}
  aria-label={label}
>
  {/* SVG paths */}
</svg>
```

---

## 8. Icon Library Summary

| Category | Icon Count |
|----------|-----------|
| Navigation | 12 |
| Actions | 30 |
| Status | 16 |
| File types | 10 |
| Objects | 25 |
| Social/Communication | 8 |
| **Total Core Icons** | **101** |

### Icon Sourcing

- **Primary source:** Lucide Icons (open-source, consistent 1.5px stroke outline style)
- **Custom icons:** Designed in-house for Merline-specific concepts (MERL-specific actions, AI features)
- **No third-party icon libraries** — all icons are either Lucide or custom-designed to maintain consistency

---

## 9. Do's and Don'ts

### ✅ Do

- Use icons to reinforce meaning, not as decoration
- Maintain consistent stroke width across all icons
- Use `currentColor` for themeability
- Add `aria-label` to standalone icons
- Left-align icons with text (except chevrons in dropdowns)
- Use the correct size token for each context

### ❌ Don't

- Don't use filled icons alongside outline icons (unless filled is the active variant)
- Don't mix icon styles from different libraries
- Don't use icons without text in critical navigation (sidebar)
- Don't animate icons (except loading spinners)
- Don't resize icons outside the defined token scale
- Don't use icons as the only indicator for status (always pair with text)
- Don't use color alone to convey icon meaning
