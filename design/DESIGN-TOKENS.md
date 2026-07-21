# Merline Design Tokens

## Token Architecture

```
merline/
├── colors/          # All color tokens (light + dark)
├── typography/      # Font families, sizes, weights, line heights
├── spacing/         # 4px grid spacing scale
├── border/          # Border radius, border width
├── elevation/       # Box shadow tokens
├── opacity/         # Opacity values
├── motion/          # Duration, easing
├── icon/            # Icon sizing
└── grid/            # Layout grid breakpoints
```

---

## 1. Color Palette

### 1.1 Primary

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary-50` | #EBF5F5 | #0D2B2B | Background tint |
| `--color-primary-100` | #C6E6E6 | #154545 | Hover background |
| `--color-primary-200` | #A3D6D6 | #1E6060 | Border light |
| `--color-primary-300` | #7DC6C6 | #287A7A | Border default |
| `--color-primary-400` | #57B5B5 | #329595 | Active border |
| `--color-primary-500` | #0D7377 | #4DB8B8 | **Primary default** |
| `--color-primary-600` | #0A5E61 | #66CCCC | Primary hover |
| `--color-primary-700` | #074A4C | #7FD6D6 | Primary active |
| `--color-primary-800` | #053536 | #99E0E0 | Text on dark |
| `--color-primary-900` | #032020 | #B3EBEB | Text on dark |

### 1.2 Secondary (Indigo — AI accent)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-secondary-50` | #EEF2FF | #1E1B4B | Background |
| `--color-secondary-100` | #E0E7FF | #312E81 | Hover bg |
| `--color-secondary-500` | #4F46E5 | #818CF8 | **Secondary default** |
| `--color-secondary-600` | #4338CA | #A5B4FC | Secondary hover |
| `--color-secondary-700` | #3730A3 | #C7D2FE | Secondary active |

### 1.3 Semantic Colors

| Token | Light Hex | Dark Hex | AA Ratio (light) | AA Ratio (dark) | Usage |
|-------|-----------|----------|-----------------|-----------------|-------|
| `--color-success` | #1E7E34 | #4ADE80 | 5.4:1 on white | 5.2:1 on #1A1A1A | Success states |
| `--color-success-bg` | #E8F5E9 | #0D2B0D | — | — | Success bg |
| `--color-warning` | #8A6100 | #FBBF24 | 5.5:1 on white | 4.8:1 on #1A1A1A | Warning states |
| `--color-warning-bg` | #FFF8E1 | #2B1F00 | — | — | Warning bg |
| `--color-error` | #BC1C1C | #F87171 | 7.8:1 on white | 5.1:1 on #1A1A1A | Error states |
| `--color-error-bg` | #FFEBEE | #2B0D0D | — | — | Error bg |
| `--color-info` | #1A6DB5 | #60A5FA | 5.9:1 on white | 5.3:1 on #1A1A1A | Info states |
| `--color-info-bg` | #E3F2FD | #0D1B2B | — | — | Info bg |

### 1.4 Neutral Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-neutral-50` | #F8F9FA | #1A1B1E | Page bg (dark) |
| `--color-neutral-100` | #F1F3F5 | #212225 | Surface bg (dark) |
| `--color-neutral-150` | #E9ECEF | #2A2B2E | Card bg (dark) |
| `--color-neutral-200` | #DEE2E6 | #333538 | Border subtle (dark) |
| `--color-neutral-300` | #CED4DA | #3D3F42 | Border default (dark) |
| `--color-neutral-400` | #ADB5BD | #4A4C4F | Border strong (dark) |
| `--color-neutral-500` | #868E96 | #5A5C5F | Placeholder text |
| `--color-neutral-600` | #6C757D | #6C6F73 | Text disabled |
| `--color-neutral-700` | #495057 | #86898E | Text secondary |
| `--color-neutral-800` | #343A40 | #B0B3B8 | Text primary (dark) |
| `--color-neutral-900` | #212529 | #D1D4D9 | Text primary (dark) |
| `--color-neutral-950` | #1A1A1A | #E8EAED | Text strong (dark) |

