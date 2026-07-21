# Merline Motion Design

## Design Philosophy

Motion in Merline serves a functional purpose: **guide attention, communicate state, provide continuity, and reduce cognitive load.** Animation is subtle, fast, and purposeful. It never distracts from the task at hand.

**If it doesn't improve understanding, remove the animation.**

---

## 1. Duration Guidelines

### Duration Scale

| Token | Duration | Mental Model | Example |
|-------|----------|-------------|---------|
| `--duration-instant` | 0ms | No motion | Theme switch, reduced motion |
| `--duration-micro` | 80ms | Imperceptible delay | Button press feedback |
| `--duration-fast` | 150ms | Quick action | Hover state, toggle switch |
| `--duration-normal` | 200ms | Standard transition | Dropdown open, card hover lift |
| `--duration-slow` | 300ms | Notable transition | Panel slide in, modal open |
| `--duration-complex` | 400ms | Major transition | Page transition, shared element |
| `--duration-enter` | 500ms | Initial appearance | First load, skeleton to content |

### Duration by Interaction Type

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button hover | 80ms | ease-standard |
| Button press | 80ms | ease-standard |
| Toggle switch | 150ms | ease-spring |
| Dropdown open | 150ms | ease-decelerate |
| Dropdown close | 100ms | ease-accelerate |
| Tooltip appear | 150ms | ease-decelerate |
| Card hover lift | 150ms | ease-standard |
| Modal open | 200ms | ease-decelerate |
| Modal close | 150ms | ease-accelerate |
| Sidebar collapse | 200ms | ease-standard |
| Panel slide in | 300ms | ease-decelerate |
| Panel slide out | 200ms | ease-accelerate |
| Toast enter | 200ms | ease-decelerate |
| Toast exit | 150ms | ease-accelerate |
| Page transition | 300ms | ease-standard |
| Skeleton pulse | 1500ms | ease-standard |
| Progress fill | 300ms | ease-standard |

---

## 2. Easing Curves

### Easing Tokens

```
Standard:    cubic-bezier(0.2, 0, 0, 1)
Decelerate:  cubic-bezier(0, 0, 0, 1)
Accelerate:  cubic-bezier(0.3, 0, 1, 0.4)
Emphasized:  cubic-bezier(0.2, 0, 0.2, 1)
Spring:      spring(1, 100, 10)  -- platform-dependent
```

### Curve Behavior

| Curve | Feel | When to Use |
|-------|------|-------------|
| **Standard** | Smooth, natural, begins and ends at rest | Most UI transitions |
| **Decelerate** | Starts fast, slows to stop | Elements appearing (modal, panel, tooltip) |
| **Accelerate** | Starts slow, speeds up to exit | Elements disappearing |
| **Emphasized** | Overshoots slightly, settles back | Expressive moments, completion states |
| **Spring** | Natural bounce, feels physical | Micro-interactions (toggle, like button) |

---

## 3. Transition Patterns

### 3.1 Fade

| Property | Specification |
|----------|--------------|
| Opacity start | 0 |
| Opacity end | 1 |
| Duration | 150ms |
| Easing | ease-standard |

**Used for:** Tooltips, dropdowns, overlays, content swap

### 3.2 Slide

| Property | Specification |
|----------|--------------|
| Transform start | translateX(8px) or translateY(8px) |
| Transform end | translate(0) |
| Duration | 200-300ms |
| Easing | ease-decelerate (in), ease-accelerate (out) |

**Directions:**
```
Slide from right:   Panel, side drawer, toast
Slide from bottom:  Mobile bottom sheet, dropdown
Slide from top:     Banner notifications
Slide up:           Content reveal, accordion
```

### 3.3 Scale

| Property | Specification |
|----------|--------------|
| Transform start | scale(0.95) |
| Transform end | scale(1) |
| Opacity | 0 → 1 |
| Duration | 200ms |
| Easing | ease-decelerate |

**Used for:** Modal open, popover, card emphasis

### 3.4 Shared Element

| Property | Specification |
|----------|--------------|
| Duration | 300-400ms |
| Easing | ease-emphasized |
| Properties | position (x, y), size (w, h), border-radius, color |

**Used for:** List item → detail page, card → modal, chart drill-down

---

## 4. Page Transitions

### 4.1 Within Module

```
Current page:  fade out (100ms, ease-accelerate)
               → brief 50ms pause
New page:      fade in (150ms, ease-decelerate)
```

- Subtle fade between pages within the same module
- Content area fades; sidebar and top bar remain animated
- Duration: 250ms total

### 4.2 Between Modules

```
Current module:  slide out -8px + fade (150ms)
New module:      slide in +8px + fade (200ms)
```

- Directional slide to indicate navigation hierarchy
- Going deeper (list → detail): slide left
- Going shallower (detail → list): slide right
- Duration: 350ms total

### 4.3 Initial Page Load

- Skeleton screen appears immediately (no delay)
- Content fades in as it loads (200ms, ease-decelerate)
- Each widget/section loads independently (staggered at 50ms intervals)
- Never show blank white screen — always skeleton first

---

## 5. Skeleton Loading Animations

### 5.1 Pulse Skeleton

```
@keyframes skeleton-pulse {
  0%   { opacity: 0.08; }
  50%  { opacity: 0.14; }
  100% { opacity: 0.08; }
}

.skeleton {
  background: currentColor;
  opacity: 0.08;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```

