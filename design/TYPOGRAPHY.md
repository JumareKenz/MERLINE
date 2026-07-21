# Merline Typography System

## Design Philosophy

Typography is the primary communication tool in Merline. Good typography creates hierarchy, guides attention, and makes content scannable. In a platform where researchers read dense data, field workers scan instructions quickly, and executives skim for key insights — typography must serve all reading modes.

**The interface should disappear. Words should remain.**

---

## 1. Font Family Selection

### Primary: Inter

**Inter** is the primary UI font. Chosen for:

| Quality | Why It Matters |
|---------|---------------|
| Legibility at small sizes (12-14px) | Data tables, captions, field labels |
| Excellent x-height | Readability on screens |
| Open-source | No licensing costs, global distribution |
| Extensive language support | Latin, extended Latin (French, Swahili, Vietnamese) |
| Variable font support | Single file for all weights reduces page weight |
| Neutral personality | Doesn't compete with content |
| Tight spacing | Fits more data without crowding |

### Fallback Stack

```
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

### Right-to-Left: IBM Plex Sans Arabic

For Arabic-language interfaces, Inter lacks proper Arabic glyphs. IBM Plex Sans Arabic provides:

- Matching visual weight and proportions to Inter
- Proper Arabic calligraphy conventions (Naskh style)
- Full support for Arabic, Urdu, Persian, Kurdish

### Amharic / Ethiopic: Noto Sans Ethiopic

- The most complete Ethiopic typeface with proper glyph proportions
- Matches Inter's neutral clarity
- Supports Amharic, Tigrinya, Oromo (in Ethiopic script)

### Monospace: JetBrains Mono

For code blocks, data values, IDs, and technical content:

- Clear distinction between `1`, `l`, `I` and `0`, `O`
- Ligatures available but disabled by default in UI
- Optimized for readability at small sizes
- Matching cap height to Inter for side-by-side use

---

## 2. Type Scale

### Desktop Base Scale

| Token | Size | Weight | Line Height | Letter Spacing | Cap Height |
|-------|------|--------|-------------|----------------|------------|
| `display` | 48px / 3rem | 700 | 56px (1.17) | -0.03em | 34px |
| `h1` | 36px / 2.25rem | 600 | 44px (1.22) | -0.02em | 25px |
| `h2` | 30px / 1.875rem | 600 | 38px (1.27) | -0.02em | 21px |
| `h3` | 24px / 1.5rem | 600 | 32px (1.33) | -0.01em | 17px |
| `h4` | 20px / 1.25rem | 600 | 28px (1.4) | -0.01em | 14px |
| `h5` | 18px / 1.125rem | 600 | 28px (1.55) | 0 | 13px |
| `body-lg` | 18px / 1.125rem | 400 | 28px (1.55) | 0 | 13px |
| `body` | 16px / 1rem | 400 | 24px (1.5) | 0 | 11px |
| `body-sm` | 14px / 0.875rem | 400 | 20px (1.43) | 0.01em | 10px |
| `caption` | 12px / 0.75rem | 400 | 16px (1.33) | 0.02em | 8px |
| `label` | 14px / 0.875rem | 500 | 20px (1.43) | 0.01em | 10px |
| `button` | 14px / 0.875rem | 500 | 20px (1.43) | 0.02em | 10px |
| `button-lg` | 16px / 1rem | 600 | 24px (1.5) | 0.01em | 11px |
| `code` | 13px / 0.8125rem | 400 | 20px (1.54) | 0 | 9px |

### Responsive Scale

Sizes scale down on smaller viewports to maintain readability without overflow:

| Level | Desktop (≥1280px) | Tablet (768-1279px) | Mobile (<768px) |
|-------|-------------------|---------------------|-----------------|
| display | 48px | 36px | 30px |
| h1 | 36px | 30px | 24px |
| h2 | 30px | 24px | 20px |
| h3 | 24px | 20px | 18px |
| h4 | 20px | 18px | 16px |
| body | 16px | 16px | 16px (no scale) |
| caption | 12px | 12px | 12px (no scale) |

Body text and caption sizes do not scale down — they are already at minimum readable sizes.

---

## 3. Line Height Guidelines

| Context | Line Height | Rationale |
|---------|-------------|-----------|
| Display / H1-H2 | 1.1-1.2x | Tight for large headings — creates impact |
| H3-H5 | 1.3-1.4x | Moderate — balances impact with readability |
| Body text | 1.5x | Optimal readability for paragraphs |
| Body small | 1.4x | Slightly tighter — saves space in dense UI |
| Caption | 1.3x | Tight — meta information, don't need scanning |
| Labels / Buttons | 1.4x | Single-line elements |
| Code / Data | 1.5x | Readability of dense technical content |

### Paragraph Width

```
Optimal line length: 60-75 characters
Maximum: 80 characters
Minimum: 45 characters
```

For long-form reading (report editor, evidence repository), constrain content width to 720px (approx 70 characters at 16px base).

---

## 4. Font Weight Usage

### Weight Map

| Weight | Token | Usage | CSS Variable |
|--------|-------|-------|-------------|
| 400 | Regular | Body text, table cells, inputs, paragraphs | `--fw-normal` |
| 450 | Regular (text) | Dense data tables — subtle emphasis | `--fw-book` |
| 500 | Medium | Buttons, labels, nav items, tabs, headings (small) | `--fw-medium` |
| 600 | Semibold | H3-H5, subheadings, active nav, emphasis | `--fw-semibold` |
| 700 | Bold | H1-H2, display, section titles, strong emphasis | `--fw-bold` |

### Usage Rules

- **Never use weight alone** to convey meaning — pair with size and color
- **Weight hierarchy** should match visual hierarchy (heavier = more important)
- **Body text** is always 400 weight
- **Interactive labels** (buttons, tabs, nav) use 500 weight
- **Headings** use 600 or 700 — never 400 for headings
- **Data tables** use 400 for data, 500-600 for headers

---

## 5. Internationalization Considerations

### Language-Specific Typography

| Language | Script | Font | Notes |
|----------|--------|------|-------|
| English | Latin | Inter | Default |
| French | Latin (extended) | Inter | Accented characters supported |
| Portuguese | Latin (extended) | Inter | Accented characters supported |
| Spanish | Latin (extended) | Inter | Accented characters supported |
| Swahili | Latin | Inter | No special characters needed |
| Arabic | Arabic | IBM Plex Sans Arabic | RTL, different baseline |
| Amharic | Ethiopic | Noto Sans Ethiopic | Different cap height, spacing |
| Oromo | Latin | Inter | No special characters |
| Somali | Latin | Inter | No special characters |
| Tigrinya | Ethiopic | Noto Sans Ethiopic | Shared with Amharic |

### RTL Considerations (Arabic)

- All layout must support `dir="rtl"` — sidebar flips to right
- Line heights may need 0.1em additional for Arabic ascenders
- Font size may need +1px for Arabic readability at small sizes
- Inter and IBM Plex Sans Arabic should match in cap height and weight
- Text alignment reverses: headings right-aligned, body text justified to right

### Ethiopic Considerations (Amharic)

- Ethiopic characters are taller than Latin — line heights may need adjustment
- Font size 14px minimum for readability (vs 12px for Latin)
- Character spacing may appear loose — adjust tracking if needed

### Multi-Language Form Design

```css
/* Language-specific overrides */
[lang="ar"] {
  --font-sans: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
  --text-base-size: 17px; /* +1px for Arabic readability */
}

