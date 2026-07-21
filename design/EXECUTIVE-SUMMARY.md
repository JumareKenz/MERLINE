# Merline Design System — Executive Summary

## Design Philosophy

Merline's visual design system is built on a single principle: **the interface should disappear; the work should remain.** Every color, every spacing decision, every animation serves the goal of reducing cognitive friction so researchers, field workers, and decision-makers can focus on evidence — not the tool.

The system embodies **scientific rigor, calm confidence, and global readiness.** It is premium without ostentation, intelligent without complexity, and trustworthy without stiffness.

---

## Brand Expression

| Brand Quality | Visual Translation |
|---------------|-------------------|
| Scientific rigor | Precise typography, clean layout, data-forward design |
| Innovation | Indigo accent for AI features, thoughtful micro-interactions |
| Trust | Deep teal primary, consistent patterns, no surprises |
| Reliability | Predictable components, stable layout, visible feedback |
| Global readiness | Multi-script typography (Latin, Arabic, Ethiopic), RTL support, localized colors |
| AI-native intelligence | Distinct AI visual language (indigo accent, suggestion cards, confidence indicators) |
| Professional excellence | Premium typography (Inter), generous whitespace, polished micro-interactions |

---

## Key Design Decisions

### 1. Teal Primary (#0D7377)

Instead of a conventional blue or green, we chose teal — a color that sits at the intersection of trust (blue) and growth (green). It is culturally neutral across the 50+ countries Merline will operate in, distinctive without being trendy, and communicates depth (like deep water — knowledge beneath the surface).

### 2. Indigo Secondary for AI Features (#4F46E5)

AI capabilities have a distinct visual language. Indigo creates a subtle but clear visual distinction between platform features and AI-powered features. Users intuitively learn: "purple = AI is involved."

### 3. Inter as the Primary Typeface

Inter was selected for its excellent legibility at small sizes (critical for data tables), extensive language support, variable font capability (reduces page weight), and neutral personality that doesn't compete with content.

### 4. Light and Dark Mode as First-Class Citizens

