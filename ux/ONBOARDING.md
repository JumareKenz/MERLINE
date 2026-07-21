# Merline User Onboarding

## Onboarding Philosophy

Onboarding should make users successful within their first session — not overwhelm them with features. We use progressive discovery: teach what users need when they need it, not all at once.

## 1. First-Run Experience by Persona

### 1.1 Administrator (First User in Organization)

**Goal:** Complete organization setup and feel confident managing the platform.

**Flow:**
```
Registration → Org Setup → Dashboard Tour → Invite Team
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | Registration | Standard email/password registration with password strength meter |
| 2 | Welcome Modal | "Welcome to Merline! Let's set up your organization." with 3-step progress indicator |
| 3 | Org Setup | Form: name, type, country, logo upload. Progress: "Step 1 of 3" |
| 4 | Team Setup | "Invite your team" — single or bulk email input with role assignment. Progress: "Step 2 of 3" |
| 5 | First Study Prompt | "You're all set! Would you like to create your first study?" or "Explore the dashboard" |
| 6 | Dashboard Tour | Guided spotlight tour (3 steps): Sidebar navigation, Top bar actions, Notification center |
| 7 | Success State | Dashboard with "Getting Started" checklist widget |

**Checklist widget on dashboard:**
- [ ] Set up organization profile
- [ ] Invite team members (0 of N invited)
- [ ] Create your first project
- [ ] Design your first questionnaire
- [ ] Deploy to the field

### 1.2 Researcher

**Goal:** Create or join a study and design a questionnaire within first session.

**Flow:**
```
Login → Project/Study → Questionnaire Builder → Success
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | Login | Standard login; if first time, brief welcome |
| 2 | Dashboard | Shows "Welcome back, Dr. Amara" with quick actions |
| 3 | Project Context | Opens to project list (existing) or prompt to create |
| 4 | First Study Creation | Guided wizard with tooltips on each step: "Study type determines available methodology options" |
| 5 | First Questionnaire | Opens form builder with template suggestion: "Start with a template or create from scratch?" |
| 6 | Template Gallery | Shows 3 templates: "Household Survey", "KAP Survey", "Blank Canvas" |
| 7 | Form Builder | Coach marks: "Drag questions here", "Configure properties here", "Click Preview to test" |
| 8 | Success | "Questionnaire saved! Submit for review when ready." |

**Tooltip inventory for Researcher first session:**
- "Projects organize your studies. Each project can have multiple studies."
- "Study types: Baseline measures before intervention; Endline measures after."
- "Indicators define what you're measuring. Link them to questionnaire questions."
- "Skip logic creates intelligent forms that adapt to respondent answers."
- "Preview shows exactly what enumerators will see on their phones."

### 1.3 Enumerator

**Goal:** Complete and submit first survey successfully.

**Flow:**
```
Login (mobile) → First Assignment → Complete Survey → Sync → Success
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | App Launch | Splash screen with "Merline" logo → Home |
| 2 | First Login | Large buttons, simple form; biometric option if available |
| 3 | Home | "You have 1 new survey assignment" card (prominent) |
| 4 | First Survey | Tap card → "Ready to start? Tap 'Begin'" with large green button |
| 5 | During Survey | Question-by-question with progress bar; inline hints for first 3 questions |
| 6 | GPS Capture | First GPS prompt: "Tap the GPS button to capture your location. Make sure you're outdoors." |
| 7 | Photo Capture | First photo prompt: "Take a clear photo of the dwelling entrance." |
| 8 | First Submission | Review screen: "You answered all questions! Tap Submit." |
| 9 | Sync Prompt | "Submission saved! Tap 'Sync' when you have internet to send your data." |
| 10 | Sync Success | "Your first submission was synced successfully! ✓" with celebration animation |

**Key principles for Enumerator onboarding:**
- Zero text instructions if possible; use icons and animations
- All buttons must be large (minimum 48px height)
- Critical actions (Submit, Sync) in prominent green
- Error states use simple language: "No internet. Data saved. Will send later."
- Voice-guided surveys for low-literacy users (Phase 2)

### 1.4 Supervisor

**Goal:** Monitor team progress and review first flagged submission.

**Flow:**
```
Login → Dashboard → Submissions → First Flag → Action
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | Login | Standard web login |
| 2 | Dashboard | "You have 5 submissions to review" prompt card |
| 3 | Submissions List | Filtered to show flagged submissions first |
| 4 | Submission Detail | First review: panel highlights quality flags with explanations |
| 5 | Action Guidance | Tooltip on action buttons: "Approve — data looks good", "Reject — data needs re-collection", "Flag — needs supervisor verification" |
| 6 | Success | "Submission reviewed. 4 remaining." with progress |

