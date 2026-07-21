# Frontend Testing Plan — Phase 1 (MVP)

## Technology Stack

- **Framework**: Next.js 14+ (React 18+, TypeScript)
- **Unit/Component Test Runner**: Vitest
- **Component Testing**: @testing-library/react
- **E2E**: Playwright
- **Accessibility**: axe-core via @axe-core/playwright
- **Visual Regression**: Storybook + Chromatic (or Playwright snapshots)
- **State Management**: Zustand (test with vanilla stores)
- **Form Testing**: React Hook Form + Zod validation

## Test Count Targets

| Test Type | Target | Priority |
|-----------|--------|----------|
| Unit (hooks, utilities) | 150 | P0 |
| Component (individual widgets) | 200 | P0 |
| Integration (feature-level compositions) | 100 | P0 |
| E2E (critical user journeys) | 20 | P0 |
| Visual regression (stories) | 80 | P1 |
| Accessibility (automated) | 50 | P0 |
| **Total Frontend** | **600** | |

## 1. Component Testing (Vitest + Testing Library)

### Principles
- Test behavior, not implementation
- Query by role/text/label, never by test ID or class name
- Use `userEvent` over `fireEvent`
- Mock API calls with `msw` (Mock Service Worker)
- Wrap in required providers (QueryClient, Router, Theme)

### Component Test Examples

```typescript
// QuestionEditor.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionEditor } from './QuestionEditor';

describe('QuestionEditor', () => {
  it('renders question text input', () => {
    render(<QuestionEditor onChange={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /question text/i })).toBeInTheDocument();
  });

  it('calls onChange when question type changes', async () => {
    const handleChange = vi.fn();
    render(<QuestionEditor onChange={handleChange} />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /question type/i }),
      'select_one'
    );
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ question_type: 'select_one' })
    );
  });

  it('shows options editor for select type questions', () => {
    render(<QuestionEditor questionType="select_one" />);
    expect(screen.getByRole('region', { name: /options/i })).toBeInTheDocument();
  });

  it('hides options editor for text type questions', () => {
    render(<QuestionEditor questionType="text" />);
    expect(screen.queryByRole('region', { name: /options/i })).not.toBeInTheDocument();
  });
});
```

### Components to test (P0)
- `LoginForm` — Validation, submission, error states
- `OrganizationSwitcher` — List, selection, empty state
- `ProjectList` — Pagination, filter, empty, loading
- `StudyCard` — Status badge, dates, progress
- `QuestionEditor` — Type switching, options, validation rules, translations
- `FormPreview` — Question rendering, skip logic execution, validation display
- `IndicatorTable` — Sort, filter, target comparison, RAG status
- `AssignmentCard` — Progress bar, due date, status
- `SubmissionList` — Status filter, sync indicator, pagination
- `DashboardChart` — Data rendering, empty state, error state
- `DataTable` — Sort, filter, pagination, column customization
- `ReportPreview` — Section rendering, chart embeds, export button
- `UserInviteForm` — Email validation, role selection
- `PermissionEditor` — Role-permission matrix

## 2. Integration Testing

### Feature-level tests
- Form builder: Add questions → configure → preview → save
- Study creation wizard: Complete all steps → submit → verify
- Dashboard: Load → filter by date → filter by region → export
- Report generation: Select template → confirm → view → export

```typescript
// FormBuilder.integration.test.tsx
describe('FormBuilder Integration', () => {
  it('completes full form creation flow', async () => {
    render(<FormBuilderWrapper />);

    // Step 1: Add questions
    await userEvent.click(screen.getByRole('button', { name: /add question/i }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'text');
    await userEvent.type(screen.getByRole('textbox', { name: /label/i }), 'What is your name?');

    // Step 2: Add select question with options
    await userEvent.click(screen.getByRole('button', { name: /add question/i }));
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], 'select_one');
    await userEvent.type(screen.getByLabelText(/option 1/i), 'Yes');
    await userEvent.click(screen.getByRole('button', { name: /add option/i }));
    await userEvent.type(screen.getByLabelText(/option 2/i), 'No');

    // Step 3: Preview
    await userEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.getByText('What is your name?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();

    // Step 4: Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/form saved/i)).toBeInTheDocument();
    });
  });
});
```

## 3. E2E Testing (Playwright)

### Critical User Journeys (10 tests)