### 1.5 Background Hierarchy

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-page` | #FFFFFF | #1A1B1E | Page background |
| `--bg-surface` | #F8F9FA | #212225 | Card, sidebar background |
| `--bg-elevated` | #FFFFFF | #2A2B2E | Modal, dropdown background |
| `--bg-tooltip` | #212529 | #E8EAED | Tooltip background |
| `--bg-inset` | #F1F3F5 | #1A1B1E | Input, code background |
| `--bg-hover` | rgba(0,0,0,0.04) | rgba(255,255,255,0.06) | Interactive hover bg |
| `--bg-active` | rgba(0,0,0,0.08) | rgba(255,255,255,0.10) | Interactive active bg |

### 1.6 Text Hierarchy

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--text-primary` | #1A1A1A | #E8EAED | Body text, headings |
| `--text-secondary` | #5A5A5A | #B0B3B8 | Secondary text, captions |
| `--text-tertiary` | #868E96 | #6C6F73 | Placeholder, disabled |
| `--text-inverse` | #FFFFFF | #1A1A1A | Text on primary/dark bg |
| `--text-link` | #1A6DB5 | #60A5FA | Link text |
| `--text-success` | #1E7E34 | #4ADE80 | Success text |
| `--text-warning` | #8A6100 | #FBBF24 | Warning text |
| `--text-error` | #BC1C1C | #F87171 | Error text |

### 1.7 Border Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--border-subtle` | #E9ECEF | #2A2B2E | Card borders, dividers |
| `--border-default` | #DEE2E6 | #333538 | Input borders, table borders |
| `--border-strong` | #CED4DA | #3D3F42 | Active borders, focus |
| `--border-focus` | #0D7377 | #4DB8B8 | Focus ring |
| `--border-error` | #BC1C1C | #F87171 | Error border |

### 1.8 Interactive States

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--interactive-default` | #0D7377 | #4DB8B8 | Interactive element |
| `--interactive-hover` | #0A5E61 | #66CCCC | Hover state |
| `--interactive-active` | #074A4C | #7FD6D6 | Active/pressed |
| `--interactive-disabled` | #CED4DA | #3D3F42 | Disabled bg |
| `--interactive-disabled-text` | #ADB5BD | #5A5C5F | Disabled text |

### 1.9 RAG Status (Red/Amber/Green)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--rag-red` | #BC1C1C | #F87171 | Off track |
| `--rag-red-bg` | #FFEBEE | #2B0D0D | Red state bg |
| `--rag-amber` | #D97706 | #FBBF24 | At risk |
| `--rag-amber-bg` | #FFFBEB | #2B1F00 | Amber state bg |
| `--rag-green` | #1E7E34 | #4ADE80 | On track |
| `--rag-green-bg` | #E8F5E9 | #0D2B0D | Green state bg |

---

## 2. Typography Scale

### 2.1 Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` | UI text, body, headings |
| `--font-sans-arabic` | `'IBM Plex Sans Arabic', 'Noto Naskh Arabic', 'Inter', sans-serif` | Arabic localization |
| `--font-sans-ethiopic` | `'Noto Sans Ethiopic', 'Inter', sans-serif` | Amharic localization |
| `--font-mono` | `'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace` | Code, data values, IDs |

### 2.2 Type Scale (Desktop)

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| `--text-xs` | 12px | 400/500 | 16px | 0.02em | Caption, meta, badges |
| `--text-sm` | 14px | 400/500/600 | 20px | 0.01em | Small text, helper, tabs |
| `--text-base` | 16px | 400/500/600 | 24px | 0 | Body text, inputs, buttons |
| `--text-lg` | 18px | 400/500/600 | 28px | 0 | Large body, card titles |
| `--text-xl` | 20px | 500/600/700 | 28px | -0.01em | H4, section headings |
| `--text-2xl` | 24px | 600/700 | 32px | -0.01em | H3, modal titles |
| `--text-3xl` | 30px | 600/700 | 38px | -0.02em | H2, page headings |
| `--text-4xl` | 36px | 600/700 | 44px | -0.02em | H1, main headings |
| `--text-5xl` | 48px | 700 | 56px | -0.03em | Display, hero |
| `--text-6xl` | 60px | 700 | 72px | -0.03em | Large display |

### 2.3 Responsive Scale Multiplier

| Breakpoint | Scale Factor |
|------------|-------------|
| ≥1200px | 1.0x (desktop base) |
| 768-1199px | 0.875x (tablet) |
| <768px | 0.75x (mobile) |