Both themes are designed intentionally, not inverted. Dark mode uses off-black (#1A1B1E) instead of pure black to reduce eye strain, and the primary shifts to a lighter teal (#4DB8B8) for adequate contrast on dark backgrounds.

### 5. 4px Grid System

All spacing, sizing, and layout is based on a 4px grid. This creates visual rhythm, ensures consistency across implementations, and simplifies decision-making for designers and developers.

### 6. 53 Components Across 14 Categories

The component catalogue defines 53 reusable components covering everything from buttons to AI interaction cards. Each component is theme-aware, keyboard-accessible, and documented with variants and states.

### 7. Data-Forward Visualization

Charts and graphs prioritize clarity over decoration. All visualizations use 12-color colorblind-safe palettes, start axes at zero, and always provide accessible data tables alongside charts.

### 8. Purposeful Motion

Animation is constrained to 80-300ms and used only for: guiding attention, communicating state change, and providing spatial continuity. `prefers-reduced-motion` is fully supported.

---

## Design Token Summary

| Category | Token Count | Key Tokens |
|----------|-------------|------------|
| Color | 120+ | Primary (teal), secondary (indigo), 4 semantic, 12 neutrals, backgrounds, text, borders, interactive states, RAG status |
| Typography | 30+ | 12 sizes from 12px-60px, 4 weights, 5 language-specific font stacks |
| Spacing | 12 | 4px-80px, 4px grid |
| Border | 8 | 6 radii (0-full), 4 widths |
| Elevation | 12 | 6 levels for light + 6 for dark |
| Opacity | 8 | Disabled, muted, hover, overlay, skeleton |
| Motion | 16 | 6 durations, 5 easing curves, 7 transition patterns |
| Icon | 8 | 6 sizes (12-48px), stroke width, corner radius |
| Grid | 8 | 5 breakpoints, columns, gutter, margin per breakpoint |
| **Total** | **220+** | |

---

## Component Summary

| Category | Component Count |
|----------|----------------|
| Buttons | 7 variants × 5 sizes |
| Inputs | 8 types × 4 states |
| Forms | 4 layout patterns |
| Data Tables | 3 density modes |
| Cards | 6 variants |
| Modals | 5 types |
| Navigation | 5 pattern types |
| Notifications | 5 types |
| Avatars | 5 sizes |
| Badges | 6 color variants |
| Progress | 4 types |
| Empty States | 10+ screen-specific |
| Charts | 10+ chart types |
| AI Components | 4 variants |
| Icons | 101 core icons |
| **Total Components** | **53 reusable + 101 icons** |

---

## Accessibility Compliance

| Standard | Level | Status |
|----------|-------|--------|
| WCAG 2.1 AA | Perceivable | ✓ All color contrast ≥ 4.5:1 (text), ≥ 3:1 (UI) |
| WCAG 2.1 AA | Operable | ✓ Full keyboard navigation, focus indicators, skip links |
| WCAG 2.1 AA | Understandable | ✓ Consistent navigation, error identification, labels |
| WCAG 2.1 AA | Robust | ✓ ARIA roles, semantic HTML, screen reader support |
| WCAG 2.2 AA | Focus Visible (2.4.13) | ✓ 2px solid outline + 2px offset |
| WCAG 2.2 AA | Target Size (2.5.8) | ✓ 24×24px minimum |
| WCAG 2.2 AA | Dragging (2.5.7) | ✓ Keyboard alternatives for drag-and-drop |
| WCAG 2.2 AA | Consistent Help (3.2.6) | ✓ Help accessible from all pages |

### Accessibility by Numbers

- **100%** of components pass WCAG 2.2 AA contrast requirements
- **100%** of interactive elements keyboard accessible
- **100%** of form inputs have associated labels
- **100%** of icons have `aria-label` or `aria-hidden`
- **100%** of status indicators use icon + text + color (not color alone)
- **All** animations respect `prefers-reduced-motion`

---

## Implementation Notes for Engineering

### Platform-Specific Tokens

| Platform | Format | Implementation |
|----------|--------|---------------|
| Web (Next.js) | CSS Custom Properties | `--color-primary-500` in `:root` and `[data-theme="dark"]` |
| Mobile (Flutter) | Dart constants | `MerlineColors.primary500`, `MerlineSpacing.space4` |
| Design (Figma) | Local variables | Synced via Design Tokens plugin |

### Build Order

1. **Phase 1a**: Design tokens → CSS custom properties + ThemeProvider
2. **Phase 1b**: Primitive components (Text, Box, Icon, Button, Input)
3. **Phase 1c**: Composite components (Form, Table, Card, Modal, Tabs)
4. **Phase 1d**: Layout components (Sidebar, TopBar, Page, Grid)
5. **Phase 2**: Data visualization components (Chart, Map, KPI)
6. **Phase 2b**: AI interaction components (SuggestionCard, ConfidenceBadge)

### Responsibility Assignment

| Engineering Team | Owns |
|-----------------|------|
| UI Platform | Design tokens, ThemeProvider, primitives |
| Feature teams | Composite components in their domain |
| Data team | Chart components, map components |
| AI team | AI-specific interaction components |
| QA | Accessibility audits, visual regression tests |

### Testing Strategy

| Test Type | Tool | Frequency |
|-----------|------|-----------|
| Visual regression | Chromatic / Percy | Per PR |
| Accessibility automation | axe-core | Per commit (CI) |
| Keyboard navigation | Cypress / Playwright | Per feature |
| Color contrast | Lighthouse CI | Per PR |
| Responsive layout | Storybook viewports | Per component |
| Reduced motion | Playwright emulation | Per release |

---

## Mobile and Web Design System Alignment

The design system is **platform-agnostic at the token level** and **platform-optimized at the component level**.

| Aspect | Web (Next.js) | Mobile (Flutter) |
|--------|---------------|------------------|
| Tokens | CSS Custom Properties | Dart constants |
| Typography | Inter (webfont) | Inter (bundled) |
| Icons | SVG inline/sprite | Flutter Icons / custom |
| Grid | CSS Grid + Flexbox | Column + Row widgets |
| Motion | CSS transitions + Framer Motion | Flutter animation framework |
| Theme | CSS variables + `data-theme` attr | `ThemeData` with `ThemeMode` |
| Components | React component library | Flutter widget library |

**Shared design decisions:**
- Same color tokens (platform-adapted)
- Same spacing scale
- Same typography scale
- Same icon style
- Same component behavior
- Same accessibility requirements

---

## Versioning and Governance

### Versioning Scheme

```
v{major}.{minor}.{patch}

Major: Breaking changes (color palette change, spacing scale change)
Minor: Additions (new component, new token)
Patch: Fixes (accessibility fix, token value adjustment)
```

### Governance Process

1. **Proposal**: Design or engineering files an issue with proposed change
2. **Review**: Design system team evaluates against quality gates
3. **Approval**: Changes approved by Visual Design Architect
4. **Implementation**: Code change + documentation update
5. **Changelog**: Changes logged with version number
6. **Migration**: Migration guide for breaking changes

### Quality Gates (Repeated)

Before any visual change is approved:
- Does it improve clarity?
- Does it improve usability?
- Does it support accessibility?
- Is it visually consistent?
- Is it reusable?
- Does it strengthen the brand?
- Can developers implement it consistently?
- Can users understand it immediately?

---

## Deliverable Summary

| # | File | Description |
|---|------|-------------|
| 1 | `DESIGN-TOKENS.md` | 220+ design tokens across 9 categories (color, typography, spacing, border, elevation, opacity, motion, icon, grid) |
| 2 | `COLOR-SYSTEM.md` | Complete color system with accessibility validation, 12-color categorical palette, semantic colors, dark mode strategy |
| 3 | `TYPOGRAPHY.md` | Type scale (12-60px), multi-script support (Latin, Arabic, Amharic), responsive scaling, readability optimization |
| 4 | `COMPONENT-CATALOGUE.md` | 53 reusable components across 14 categories with variants, states, ARIA requirements |
| 5 | `LAYOUT-SYSTEM.md` | 3 page templates, dashboard grid, 4 form layouts, 5 responsive breakpoints, 2 density modes |
| 6 | `ICONOGRAPHY.md` | 101 core icons, 6 sizes, outline style, color usage, category catalog |
| 7 | `MOTION.md` | Duration scale (80-500ms), 5 easing curves, 7 transition patterns, reduced motion support |
| 8 | `DATA-VISUALIZATION.md` | 10 chart types, colorblind-safe palette, interaction patterns, accessibility requirements |
| 9 | `EXECUTIVE-SUMMARY.md` | Design philosophy, key decisions, token summary, implementation notes, governance |

---

This design system is a living product. It will evolve as Merline grows from Phase 0 through Phase 4. The foundation laid here — tokens, components, patterns, and principles — is designed to scale across web, mobile, AI interfaces, and future platforms while maintaining a consistent, professional, and accessible experience for every user.