**Coach marks:**
- "Assignments tab: assign surveys to your team"
- "Quality flags: red = critical, yellow = warning, blue = info"
- "Message: send feedback directly to enumerators"

### 1.5 Program Manager

**Goal:** View dashboard and generate a report.

**Flow:**
```
Login → Dashboard Tour → Report Generation → Export
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | Login | Standard web login |
| 2 | Dashboard | Auto-opens to executive dashboard with tooltip: "This is your program overview" |
| 3 | Dashboard Tour | 4 spotlight steps: KPI cards, indicator tracking, map widget, alerts panel |
| 4 | First Report | "Would you like to generate a report?" prompt on entering Reports tab |
| 5 | Report Wizard | Each step annotated: "Select a template", "Choose your data source", "Select indicators" |
| 6 | Export | "Your report is ready. Export as PDF or share a link." |

### 1.6 Country Director / Donor

**Goal:** Access portfolio view and understand data at a glance.

**Flow:**
```
Login (magic link or SSO) → Portfolio Dashboard → Drill Down → Export
```

**Steps:**

| Step | Screen | Experience |
|------|--------|------------|
| 1 | Email Login | Magic link emailed; click to authenticate (no password needed for first time) |
| 2 | Portfolio View | Simplified dashboard with large RAG indicators; minimal clutter |
| 3 | Guided Highlight | "Tap any red indicator to see details" callout |
| 4 | Cross-Program View | "You have access to N programs. Select one to drill down." |
| 5 | Success | Export brief or share link with one click |

## 2. Progressive Onboarding

### 2.1 Feature Discovery Timeline

Instead of showing everything at once, features are introduced as users encounter relevant contexts.

| Session | Features Introduced | Method |
|---------|-------------------|--------|
| Session 1 | Dashboard, Projects, Studies | Required tour |
| Session 2 | Questionnaires, Indicator linking | Contextual tooltip |
| Session 3 | Assignment management, Data collection | Contextual tooltip |
| Session 4 | Submission review, Quality flags | Contextual tooltip |
| Session 5 | Reports, Export | Contextual tooltip |
| Session 6+ | Advanced features (filters, bulk actions, scheduled reports) | "Did you know?" tips |

### 2.2 "Did You Know?" Tips

Non-intrusive tips shown in empty space or after completing actions:

- "Did you know? You can reuse indicators across studies via the Indicator Library."
- "Did you know? Forms auto-save every 30 seconds. You never lose work."
- "Did you know? Click the bell icon to see notifications about approvals and flags."
- "Did you know? Press Ctrl+K to search across the entire platform."

**Frequency:** Max 1 per session, 3 per week. Users can dismiss permanently.

**Location:** Bottom-left corner, small text, fade in/out.

### 2.3 Feature Badges (New)

New features are marked with a "New" badge for 2 weeks after launch:
- In navigation sidebar: "Reports [New]"
- In toolbar: "AI Summary [New]" (Phase 2)
- Badge disappears after user interacts with feature or after 2 weeks

## 3. Guided Workflows for Complex Tasks

### 3.1 First Study Creation Guide

When a user creates their first study, a side panel walks them through each step:

```
┌────────────────────────────────────┐
│        Study Creation Guide        │
│                                    │
│  Step 2 of 5: Methodology         │
│                                    │
│  Choose how you'll collect data.  │
│                                    │
│  • Quantitative: Numbers, surveys │
│  • Qualitative: Interviews, focus │
│    groups, observations           │
│  • Mixed Methods: Both            │
│                                    │
│  [Not sure? Click here for help]   │
│                                    │
│          [Continue]                │
└────────────────────────────────────┘
```

### 3.2 First Questionnaire Design Guide

Side panel or overlay guides through the form builder:

```
┌────────────────────────────────────┐
│     Building Your Questionnaire    │
│                                    │
│  Step 1: Add a question            │
│  → Drag "Text" from the left       │
│    panel into the canvas           │
│                                    │
│  Step 2: Configure your question   │
│  → Click the question to open      │
│    properties on the right panel   │
│                                    │
│  Step 3: Add skip logic            │
│  → Open the Skip Logic tab         │
│    in the right panel              │
│                                    │
│          [Dismiss]                 │
└────────────────────────────────────┘
```

## 4. Tooltip and Help System

### 4.1 Contextual Help (? icon)

Available on every complex screen. Click opens a tooltip explaining the screen's purpose and primary actions.

**Locations:**
- Top right of page header
- Next to complex form fields
- Next to unfamiliar terminology

**Content:**
- 1-2 sentence explanation
- Link to knowledge base article
- "Show me how" video link (Phase 2)

### 4.2 Terminology Glossary

Hover over MERL-specific terms shows definition tooltip:

| Term | Tooltip |
|------|---------|
| Indicator | "A variable that measures change or tracks progress toward a result." |
| RAG Status | "Red/Amber/Green status: Red = below target, Amber = at risk, Green = on track." |
| Disaggregation | "Breaking down data by categories like gender, age, or region." |
| Skip Logic | "Rules that show or hide questions based on previous answers." |
| ToC | "Theory of Change — a framework showing how change is expected to happen." |

### 4.3 Knowledge Base Integration

- "Help" link in sidebar footer → opens knowledge base
- Search within help from any page (Ctrl+K → type "help with...")
- Context-sensitive: "Help with this page" button
- Article format: Problem → Solution → Related topics
- Offline help: static FAQ bundled with mobile app

### 4.4 In-App Messaging (Phase 2)

- "Need help? Chat with support" floating button
- Priority support for enterprise users
- Response time indicator

## 5. Empty State Education

Every empty screen is an opportunity to teach. See Interaction Specifications §11 for full empty state designs. Key educational elements:

- **Why is this empty?** — "You haven't created any studies yet."
- **What is this screen for?** — "Studies are structured research activities."
- **What should I do?** — "Create your first study to begin."
- **Where do I start?** — Primary CTA button + secondary "Learn more" link

## 6. AI-Assisted Onboarding (Phase 2)

### 6.1 AI Onboarding Coach

An optional AI chat interface that guides new users:
- "I'm your Merline assistant. Would you like help setting up your first study?"
- Natural language responses to user questions
- Can demonstrate workflows step by step
- Learns from user behavior to suggest relevant features

### 6.2 AI-Suggested Next Actions

Based on user behavior, the AI suggests what to do next:
- "You've created a study. Would you like me to help you design a questionnaire?"
- "You have 10 pending submissions. Would you like me to review quality flags?"
- "Your report is ready. Would you like to share it with stakeholders?"

### 6.3 AI-Powered Adaptive Help

- Detects user frustration (rapid clicks, undo patterns, repeated errors)
- Proactively offers help: "It looks like you're having trouble with skip logic. Would you like a tutorial?"
- Escalates to human support if AI cannot resolve

## 7. Training and Learning Resource Integration

### 7.1 Built-In Tutorials

Accessible from Help menu → "Interactive Tutorials":

| Tutorial | Duration | Audience |
|----------|----------|----------|
| Creating Your First Study | 5 min | Researchers |
| Designing a Questionnaire | 10 min | Researchers, M&E Officers |
| Collecting Data in the Field | 3 min | Enumerators |
| Monitoring Your Team | 5 min | Supervisors |
| Building a Dashboard | 7 min | Program Managers |
| Generating a Report | 5 min | All users |

### 7.2 Video Library

- Short (<3 min) demonstration videos
- Integrated into help tooltips
- Available offline on mobile app
- Community-contributed tips (Phase 3)

### 7.3 Certification Path (Phase 3)

- "Merline Certified Researcher" — completed all tutorials + passed quiz
- "Merline Certified Supervisor" — field management certification
- Badges displayed on user profile
- Reports to manager for training compliance

## 8. Onboarding Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first submission | < 30 min for admin/researcher setup | Platform analytics |
| Time to first submission for enumerator | < 5 min from app open | Mobile analytics |
| First session completion rate | > 80% of new users complete first workflow | Funnel analysis |
| Tutorial completion rate | > 40% of new users complete at least 1 tutorial | Analytics |
| Help article views per user | < 2 per session (goal: users don't need help) | Analytics |
| User activation (completed core action in first week) | > 60% | Cohort analysis |
| Onboarding NPS | > 40 | Survey after first week |
