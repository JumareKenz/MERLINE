# AI Interaction UX Guide

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Clear boundaries** | User always knows what is AI-generated vs human-authored |
| **Low friction** | AI assist is a single tap/clic, not a multi-step wizard |
| **Transparent** | AI shows confidence, sources, and limitations |
| **Non-disruptive** | AI augments existing workflows, doesn't interrupt |
| **Controllable** | User can accept, edit, reject, or regenerate every output |

---

## 2. AI Interaction Patterns

### 2.1 Trigger Patterns

| Pattern | UX | When Used |
|---------|-----|-----------|
| **Inline Assist** | Small AI sparkle icon next to input fields | Questionnaire questions, indicator fields |
| **Floating Assist** | Floating action button on design/analysis screens | Study design, report pages |
| **Proactive Suggestion** | Subtle suggestion card below user's work | After user pauses typing, after data entry |
| **Command Palette** | `Cmd+K` or `/` triggers AI commands | Knowledge Q&A, quick actions |
| **Dedicated Panel** | Side panel for AI conversation | Assistant mode, complex queries |

### 2.2 Interaction Flow

```
[Context] User is designing a questionnaire
    │
    ▼
[Trigger] User taps AI sparkle icon on question field
    │
    ▼
[Loading] Subtle shimmer placeholder (not full-screen spinner)
    │
    ▼
[Output] AI suggestions appear inline with confidence badge
    ├── Suggestion 1 [confidence: 92%] [source: UN Guidelines 2023]
    ├── Suggestion 2 [confidence: 85%] [source: Similar Study #45]
    └── Suggestion 3 [confidence: 78%] [source: Indicator Library]
    │
    ▼
[Action] User can: Apply one, Edit one, Regenerate, or Dismiss
    │
    ▼
[Feedback] Auto-thumbs-up/down recorded based on action
    ├── Applied = positive
    ├── Edited = neutral (edit tracked)
    └── Dismissed = negative (optional reason)
```

---

## 3. UI Components

### 3.1 AI Badge

- Small `AI` tag on every AI-generated element
- Color: Purple (#7C3AED) for brand consistency
- Tapping badge shows: model used, confidence, sources, timestamp

### 3.2 Confidence Indicator

```
[●●●●●] 92% — High confidence
[●●●○○] 65% — Medium confidence (flag for review)
[●○○○○] 40% — Low confidence (human review recommended)
```

Displayed as a small colored dot or bar:
- Green: ≥85%
- Yellow: 70-84%
- Orange: 50-69%
- Red: <50%

### 3.3 Citation Display

- Inline: `[1]`, `[2]` superscript links in text
- Hover/tap: Tooltip with source name, excerpt, link
- Context panel: Side-by-side view of claim and source

### 3.4 Action Buttons

| Button | Icon | Action |
|--------|------|--------|
| Apply | ✓ | Accept suggestion as-is |
| Edit | ✏️ | Open suggestion in edit mode |
| Regenerate | ↻ | Request new suggestion |
| Dismiss | ✕ | Reject suggestion |
| Report | ⚑ | Report inaccurate/harmful content |

### 3.5 Review Queue Component

Used for review-level outputs:

```
┌────────────────────────────────────────┐
│  AI-Generated Design — Pending Review  │
│  ┌──────────────────────────────────┐  │
│  │ Study Design: Maternal Health... │  │
│  │ Confidence: 78% · 3 sources      │  │
│  │                                  │  │
│  │ [Accept] [Edit] [Reject]         │  │
│  └──────────────────────────────────┘  │
│  [Reason if rejecting] ___________     │
└────────────────────────────────────────┘
```

---

## 4. Feedback Collection UX

### 4.1 Inline Feedback

| Element | Trigger | What's Collected |
|---------|---------|-----------------|
| Thumbs up/down | On every AI output | Satisfaction binary |
| Star rating | After task completion | 1-5 rating |
| Quick reasons | On dismiss/reject | Categorical reason |
| Free text | Optional text field | Qualitative feedback |

### 4.2 Feedback Timing

- **Implicit**: Collected automatically (edit, apply, dismiss)
- **Delayed**: Optional rating after task completion
- **Proactive**: "Was this helpful?" shown after 3rd interaction in session

### 4.3 Feedback Privacy

- User never required to provide feedback
- Feedback is anonymous to other users
- Feedback is used only for quality improvement, not performance evaluation

---

## 5. Error & Edge Cases

### 5.1 Error States

| State | UX | Message |
|-------|-----|---------|
| Timeout | Retry button with loading indicator | "Taking longer than usual. [Retry]" |
| Model unavailable | Graceful degradation | "AI assistant is unavailable. Please try again later." |
| Guardrail block | Block message with support link | "Unable to process this request. If you believe this is an error, contact support." |
| Low quality | Flag with explanation | "AI-generated content has low confidence. Please review carefully." |
| Empty results | "No suggestions" with alternatives | "No suggestions found. Try rephrasing your request." |

### 5.2 Offline Behavior

- AI features gracefully disabled when offline
- User sees: "AI features require an internet connection"
- Pending AI requests queued and retried on reconnection
- No cached AI responses (freshness requirement)

---

## 6. Progressive Disclosure

### 6.1 Levels of AI Integration

| Level | UI | User Skill |
|-------|-----|------------|
| **Basic** | Simple sparkle buttons, one-tap suggestions | Beginner |
| **Standard** | Side panel, accept/edit/reject, citations | Intermediate |
| **Advanced** | Custom prompts, model selection, chain-of-thought | Expert |

### 6.2 First-Time Experience

1. Welcome tooltip: "Tap the sparkle ✨ for AI suggestions"
2. After 3 AI uses: "Did you know you can edit AI suggestions?"
3. After 10 AI uses: "Explore the AI side panel for more options"
4. Settings: User can configure AI interaction level at any time

---

## 7. Mobile Considerations

| Constraint | UI Adaptation |
|------------|---------------|
| Small screen | Sheet (bottom) not side panel, compact suggestions |
| Touch targets | Minimum 44×44px for AI buttons |
| Network variable | Offline fallback with queued requests |
| Typing friction | Larger suggestion cards, fewer taps |
| Distraction-free | Shimmer loading, no spinning loaders |
| Gesture support | Swipe to accept (right) or dismiss (left) |