Type sizes are multiplied by the scale factor at each breakpoint. Base size (16px) is not scaled; heading sizes scale down on smaller screens.

### 2.4 Font Weights

| Token | Weight | Usage |
|-------|--------|-------|
| `--font-normal` | 400 | Body text, inputs |
| `--font-medium` | 500 | Navigation, buttons, labels |
| `--font-semibold` | 600 | Subheadings, strong emphasis |
| `--font-bold` | 700 | Headings, display text |

---

## 3. Spacing Scale (4px Grid)

| Token | Value | Example |
|-------|-------|---------|
| `--space-1` | 4px | Micro spacing, icon gap |
| `--space-2` | 8px | Tight spacing, chip gap |
| `--space-3` | 12px | Button padding, input padding |
| `--space-4` | 16px | Card padding, section gap |
| `--space-5` | 20px | Form field gap |
| `--space-6` | 24px | Section margin, modal padding |
| `--space-8` | 32px | Card grid gap, list spacing |
| `--space-10` | 40px | Section heading margin |
| `--space-12` | 48px | Page section padding |
| `--space-16` | 64px | Major section separation |
| `--space-20` | 80px | Page margins |

### Spacing Guidelines

- **Inline (x-axis)**: Use --space-2 (8px) between related elements, --space-3 (12px) between button and text, --space-4 (16px) between label and input.
- **Stack (y-axis)**: Use --space-4 (16px) between form fields, --space-6 (24px) between sections, --space-10 (40px) between major blocks.
- **Padding**: Use --space-3 (12px) for compact, --space-4 (16px) for standard, --space-6 (24px) for comfortable.

---

## 4. Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` | 0px | Tables, sidebars, nav items |
| `--radius-sm` | 4px | Inputs, buttons small |
| `--radius-md` | 6px | Buttons, cards, dropdowns |
| `--radius-lg` | 8px | Cards, modals, panels |
| `--radius-xl` | 12px | Large cards, dialogs |
| `--radius-2xl` | 16px | Full-screen modals |
| `--radius-full` | 9999px | Badges, pills, avatars |

### Border Width

| Token | Value | Usage |
|-------|-------|-------|
| `--border-width-none` | 0px | |
| `--border-width-sm` | 1px | Default borders |
| `--border-width-md` | 2px | Focus rings, active states |
| `--border-width-lg` | 3px | Strong emphasis |

---

## 5. Elevation / Shadow Tokens

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-0` | `none` | No elevation |
| `--shadow-1` | `0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10)` | Card default, subtle lift |
| `--shadow-2` | `0 2px 4px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.08)` | Hover card, dropdown |
| `--shadow-3` | `0 4px 8px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)` | Modal, popover |
| `--shadow-4` | `0 8px 16px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.06)` | Large modal, slide-in panel |
| `--shadow-5` | `0 12px 24px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.08)` | Toast stack, highest element |

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-0` | `none` | No elevation |
| `--shadow-1` | `0 1px 2px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.40)` | Card default |
| `--shadow-2` | `0 2px 4px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.45)` | Hover, dropdown |
| `--shadow-3` | `0 4px 8px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.50)` | Modal, popover |
| `--shadow-4` | `0 8px 16px rgba(0,0,0,0.45), 0 6px 20px rgba(0,0,0,0.55)` | Large modal |
| `--shadow-5` | `0 12px 24px rgba(0,0,0,0.50), 0 8px 32px rgba(0,0,0,0.60)` | Highest element |

### Shadow Guidelines

- **shadow-0**: Cards on colored backgrounds, inset surfaces
- **shadow-1**: Default card state, input fields
- **shadow-2**: Elevated cards on hover, dropdown menus
- **shadow-3**: Modals, popovers, date pickers
- **shadow-4**: Slide-in panels, large dialogs
- **shadow-5**: Toast notifications, fab buttons

---

## 6. Opacity Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--opacity-disabled` | 0.4 | Disabled text, controls |
| `--opacity-muted` | 0.6 | Secondary text, muted elements |
| `--opacity-hover` | 0.08 (light) / 0.12 (dark) | Hover overlay |
| `--opacity-active` | 0.12 (light) / 0.18 (dark) | Active/pressed overlay |
| `--opacity-overlay` | 0.5 | Modal backdrop |
| `--opacity-skeleton` | 0.1 | Skeleton base |
| `--opacity-skeleton-shine` | 0.15 | Skeleton shimmer |

