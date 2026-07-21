# Merline Form Builder Architecture

## Overview

The Form Builder is the most complex UI component in Merline. It is a full-screen 3-panel editor supporting drag-and-drop question design, skip logic visualization, multi-language translations, validation rules, indicator linking, and autosave. It must handle questionnaires with 500+ questions without degradation.

---

## 3-Panel Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Toolbar (full width)                                                        │
│  [← Back] [Title: editable] [Undo] [Redo] [Saved 14:30] [Preview] [Deploy] │
├──────────────┬──────────────────────────────────────┬───────────────────────┤
│  PALETTE     │  CANVAS                              │  PROPERTIES           │
│  (240px)     │  (flex-1, scrollable)                │  (360px, scrollable)  │
│              │                                      │                       │
│  ┌────────┐  │  ┌────────────────────────────────┐  │  ┌─────────────────┐  │
│  │ Basic  │  │  │ Section: Demographics           │  │  Question Text    │  │
│  │ ≡ Text │  │  │ ≡ Q1. Age? [Number] *min:0     │  │  [______________] │  │
│  │ ≡ Num  │  │  │ ≡ Q2. Sex? [Single] Male/Female│  │  Type: Number     │  │
│  │ ≡ Date │  │  │ ≡ Q3. District? [Dropdown] ... │  │  Required [✓]     │  │
│  │ ≡ Time │  │  │ ≡ Q4. Phone? [Text] regex:...  │  │  ─────TABS──────  │  │
│  ├────────┤  │  │                                 │  │  [Basic] [Optns]  │  │
│  │ Choice │  │  │ [ADD SECTION]                    │  │  [Valdtn] [Logic] │  │
│  │ ≡ Sing │  │  │                                 │  │  [Indictr] [Trnsl]│  │
│  │ ≡ Mult │  │  │ ┌──────────────────────────────┐│  │ ────────────────  │  │
│  │ ≡ Drop │  │  │ │ Section: Health              ││  │ Min: [0]         │  │
│  │ ≡ Rank │  │  │ │ ≡ Q5. Vaccinated? [Single]  ││  │ Max: [120]       │  │
│  │ ≡ Like │  │  │ │    ┌──── Skip Logic ────┐   ││  │ Decimal: [0]     │  │
│  │ ≡ Matr │  │  │ │    │ If Yes → show Q6    │   ││  │ Unit: [years]   │  │
│  ├────────┤  │  │ │    └─────────────────────┘   ││  │                  │  │
│  │ Media  │  │  │ │ ≡ Q6. Doses? [Number]       ││  │                  │  │
│  │ ≡ GPS  │  │  │ └──────────────────────────────┘│  │                  │  │
│  │ ≡ Phot │  │  │                                 │  │  [Save] [Cancel] │  │
│  │ ≡ Audi │  │  │                                 │  │  └─────────────────┘  │
│  │ ≡ Vid  │  │  │                                 │  │                       │
│  │ ≡ Sign │  │  │                                 │  │                       │
│  │ ≡ Bar  │  │  │                                 │  │                       │
│  ├────────┤  │  │                                 │  │                       │
│  │ Adv.   │  │  │                                 │  │                       │
│  │ ≡ Sli  │  │  │                                 │  │                       │
│  │ ≡ Calc │  │  │                                 │  │                       │
│  │ ≡ Note │  │  │                                 │  │                       │
│  └────────┘  │  └────────────────────────────────┘  │                       │
└──────────────┴──────────────────────────────────────┴───────────────────────┘
```

---

## Drag-and-Drop Architecture (dnd-kit)

### Drag Sources

| Source | Type | Behavior |
|--------|------|----------|
| Palette → Canvas | New question | Creates question of selected type at drop position |
| Canvas (question) | Reorder | Moves question within/between sections |
| Canvas (section header) | Reorder section | Moves entire section block |
| Palette (section) | New section | Creates empty section at drop position |

### dnd-kit Configuration

```typescript
// Layout: vertical list
// Sensors: PointerSensor (click threshold 5px for drag vs click),
//          KeyboardSensor (Up/Down arrows for accessibility)
// Collision: closestCenter
// Overlay: DragOverlay renders question card (reduced opacity)

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

### Drag Overlay

When dragging from palette: shows question type icon + "New [Type] question"
When reordering: shows question text preview with drag handle
Drop animation: smooth spring transition to target position

---

## Question Type Components (24 Types)

Each question type maps to a dedicated renderer component:

| Type | Renderer | Input Component | Properties |
|------|----------|----------------|------------|
| TEXT_SHORT | TextShortWidget | Single-line input | maxLength, regex pattern |
| TEXT_LONG | TextLongWidget | Textarea (auto-resize) | maxLength (10000) |
| NUMERIC_INT | NumericIntWidget | Number input (stepper) | min, max |
| NUMERIC_DECIMAL | NumericDecimalWidget | Number input (decimal) | min, max, decimalPlaces |
| PERCENTAGE | PercentageWidget | Number input (0-100) | — |
| DATE | DateWidget | Calendar date picker | minDate, maxDate |
| TIME | TimeWidget | Time picker | 24h format |
| DATETIME | DateTimeWidget | Combined date + time | timezone |
| SINGLE_SELECT | SelectOneWidget | Radio or button group | options, "other" toggle |
| MULTIPLE_SELECT | SelectMultipleWidget | Checkbox group | options, min/max selections |
| DROPDOWN | DropdownWidget | Select dropdown | options, searchable (>20) |
| RANKING | RankingWidget | Drag-sortable list | min 3 options |
| LIKERT | LikertWidget | Radio group (balanced) | scale preset (5/7/4 point) |
| SLIDER | SliderWidget | Range slider | min, max, step |
| MATRIX | MatrixWidget | Grid of radio/checkboxes | rows, columns |
| GPS | GpsWidget | Map + accuracy indicator | accuracy threshold |
| PHOTO | PhotoWidget | Camera capture + preview | maxSize, resolution |
| VIDEO | VideoWidget | Video recorder | maxDuration, resolution |
| AUDIO | AudioWidget | Audio recorder | maxDuration, bitrate |
| SIGNATURE | SignatureWidget | Canvas pad | — |
| BARCODE | BarcodeWidget | Camera scanner | format (QR, EAN, etc.) |
| CALCULATED | CalculatedWidget | Formula display | formula string |
| NOTE | NoteWidget | Rich text display | content |
| COMPOSITE | CompositeWidget | Sub-field group | subField definitions |

---

## Skip Logic Visual Editor

### Logic Builder Interface

```
┌────────────────────────────────────────────────────────┐
│ Skip Logic                                             │
│                                                         │
│ WHEN:   [Q3. Vaccinated? ▼]                             │
│         [is equal to ▼]  ["No"]                         │
│ THEN:   [Hide ▼]  [Q4. Doses count]                    │
│                                                         │
│ ┌─ AND ─────────────────────────────────────────────┐   │
│ │ WHEN: [Q3. Vaccinated?] [is equal to] ["Yes"]      │   │
│ │ THEN: [Show] [Q4. Doses count]                     │   │
│ └────────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Add Condition]  [+ Add Action]                       │
│                                                         │
│ ⚠ Validation: No circular references detected ✓         │
│ All questions reachable ✓                               │
└────────────────────────────────────────────────────────┘
```

### Validation Engine

| Check | Description | Error |
|-------|-------------|-------|
| Circular reference | Detect A→B→C→A cycles | "Skip logic creates a circular reference" |
| Orphan target | Target question deleted | "Target question no longer exists" |
| Source after target | Target appears before source in flow | "Target must appear after source in the questionnaire" |
| Dead end | Path leads to no completion | "This path doesn't reach the end of the questionnaire" |
| Multiple conditions | >5 conditions on one rule | "Maximum 5 conditions per rule" |

### Visual Layer on Canvas

Toggleable overlay showing logic connections as SVG paths:
- Green line: Show condition
- Red line: Hide/Skip condition
- Dashed line: Complex condition (AND/OR)
- Click path → open logic editor for that rule
- Numbered badges on questions with logic rules

---

## Validation Rule Editor

```
┌──────────────────────────────────────┐
│ Validation Rules                     │
│                                      │
│ Required: [✓]                        │
│                                      │
│ ── Numeric Constraints ──            │
│ Minimum value: [0]                   │
│ Maximum value: [120]                 │
│ Decimal places: [0]                  │
│                                      │
│ ── Pattern ──                        │
│ Regex: [^\d{3}-\d{4}$]              │
│ Common patterns: [▼]                 │
│   ○ Email                           │
│   ○ Phone                           │
│   ○ National ID                     │
│   ○ Alphanumeric                    │
│                                      │
│ ── Cross-Field ──                    │
│ [Q1] [=] [Q2]                        │
│ [+ Add constraint]                   │
│                                      │
│ ── Custom Expression ──              │
│ [Q1 + Q2 <= 100]                     │
│ [Test Expression]                    │
└──────────────────────────────────────┘
```

### Validation Rule Types

| Category | Rules |
|----------|-------|
| Required | isRequired boolean |
| Type-specific | min/max for numbers, min/maxLength for text, min/maxDate for date |
| Pattern | regex string + common presets dropdown |
| Range | combo min+max for numbers/dates |
| Choice | minSelections, maxSelections for multi-select |
| Cross-field | consistency, sum check, sequence, dependency |
| Custom expression | formula string with question references |

---

## Translation / Localization Editor