[lang="am"] {
  --font-sans: 'Noto Sans Ethiopic', 'Inter', sans-serif;
  --text-base-size: 17px;
  --line-height-body: 1.6; /* Taller for Ethiopic */
}
```

---

## 6. Readability Optimization for Research Content

### Long-Form Reading

Research content (reports, protocols, evidence briefs) has specific readability needs:

| Parameter | Setting |
|-----------|---------|
| Font size | 16px minimum (18px preferred) |
| Line height | 1.6-1.8x for paragraphs |
| Line length | 60-75 characters (720px max) |
| Paragraph spacing | 1.5x line height |
| Headings | Clear hierarchy with spacing above |
| Blockquotes | Italic + left border |
| Lists | Hanging indent |

### Data Density

For data tables and dashboards where density matters:

| Parameter | Standard | Compact Mode |
|-----------|----------|--------------|
| Cell font | 14px | 13px |
| Line height | 20px | 16px |
| Padding | 12px | 8px |
| Header weight | 600 | 600 |

### Scannability

- **Section headings**: Every content section must have a heading
- **Bullet lists**: Use for 3+ items; avoid long paragraphs
- **Bold keywords**: Bold the first sentence of each key finding
- **Visual breaks**: Use spacing and dividers between sections
- **Callout boxes**: Use background color to highlight important information

---

## 7. Code and Monospace Typography

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `code-sm` | 12px | 400 | 16px | Inline code, badges |
| `code-base` | 13px | 400 | 20px | Code blocks, data IDs |
| `code-lg` | 14px | 400 | 20px | Large code blocks |

### Monospace Usage

- Data IDs (submission IDs, indicator codes, form codes)
- Numeric values in tables (right-aligned in monospace)
- API responses, webhook payloads
- Editable formula fields (calculated values)
- Version numbers

---

## 8. Implementation

### CSS Custom Properties

```css
:root {
  /* Font families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont,
               'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code',
               'Cascadia Code', monospace;

  /* Type scale */
  --text-display: 48px;
  --text-h1: 36px;
  --text-h2: 30px;
  --text-h3: 24px;
  --text-h4: 20px;
  --text-h5: 18px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 12px;
  --text-label: 14px;
  --text-button: 14px;
  --text-code: 13px;

  /* Line heights */
  --leading-display: 1.17;
  --leading-h1: 1.22;
  --leading-h2: 1.27;
  --leading-h3: 1.33;
  --leading-body: 1.5;
  --leading-caption: 1.33;
  --leading-code: 1.54;

  /* Weights */
  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Letter spacing */
  --tracking-display: -0.03em;
  --tracking-h1: -0.02em;
  --tracking-h2: -0.02em;
  --tracking-caption: 0.02em;
  --tracking-button: 0.02em;
}