| # | Journey | Priority | Tests |
|---|---------|----------|-------|
| 1 | User registration + email verification | P0 | 2 |
| 2 | Organization creation + team setup | P0 | 2 |
| 3 | Study creation + lifecycle workflow | P0 | 3 |
| 4 | Form builder (full create → preview → deploy) | P0 | 3 |
| 5 | Web data entry (submit form via browser) | P0 | 2 |
| 6 | Dashboard viewing + filtering | P0 | 2 |
| 7 | Report generation + download | P0 | 2 |
| 8 | User management (invite, role assignment) | P0 | 2 |
| 9 | Data export (CSV, Excel) | P0 | 2 |
| 10 | Multi-language form display | P0 | 2 |

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,
  workers: 4,
  reporter: [['html'], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
```

### E2E Test Example

```typescript
// e2e/study-creation.spec.ts
test('researcher creates a study through the wizard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'researcher@org.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');

  await page.click('text=Create Project');
  await page.fill('[name="name"]', 'Health Baseline 2026');
  await page.fill('[name="description"]', 'Baseline survey for health program');
  await page.click('button:has-text("Create")');
  await page.waitForSelector('text=Health Baseline 2026');

  await page.click('text=New Study');
  await page.selectOption('[name="study_type"]', 'baseline');
  await page.fill('[name="title"]', 'Community Health Assessment');
  await page.fill('[name="start_date"]', '2026-08-01');
  await page.click('button:has-text("Save & Continue")');
  await page.waitForSelector('text=Community Health Assessment');

  // Verify study appears on dashboard
  await page.goto('/projects');
  await expect(page.locator('text=Community Health Assessment')).toBeVisible();
});
```

## 4. Visual Regression Testing

### Strategy
- Use Storybook for component-level visual snapshots
- Run Chromatic on every PR
- Baseline update approved manually
- Viewport variations (360px, 768px, 1280px, 1920px)

### Components with visual tests
- All form elements (inputs, selects, toggles, sliders)
- Data table (with data, empty, loading states)
- Charts (bar, line, pie, donut with various data)
- Cards (study card, indicator card, assignment card)
- Navigation (sidebar, top bar, mobile menu)
- Modal/dialog (open, closed, with form)
- Status badges (all color variants)
- Progress bars (0%, 50%, 100%, error state)

## 5. Accessibility Testing

### Automated Checks (axe-core)
- Run on every component in Storybook
- Run on every page during E2E tests
- WCAG 2.1 AA compliance target
- Blocking issues: missing labels, low contrast, missing ARIA

```typescript
// In Playwright E2E
import AxeBuilder from '@axe-core/playwright';

test('study dashboard has no accessibility violations', async ({ page }) => {
  await page.goto('/studies/test-study-1/dashboard');
  await page.waitForSelector('[data-testid="dashboard-loaded"]');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
```

### Manual Checks
- Keyboard navigation (Tab, Enter, Escape, arrow keys)
- Screen reader testing (NVDA, VoiceOver)
- Focus order during form completion
- Error announcements for validation

## 6. State Management Testing

### Zustand Store Tests

```typescript
// useStudyStore.test.ts
describe('useStudyStore', () => {
  beforeEach(() => {
    useStudyStore.setState(initialState);
  });

  it('sets current study', () => {
    const study = createMockStudy();
    useStudyStore.getState().setCurrentStudy(study);
    expect(useStudyStore.getState().currentStudy).toEqual(study);
  });

  it('updates study status', () => {
    useStudyStore.getState().setCurrentStudy(createMockStudy());
    useStudyStore.getState().updateStatus('approved');
    expect(useStudyStore.getState().currentStudy?.status).toBe('approved');
  });
});
```

## 7. Form Testing

### Form validation tests (React Hook Form + Zod)

```typescript
describe('StudyForm validation', () => {
  it('shows error for missing title', async () => {
    render(<StudyForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('shows error when end date precedes start date', async () => {
    render(<StudyForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/start date/i), '2026-12-01');
    await userEvent.type(screen.getByLabelText(/end date/i), '2026-01-01');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
  });
});
```

## 8. Dashboard/Data Table Testing

### Dashboard Component Tests
- Indicator tracking with RAG colors renders correctly
- Filtering updates chart data
- Empty state shows guidance message
- Loading state shows skeleton
- Error state shows retry button

### Data Table Tests
- Column sorting (ascending, descending, none)
- Text search filters rows
- Pagination (next, previous, page numbers)
- Row selection (single, bulk)
- Export button visibility based on permissions