```
┌──────────────────────────────────────────────┐
│ Translations                                  │
│                                               │
│ Language: [fr ▼] (French)                     │
│                                               │
│ ┌──────────────────────────────────────────┐  │
│ │ Question Text *                           │  │
│ │ EN: What is your age?                     │  │
│ │ FR: [Quel âge avez-vous?              ]  │  │
│ │                                           │  │
│ │ Help Text                                 │  │
│ │ EN: Enter age in completed years          │  │
│ │ FR: [Entrez l'âge en années révolues   ]  │  │
│ │                                           │  │
│ │ Options                                   │  │
│ │ ┌──────────────┬──────────────────────┐  │  │
│ │ │ Male         │ [Masculine         ]│  │  │
│ │ │ Female       │ [Feminine          ]│  │  │
│ │ └──────────────┴──────────────────────┘  │  │
│ └──────────────────────────────────────────┘  │
│                                               │
│ Translation Status: 23/25 questions complete   │
│ AI Translate [Fill missing translations with AI]│
│ Back-translate [Verify via back-translation]   │
└──────────────────────────────────────────────┘
```

### Multi-Language Architecture

```
Questionnaire
├── primaryLanguage: 'en'
└── translations: Map<languageCode, Translation>
    ├── 'fr': Translation { questions: {...}, options: {...} }
    ├── 'sw': Translation { questions: {...}, options: {...} }
    └── 'es': Translation { questions: {...}, options: {...} }

Fallback chain: selectedLanguage → primaryLanguage → null
```

---

## Preview Mode

### Dual Preview

```
┌─────────────────────┬──────────────────────┐
│   MOBILE (375px)    │   TABLET (768px)      │
│  ┌───────────────┐  │  ┌──────────────────┐ │
│  │ ○ What is...  │  │  │                  │ │
│  │ [___]         │  │  │  (mirrors mobile  │ │
│  │               │  │  │   but wider)      │ │
│  │ ○ How many... │  │  │                  │ │
│  │ ( ) 1         │  │  │                  │ │
│  │ ( ) 2         │  │  │                  │ │
│  │ ( ) 3+        │  │  │                  │ │
│  │               │  │  │                  │ │
│  │ [Prev] [Next] │  │  │                  │ │
│  └───────────────┘  │  └──────────────────┘ │
└─────────────────────┴──────────────────────┘
│ Language: [fr ▼]                             │
│ Device: [Mobile ▼]                           │
└──────────────────────────────────────────────┘
```

### Preview Behavior

- Fully interactive: tap/click answers, see skip logic execute
- Language switcher changes all displayed text
- Device toggle switches frame width
- Progress indicator shows position
- Validation errors display as they would in field
- "Exit Preview" returns to builder (state preserved)

---

## Autosave

### Mechanism

| Aspect | Implementation |
|--------|---------------|
| Interval | 30 seconds from last change |
| Trigger | Any canvas change (add, edit, reorder, delete) |
| Indicator | Green "Saved at 14:30:22" / Yellow "Unsaved changes" / Gray "Saving..." |
| Fallback | `localStorage` backup on every edit (debounced 2s) |
| On navigation | `beforeunload` guard: "You have unsaved changes. Leave anyway?" |
| Conflict | Server returns 409 if version mismatch → user prompted to reload |
| Retry | 3 retries with 2s exponential backoff on save failure |

### Autosave Store (Zustand)

```typescript
interface FormBuilderState {
  // Canvas
  questions: Question[];
  sections: Section[];
  selectedQuestionId: string | null;
  expandedSections: Set<string>;

  // Undo/Redo (max 50 operations)
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];

  // Save state
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSavedAt: number | null;
  localBackupAt: number | null;
  version: number; // server version for conflict detection
  isDirty: boolean;
}
```

---

## Performance Considerations (500+ Questions)

| Concern | Strategy |
|---------|----------|
| Canvas rendering | Virtualized list (TanStack Virtual), only render visible questions + 5 buffer |
| Properties panel | Render only when question is selected; lazy load tabs |
| Palette | Static list, no re-renders |
| Skip logic overlay | Compute SVG paths lazily, render on a separate canvas layer (requestAnimationFrame) |
| Undo/redo | Snapshots store diffs (not full state); max 50 entries |
| Autosave | Debounced; batch changes before serialization |
| Translation editor | Lazy load per-language; only selected language in DOM |
| Preview rendering | Lazy render off-screen frame (hidden until toggled) |
| Question reorder | Optimistic reorder, no full list re-render (use unique keys) |
| Section collapse | Remove hidden questions from DOM (not just hide) |

### Virtualization Setup (Canvas)

```typescript
const virtualizer = useVirtualizer({
  count: allItems.length, // questions + section headers
  getScrollElement: () => canvasRef.current,
  estimateSize: (index) => {
    const item = allItems[index];
    return item.type === 'section' ? 48 : 72; // section header vs question height
  },
  overscan: 5,
});
```

### Data Structure for Large Forms

```typescript
// Flat array for virtual scrolling (not nested tree)
interface CanvasItem {
  id: string;
  type: 'section' | 'question';
  sectionId?: string; // parent section
  orderIndex: number;
  // ... type-specific data
}

// Section boundaries maintained separately
interface Section {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  isRepeatable: boolean;
  questionIds: string[]; // ordered references
}
```