/* Responsive scaling */
@media (max-width: 1279px) {
  :root {
    --text-display: 36px;
    --text-h1: 30px;
    --text-h2: 24px;
    --text-h3: 20px;
    --text-h4: 18px;
  }
}

@media (max-width: 767px) {
  :root {
    --text-display: 30px;
    --text-h1: 24px;
    --text-h2: 20px;
    --text-h3: 18px;
    --text-h4: 16px;
    --text-h5: 16px;
  }
}

/* Reduced letter-spacing for mobile readability */
@media (max-width: 767px) {
  :root {
    --tracking-display: -0.01em;
    --tracking-h1: -0.01em;
  }
}
```

### Typography Component

```tsx
// <Text as="h1" weight="bold">Heading</Text>
// <Text as="body" variant="secondary">Body text</Text>
<Text
  as={as}
  size={size}    // display | h1 | h2 | h3 | h4 | h5 | body | body-sm | caption
  weight={weight} // 400 | 500 | 600 | 700
  color={color}   // primary | secondary | tertiary | inverse | link | success | warning | error
  align={align}   // left | center | right
  truncate={n}    // line clamp
/>
```

---

## 9. Type Scale Cheat Sheet

```
Display (48px) ────────────────────────────────────────
                              Only for hero/landing pages

H1 (36px) ──────────────────────────────────
                        Page titles, section openers

H2 (30px) ───────────────────────────
              Module headings, section titles

H3 (24px) ────────────────────
       Card titles, modal headers, panel titles

H4 (20px) ─────────────
   Subsection headers within cards

Body (16px) ──────────
Default text, inputs, table cells

Body SM (14px) ───────
  Navigation, tabs, buttons, help text

Caption (12px) ──
  Badges, timestamps, meta data, labels
```

---

## 10. Typography Do's and Don'ts

### ✅ Do

- Use maximum 3 type sizes per screen (heading, body, caption)
- Use actual heading levels (h1-h6) for semantic structure — never just bold a `<p>`
- Keep body text at 16px minimum for readability
- Use `line-height: 1.5` for body text
- Test all type at 200% zoom for accessibility
- Use `rem` units so type scales with user's browser preferences
- Include `lang` attribute for proper font rendering per language

### ❌ Don't

- Don't use font weight alone to differentiate headings (use size + weight)
- Don't set body text below 16px on mobile
- Don't use justified text alignment (creates uneven spacing)
- Don't use all-caps for long text (reduces readability by 10-20%)
- Don't mix more than 2 font families on a single screen
- Don't use system font fallbacks that clash (e.g., serif fallback for sans-serif)
- Don't disable user font-size preferences with `font-size: 62.5%`