### 5.2 Shimmer Skeleton (Alternative)

```
@keyframes skeleton-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.05) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

### 5.3 Skeleton by Component

| Component | Skeleton Layout |
|-----------|-----------------|
| Card | Full card shape (header line + body lines + footer) |
| Table | 5-8 rows with alternating line lengths (60%, 80%, 40%) |
| Chart | Shape-matched placeholder (bar outlines, line area) |
| Dashboard | Widget-shaped rectangles with simulated content |
| List | 5-10 rows with 32px height, 16px gap |
| Detail page | Left: image placeholder; Right: 4-6 text lines |

---

## 6. Micro-Interactions

### 6.1 Button Press

```
Default → Press → Release
Scale:   1.0  → 0.97 → 1.0
Duration: 80ms → 80ms
Easing:  ease-standard
```

### 6.2 Toggle Switch

```
Knob moves from left → right (or right → left)
Track color fills smoothly
Duration: 150ms
Easing: spring (slight overshoot for tactile feel)
```

### 6.3 Card Hover

```
Transform: translateY(0) → translateY(-2px)
Shadow:    shadow-1 → shadow-2
Duration:  150ms
Easing:    ease-standard
```

### 6.4 Menu Open

```
Dropdown:  scale(0.95, 0.95) opacity(0) → scale(1, 1) opacity(1)
Transform-origin: top-left (or top-right for RTL)
Duration: 150ms
Easing: ease-decelerate
```

### 6.5 Checkbox / Radio Check

```
Checkmark: scale(0) → scale(1) with slight overshoot
Duration: 150ms
Easing: spring
```

### 6.6 Progress Bar Fill

```
Width: 0% → target%
Duration: 300ms (for full fill)
Easing: ease-standard

Multiple segments: stagger by 100ms each
Indeterminate: continuous shimmer animation
```

### 6.7 Notification Badge

```
Scale: 1.0 → 1.2 → 1.0 (pulse on new notification)
Duration: 300ms total
Easing: ease-emphasized
```

---

## 7. Reduced Motion Support

### 7.1 Media Query

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  /* Keep essential motion for understanding */
  .progress-bar-fill {
    transition-duration: 300ms !important; /* Keep state changes visible */
  }

  .skeleton {
    animation: none !important;
    opacity: 0.08;
  }

  .loading-spinner {
    animation: none !important;
    display: none;
  }
}
```

### 7.2 Manual Toggle

Users can also manually disable animations via:
- Profile setting: "Reduce motion"
- System: Respects OS-level `prefers-reduced-motion` by default
- Override: Profile setting overrides OS setting

### 7.3 Animation Replacement

| Animation | Reduced Motion Alternative |
|-----------|---------------------------|
| Slide transitions | Instant appear (0ms) |
| Fade transitions | Instant appear (0ms) |
| Skeleton pulse | Static placeholder |
| Spinner | "Loading..." text |
| Progress bar fill | Instant jump to value |
| Hover lift | No transform; border change only |
| Shared element | Instant appear |
| Stagger animations | All appear simultaneously |

---

## 8. Motion Design Principles

### 8.1 Purpose

Every animation in Merline must answer one of:
- **Where did that come from?** (spatial continuity)
- **What just happened?** (state change)
- **What should I do next?** (attention guidance)
- **How long will this take?** (progress communication)

### 8.2 Constraints

| Rule | Explanation |
|------|-------------|
| Max 300ms | Most interactions complete within 300ms |
| No looping | Only skeletons and loading spinners loop |
| No parallax | No decorative scrolling effects |
| No confetti | No celebratory animations |
| No entrance on scroll | Content appears in place, not animated in |
| One at a time | Only one motion sequence at a time |
| Purpose-driven | Every animation must have a functional reason |

### 8.3 Performance

- Prefer `transform` and `opacity` animations (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- Use `will-change: transform` sparingly on animated elements
- Keep compositor-only layers (no paint or layout triggers)
- Test on mid-range mobile devices (Moto G, Galaxy A series)

---

## 9. Implementation

### CSS Implementation

```css
/* Shared transitions */
.interactive {
  transition: opacity var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
}

/* Card hover */
.card {
  transition: transform 150ms var(--ease-standard),
              box-shadow 150ms var(--ease-standard);
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-2);
}

/* Modal enter */
.modal-overlay {
  animation: fadeIn 200ms var(--ease-decelerate);
}
.modal-content {
  animation: modalEnter 200ms var(--ease-decelerate);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

### React / Framer Motion Integration

```tsx
// Page transitions
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
  >
    <PageContent />
  </motion.div>
</AnimatePresence>

// Shared element (list → detail)
<motion.div layoutId={`card-${id}`}>
  <Card />
</motion.div>
```

---

## 10. Motion Design Checklist

- [ ] Animation duration ≤ 300ms for functional interactions
- [ ] Animation uses `transform` and `opacity` only (no layout)
- [ ] `prefers-reduced-motion` respected via CSS media query
- [ ] Profile setting to disable animations
- [ ] No decorative animations (no confetti, parallax, etc.)
- [ ] Skeleton screen appears immediately on page load
- [ ] Micro-interactions complete within 80-150ms
- [ ] Only one animation sequence active at a time
- [ ] Tested on mid-range mobile devices at 60fps
- [ ] Every animation has a functional purpose documented
