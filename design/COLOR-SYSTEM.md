# Merline Color System

## Design Philosophy

Color in Merline serves three purposes: **establish hierarchy**, **communicate meaning**, and **reinforce brand**. Color is never used decoratively. Every color choice improves comprehension or strengthens trust.

The palette is built around a **calm teal primary** — a color that communicates scientific rigor, confidence, and global readiness without the aggression of pure blue or the trendiness of vibrant hues.

---

## 1. Primary Color: Teal (#0D7377)

### Rationale

| Quality | How Teal Communicates It |
|---------|-------------------------|
| Scientific rigor | Deep, calm, precise — not emotional |
| Trust | Solid, stable, professional |
| Innovation | Distinctive without being trendy |
| Global readiness | Culturally neutral across regions |
| Calm confidence | Low saturation, high depth |

Teal sits at the intersection of blue (trust) and green (growth). It is the color of deep water — knowledge that runs deep, clarity beneath the surface. This aligns with MERL's purpose: surfacing evidence from data.

### Usage Guidelines

| Element | Token |
|---------|-------|
| Primary buttons | `--color-primary-500` |
| Active navigation | `--color-primary-500` |
| Links | `--color-primary-500` |
| Focus rings | `--color-primary-500` |
| Progress indicators | `--color-primary-500` |
| Selected states | `--color-primary-500` |
| Toggle switches (on) | `--color-primary-500` |

**Don't:** Use primary teal for error states, success states, or background fills of large areas.

### Primary Pairing

```
Primary background  → White text (#FFFFFF)
Primary hover       → Darker shade (#0A5E61)
Primary on dark bg  → Lighter teal (#4DB8B8)
Primary text        → #0D7377 on light bg
```

---

## 2. Secondary Color: Indigo (#4F46E5)

### Rationale

Indigo is reserved for **AI-native capabilities**, **innovation**, and **intelligence**. It creates a subtle visual distinction between standard platform features and AI-powered features. This helps users understand when AI is active vs. when they're in standard workflows.

### Usage Guidelines

| Element | Token |
|---------|-------|
| AI suggestion badges | `--color-secondary-500` |
| AI assistant interface | `--color-secondary-100` bg |
| AI-generated content indicators | `--color-secondary-500` icon |
| Confidence scores | `--color-secondary-500` |
| Smart/automated features | `--color-secondary-500` |

**Don't:** Use indigo for primary actions, navigation, or non-AI interactive elements.

---

## 3. Semantic Color Usage

### Success (#1E7E34)

| Use Case | Element |
|----------|---------|
| Data quality score ≥ 90% | Green indicator |
| Sync complete | Green checkmark |
| Study approved | Green badge |
| Indicator on track | Green RAG dot |
| Form submitted successfully | Green toast |
| Save complete | Green indicator |

**Accessibility:** 5.4:1 on white (AAA). Never use green alone — pair with a checkmark icon or text label.

### Warning (#8A6100)

| Use Case | Element |
|----------|---------|
| Quality score 70-89% | Amber indicator |
| Partial data | Amber badge |
| Indicator at risk | Amber RAG dot |
| Pending sync | Amber icon |
| Approaching limit | Amber warning text |
| Form with warnings | Amber border |

**Accessibility:** 5.5:1 on white (AAA). Always pair with exclamation icon.

### Error (#BC1C1C)

| Use Case | Element |
|----------|---------|
| Data quality score < 70% | Red indicator |
| Sync failed | Red exclamation |
| Study rejected | Red badge |
| Indicator off track | Red RAG dot |
| Validation error | Red border |
| Destructive action | Red button |
| Critical alert | Red banner |

**Accessibility:** 7.8:1 on white (AAA). Always pair with X icon and description text.

### Info (#1A6DB5)

| Use Case | Element |
|----------|---------|
| Help text | Info icon |
| Tooltips | Info color |
| Empty state guidance | Info badge |
| Feature announcements | Info banner |
| Contextual tips | Info dot |

**Accessibility:** 5.9:1 on white (AAA). Always pair with info (i) icon.