---

## 7. Motion Tokens

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | 0ms | Theme switch, reduced motion |
| `--duration-fast` | 100ms | Micro-interactions, button press, toggle |
| `--duration-normal` | 200ms | Standard transitions, hover effects |
| `--duration-slow` | 300ms | Panel slides, modal enter |
| `--duration-complex` | 400ms | Page transitions, shared element |
| `--duration-enter` | 500ms | Initial page load animations |

### Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-linear` | `linear` | Progress bars, loading |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most UI transitions |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Elements entering screen |
| `--ease-accelerate` | `cubic-bezier(0.3, 0, 1, 0.4)` | Elements leaving screen |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0.2, 1)` | Expressive animations |
| `--ease-spring` | `spring(1, 100, 10)` | Overshoot allowed (micro-interactions) |

---

## 8. Icon Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--icon-xs` | 12px | Inline, badge icons |
| `--icon-sm` | 16px | Default icon size |
| `--icon-md` | 20px | Medium icons |
| `--icon-lg` | 24px | Feature icons, CTAs |
| `--icon-xl` | 32px | Section illustrations |
| `--icon-2xl` | 48px | Large illustrations, empty states |
| `--icon-stroke` | 1.5px | Outline stroke width |
| `--icon-corner` | 2px | Icon corner radius |

---

## 9. Grid System

### Breakpoints

| Token | Value | Device |
|-------|-------|--------|
| `--bp-xs` | 0-639px | Mobile |
| `--bp-sm` | 640-1023px | Tablet portrait |
| `--bp-md` | 1024-1279px | Tablet landscape / small desktop |
| `--bp-lg` | 1280-1599px | Desktop |
| `--bp-xl` | 1600+px | Large desktop / ultra-wide |

### Grid Columns

| Breakpoint | Columns | Gutter | Margin |
|------------|---------|--------|--------|
| xs | 4 | 16px | 16px |
| sm | 8 | 20px | 24px |
| md | 12 | 24px | 32px |
| lg | 12 | 24px | 40px |
| xl | 12 | 24px | 64px |

### Content Max Widths

| Context | Max Width |
|---------|-----------|
| Standard content | 1200px |
| Dashboard | Full width (1600px) |
| Form builder | Full width (1440px) |
| Report editor | 960px (readable) |
| Dialog | 480px (standard), 640px (large) |
| Sidebar | 280px (expanded), 64px (collapsed) |

---

## 10. Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Page content |
| `--z-dropdown` | 100 | Dropdowns, popovers |
| `--z-sticky` | 200 | Sticky headers |
| `--z-overlay` | 300 | Modal backdrops |
| `--z-modal` | 400 | Modals, dialogs |
| `--z-toast` | 500 | Toasts, notifications |
| `--z-tooltip` | 600 | Tooltips |

---

## 11. Touch Target Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--touch-min` | 24px | Minimum touch target (WCAG AA) |
| `--touch-comfort` | 40px | Comfortable touch height |
| `--touch-ideal` | 48px | Ideal touch height (buttons, inputs) |

---

## Token Naming Convention

```css
--{category}-{property}-{variant}-{state}

/* Examples */
--color-primary-500
--text-secondary
--space-4
--radius-md
--shadow-2
--duration-normal
--ease-standard
--font-sans
--bp-lg
--z-modal
```

### CSS Custom Properties Implementation

```css
:root {
  /* Light theme */
  --color-primary-500: #0D7377;
  --bg-page: #FFFFFF;
  --text-primary: #1A1A1A;
  /* ... all tokens */
}

[data-theme="dark"] {
  --color-primary-500: #4DB8B8;
  --bg-page: #1A1B1E;
  --text-primary: #E8EAED;
  /* ... all tokens */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Same as [data-theme="dark"] */
  }
}
```

---

## Token Audit Checklist

- [ ] Every raw value has a named token
- [ ] All tokens defined for both light and dark mode
- [ ] Contrast ratios verified (WCAG 2.2 AA minimum)
- [ ] Token values follow consistent naming
- [ ] No hardcoded values in component CSS
- [ ] Platform-specific implementation (CSS for web, Dart for Flutter)
- [ ] Documentation links each token to its usage
- [ ] Design tool (Figma) tokens synced with code tokens