---

## 4. Neutral Palette for Structure

The neutral palette provides the structural foundation. Cool grays with a very slight blue undertone to complement the teal primary.

| Depth | Light Token | Dark Token | Purpose |
|-------|-------------|------------|---------|
| 0 (page) | #FFFFFF | #1A1B1E | Page background |
| 1 (surface) | #F8F9FA | #212225 | Sidebar, card bg |
| 2 (elevated) | #F1F3F5 | #2A2B2E | Modal, dropdown |
| 3 (border) | #DEE2E6 | #333538 | Default border |
| 4 (placeholder) | #868E96 | #5A5C5F | Placeholder text |
| 5 (secondary) | #495057 | #86898E | Secondary text |
| 6 (primary) | #1A1A1A | #E8EAED | Primary text |

### Usage Rules

- **Never use pure black (#000)** for text. It causes eye strain. Use #1A1A1A (dark) and #E8EAED (light).
- **Never use pure white (#FFF)** for page backgrounds. Use #FFFFFF (still pure white for clarity, but text is off-black).
- **Surface colors** should be distinct from page bg. On light mode, cards sit on #F8F9FA or #FFFFFF depending on elevation.
- **Borders** should be subtle. #DEE2E6 is barely perceptible but creates clean separation.

---

## 5. Surface Hierarchy

### Light Mode

| Level | Token | Example Usage | Elevation |
|-------|-------|---------------|-----------|
| Page | `--bg-page: #FFFFFF` | Main page area | None |
| Surface | `--bg-surface: #F8F9FA` | Sidebar, card grid | None |
| Elevated | `--bg-elevated: #FFFFFF` | Cards, modals | shadow-1 to shadow-4 |
| Inset | `--bg-inset: #F1F3F5` | Input fields, code blocks | None |

### Dark Mode

| Level | Token | Example Usage | Elevation |
|-------|-------|---------------|-----------|
| Page | `--bg-page: #1A1B1E` | Main page area | None |
| Surface | `--bg-surface: #212225` | Sidebar, card | None |
| Elevated | `--bg-elevated: #2A2B2E` | Cards, modals | shadow-1 to shadow-4 |
| Inset | `--bg-inset: #1A1B1E` | Input fields, code | None |

### Card Hierarchy Within a Page

```
Page Background (#FFFFFF / #1A1B1E)
  └── Card Container (--bg-surface #F8F9FA / #212225)
       └── Individual Card (--bg-elevated #FFFFFF / #2A2B2E)
            └── Interactive Element (--bg-hover on card)
```

---

## 6. Interactive States

### Button States (Primary)

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | #0D7377 | — | #FFFFFF |
| Hover | #0A5E61 | — | #FFFFFF |
| Active | #074A4C | — | #FFFFFF |
| Focus | #0D7377 | 2px #0D7377 + 2px offset | #FFFFFF |
| Disabled | #E9ECEF | — | #ADB5BD |

### Button States (Secondary)

| State | Background | Border | Text |
|-------|-----------|--------|------|
| Default | Transparent | #DEE2E6 | #1A1A1A |
| Hover | #F1F3F5 | #CED4DA | #1A1A1A |
| Active | #E9ECEF | #ADB5BD | #1A1A1A |
| Focus | Transparent | 2px #0D7377 | #1A1A1A |
| Disabled | Transparent | #E9ECEF | #ADB5BD |

### Link States

| State | Color | Underline |
|-------|-------|-----------|
| Default | #0D7377 | No |
| Hover | #0A5E61 | Yes |
| Active | #074A4C | Yes |
| Focus | #0D7377 | 2px ring |
| Visited | #4F46E5 | No |

---

## 7. Data Visualization Palette

### Categorical (12 colors)

```
#0D7377  (teal)
#4F46E5  (indigo)
#D97706  (amber)
#BC1C1C  (red)
#1E7E34  (green)
#7C3AED  (violet)
#DB2777  (pink)
#0891B2  (cyan)
#65A30D  (lime)
#EA580C  (orange)
#0284C7  (sky)
#A1A1AA  (zinc)
```

### Sequential (single-hue, 5 steps)

```
#E8F4F4 → #A3D6D6 → #57B5B5 → #0D7377 → #074A4C
```

### Diverging (5 steps)

```
#BC1C1C → #FCA5A5 → #F1F3F5 → #A3D6D6 → #0D7377
```

### Colorblind-Safe Pairing

Primary pairs that work for deuteranopia, protanopia, and tritanopia:

| Pair 1 | Pair 2 | Distinguishable |
|--------|--------|----------------|
| #0D7377 (teal) | #D97706 (amber) | Yes |
| #4F46E5 (indigo) | #EA580C (orange) | Yes |
| #1E7E34 (green) | #BC1C1C (red) | Not for red-green |
| #0891B2 (cyan) | #DB2777 (pink) | Yes |

### Chart Accessibility

- Never rely on color alone for chart meaning
- Add patterns/hatching for key chart elements
- Always pair with direct labels on data points
- Include accessible data table below chart
- Legend includes both color swatch and label text

---

## 8. Dark Mode Specifics

### Principles

Dark mode in Merline is not an inverted light mode. It is a **deliberate rebalancing**:

| Element | Light → Dark Change |
|---------|-------------------|
| Primary text | #1A1A1A → #E8EAED (not white — reduces glare) |
| Page bg | #FFF → #1A1B1E (not pure black) |
| Primary accent | #0D7377 → #4DB8B8 (lighter for contrast on dark) |
| Shadows | Darker and more pronounced |
| Surface hierarchy | Flipped: elevated surfaces become lighter than page |
| Saturation | Reduced slightly to prevent color bleeding |

### What Doesn't Change

- Semantic colors are adjusted but maintain same meaning
- Spacing and layout remain identical
- Typography hierarchy is preserved
- Component behavior is identical

---

## 9. Color Usage Do's and Don'ts

### ✅ Do

- Use the 60-30-10 rule: 60% neutral, 30% surface, 10% accent
- Use semantic colors consistently across the platform
- Use color to differentiate, never to decorate
- Test all color combinations for WCAG AA contrast (4.5:1)
- Provide text labels alongside color indicators
- Use 2-3 colors max per screen (not counting neutrals)
- Make interactive elements visually distinct

### ❌ Don't

- Don't use color as the only indicator of status (add icons, text)
- Don't use primary teal for backgrounds — reserved for accents
- Don't mix warm and cool grays (stick to cool blue-gray)
- Don't use pure black (#000) or pure white (#FFF) for text
- Don't create new semantic colors (stick to success/warning/error/info)
- Don't use color for decorative purposes
- Don't use low-contrast text on colored backgrounds
- Don't assign meaning to color inconsistently (e.g., red = error in one place, red = new in another)

---

## 10. Accessibility Validation

### Contrast Reference Table

| Token Pair | Light Ratio | Dark Ratio | Pass |
|------------|-------------|------------|------|
| Text primary on page bg | 16.7:1 | 8.5:1 | AAA ✓ |
| Text secondary on page bg | 7.1:1 | 5.8:1 | AAA ✓ |
| Text disabled on page bg | 3.5:1 | 3.2:1 | AA (large only) |
| Primary button text (#FFF) on primary | 5.9:1 | — | AAA ✓ |
| Link text on page bg | 5.9:1 | 5.3:1 | AAA ✓ |
| Error text on page bg | 7.8:1 | 5.1:1 | AAA ✓ |
| Success text on page bg | 5.4:1 | 5.2:1 | AAA ✓ |
| Border default on page bg | 1.5:1 | 1.6:1 | Not for text ✓ (decorative) |
| RAG red dot (#BC1C1C) on white | 7.8:1 | — | AAA ✓ |
| RAG green dot (#1E7E34) on white | 5.4:1 | — | AAA ✓ |
| RAG amber dot (#D97706) on white | 4.8:1 | — | AA ✓ |

### Focus Indicator

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Never remove `outline` without providing a visible alternative focus ring. All interactive elements must have a visible focus indicator at all times.
