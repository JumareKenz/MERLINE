# Merline Experience Metrics

## Measurement Philosophy

We measure experience to improve it — not to judge users. Every metric is a signal that informs design decisions. Metrics without action are noise.

Metrics are collected automatically where possible, supplemented by periodic user research.

---

## 1. Key Experience Metrics

### 1.1 Task Completion Rate

| What | % of users who successfully complete a defined task |
|------|------------------------------------------------------|
| **Why** | Measures whether workflows are learnable and usable |
| **Target** | > 85% for all core tasks |
| **Method** | Automated event tracking (funnel analysis) |
| **Tasks Tracked** | Create study, Design questionnaire, Submit data, Review submission, Generate report, Invite user |

**Funnel Example — Create Study:**
```
Start study creation wizard → 100%
  Complete Step 1 (Type & Methodology) → 92%
  Complete Step 2 (Purpose & Objectives) → 88%
  Complete Step 3 (Population & Sampling) → 85%
  Complete Step 4 (Timeline) → 83%
  Complete Step 5 (Submit for Approval) → 80%
```

**Drop-off analysis:** Investigate steps with > 10% drop-off. Each drop-off point triggers UX review.

### 1.2 Time on Task

| What | Time taken to complete a specific task from start to finish |
|------|------------------------------------------------------------|
| **Why** | Measures efficiency; reveals friction points |
| **Target** | Create study: < 10 min. Design 50-question form: < 30 min. Submit survey: < original survey time. Generate report: < 5 min. |
| **Method** | Timestamped event logs (task start → task completion) |
| **Benchmarking** | Compare against expert time (internal) and beginner time (real users) |

**Outlier detection:**
- Time < 10th percentile → possible automation or skipping steps
- Time > 90th percentile → probable confusion or friction
- Both trigger review

### 1.3 Error Rate

| What | Number of errors per task attempt |
|------|-----------------------------------|
| **Why** | Measures form design quality, validation effectiveness, user confidence |
| **Target** | < 2 errors per form submission; < 5% validation failure rate |
| **Method** | Track validation errors, form resubmissions, failed syncs |
| **Error Types** | Validation errors (field-level), submission errors (API), navigation errors (404, permission denied), sync errors, search with zero results followed by modification |

**Error Recovery Rate:**
- % of errors resolved within same session
- % of errors leading to task abandonment
- Target: > 90% recovery within session

### 1.4 Navigation Success

| What | % of navigations that reach intended destination |
|------|--------------------------------------------------|
| **Why** | Measures information architecture and discoverability |
| **Target** | > 95% first-click success |
| **Method** | Track navigation paths; identify repeated back/forth, excessive clicks, search-for-navigation patterns |

**Signals of navigation failure:**
- User clicks sidebar item, returns within 5 seconds, clicks different item
- User opens search and types a module name that exists in sidebar
- User visits breadcrumb level 3+ frequently (lost depth)
- User uses browser back button more than 3 times in a session

### 1.5 AI Acceptance Rate (Phase 2)

| What | % of AI-generated suggestions accepted by users |
|------|-------------------------------------------------|
| **Why** | Measures AI relevance, trust, and quality |
| **Target** | > 80% acceptance for recommendations; > 60% for auto-generated content |
| **Method** | Track AI suggestion → user action (accept/modify/reject/dismiss) |

### 1.6 Drop-off Rate

| What | % of users who abandon a multi-step workflow before completion |
|------|---------------------------------------------------------------|
| **Why** | Identifies workflow friction points |
| **Target** | < 15% drop-off per workflow |
| **Method** | Step-by-step funnel tracking |

**High-risk workflows:**
- Study creation wizard (5 steps) — risk of drop-off at steps 3+
- Report generation (5 steps) — risk at step 2+ if data selection is complex
- User invitation (bulk) — risk at email paste step if format errors

### 1.7 User Satisfaction (CSAT)

| What | Post-task satisfaction rating (1-5 scale) |
|------|------------------------------------------|
| **Why** | Measures user sentiment after key tasks |
| **Target** | > 4.0 average |
| **Method** | Micro-survey after task completion: "How easy was it to [task]?" (1=Very difficult, 5=Very easy) |

**Trigger:** After completing: Create Study, Submit First Survey, Generate First Report, Approve First Submission.

### 1.8 System Usability Scale (SUS)

| What | Standardized 10-item questionnaire measuring perceived usability |
|------|-----------------------------------------------------------------|
| **Why** | Industry-standard benchmark; comparable across products |
| **Target** | > 80 (Grade A) |
| **Method** | SUS survey administered quarterly to active users |
| **Benchmark** | Average SUS score for enterprise software: 68. Merline target: 80+ |
| **Sample** | Minimum 20 respondents per quarter |

### 1.9 Net Promoter Score (NPS)

| What | "How likely are you to recommend Merline to a colleague?" (0-10) |
|------|-----------------------------------------------------------------|
| **Why** | Measures overall product loyalty and satisfaction |
| **Target** | > 50 (excellent for enterprise B2B) |
| **Method** | Quarterly email survey; in-app prompt after 3+ sessions |

### 1.10 Single Ease Question (SEQ)

| What | Post-task: "Overall, this task was..." (1=Very difficult, 7=Very easy) |
|------|------------------------------------------------------------------------|
| **Why** | Lightweight, high-volume task difficulty measurement |
| **Target** | > 5.5 average per task |
| **Method** | In-line after critical task completions |

### 1.11 Cognitive Load (NASA-TLX — Periodic)

| What | NASA Task Load Index: Mental demand, physical demand, temporal demand, performance, effort, frustration |
|------|-------------------------------------------------------------------------------------------------------|
| **Why** | Measures the cognitive burden of complex workflows |
| **Target** | Overall weighted score < 45/100 |
| **Method** | Administered during usability testing sessions |
| **Frequency** | Per major feature release |

### 1.12 Accessibility Score

| What | Automated accessibility audit score + manual audit pass rate |
|------|-------------------------------------------------------------|
| **Why** | Ensures platform is usable by people with disabilities |
| **Target** | 100% on automated audit; 0 critical/blocker issues in manual audit |
| **Method** | axe-core in CI; manual screen reader testing per release; annual third-party audit |

### 1.13 Offline Experience Score

| What | Measures how well offline mode preserves functionality and data |
|------|---------------------------------------------------------------|
| **Why** | Offline-first is core to Merline's value proposition |
| **Target** | > 95% task completion rate offline vs online; < 0.1% data loss rate |
| **Method** | Track sync success rate, conflict rate, data loss events, offline task attempts |

---

## 2. Measurement Methodology

### 2.1 Automated Tracking (Always-On)

| Tool | Purpose |
|------|---------|
| Product analytics (PostHog/Mixpanel) | Event tracking, funnel analysis, retention, session replays |
| RUM (Real User Monitoring) | Page load times, API response times, JS errors |
| Error tracking (Sentry) | Crash rate, API error rate, frontend error rate |
| Feature flag system | A/B test assignment, gradual rollout tracking |
| Sync telemetry | Sync success rate, conflict rate, pending duration |

### 2.2 Periodic Research (Qualitative)

| Method | Frequency | Sample | Purpose |
|--------|-----------|--------|---------|
| Usability testing | Bi-weekly | 5 users per test | Identify usability issues before release |
| Contextual inquiry | Quarterly | 3-5 field visits | Understand real-world usage context |
| Card sorting | Yearly (or when IA changes) | 15-20 users | Validate information architecture |
| Tree testing | Yearly (or when IA changes) | 20-30 users | Test navigation findability |
| Diary study | Yearly | 10 users, 2 weeks | Understand long-term usage patterns |

### 2.3 Continuous Feedback

| Channel | Method | Trigger |
|---------|--------|---------|
| In-app feedback button | "Send feedback" (thumbs up/down + optional text) | Persistent in bottom-right |
| Feature-specific feedback | "Was this helpful?" yes/no | After using a feature for first time |
| Session replay | Recorded sessions (with consent) | Random sample of sessions |
| Support ticket analysis | Tag and categorize support tickets | Weekly review of support trends |
| User community | Feature requests, bug reports | Ongoing (Phase 2+) |

---

## 3. Baseline Targets

| Metric | Current Baseline (MVP Launch) | 6-Month Target | 12-Month Target | 24-Month Target |
|--------|------------------------------|----------------|-----------------|-----------------|
| Task Completion Rate | 70% (estimated start) | 80% | 85% | 90% |
| Time to Create Study | 15 min | 12 min | 10 min | 8 min |
| Time to Design 50-Q Form | 45 min | 35 min | 30 min | 25 min |
| Form Submission Error Rate | 8% | 6% | 5% | 3% |
| Navigation Success (first click) | 85% | 90% | 95% | 97% |
| Drop-off Rate (study creation) | 25% | 20% | 15% | 10% |
| SUS Score | 65 (estimated) | 72 | 80 | 85 |
| NPS | 20 (estimated) | 35 | 50 | 60 |
| CSAT (post-task) | 3.5 | 3.8 | 4.2 | 4.5 |
| Sync Success Rate | 95% | 98% | 99% | 99.5% |
| Data Loss Rate | 0.5% | 0.2% | 0.1% | 0.05% |
| Accessibility (automated) | 95% | 98% | 100% | 100% |
| Mobile Crash Rate | 1% | 0.5% | 0.2% | 0.1% |

---

## 4. Continuous Monitoring Approach

### 4.1 Weekly Review

| Item | Owner | Action |
|------|-------|--------|
| Task completion rate trends | UX Architect | Flag declining trends |
| Top 3 error types by frequency | UX + QA | Prioritize fixes |
| Sync success rate | Mobile Lead | Investigate failures |
| Support ticket themes | Product Manager | Identify UX patterns |
| Feature adoption (new releases) | Product Manager | Assess onboarding effectiveness |

### 4.2 Monthly Review

| Item | Owner | Action |
|------|-------|--------|
| SUS score trend | UX Architect | Compare vs target |
| NPS trend | Product Manager | Identify detractors |
| Funnel analysis for top 5 workflows | UX Architect | Identify drop-off points |
| Session replay review (10 random) | UX Researcher | Identify friction |
| Accessibility audit snapshot | UX + QA | Track improvements |
| Offline experience metrics | Mobile Lead | Sync health report |

### 4.3 Quarterly Review

| Item | Owner | Action |
|------|-------|--------|
| Full UX metrics dashboard review | UX Architect | Present to executive team |
| Usability test findings | UX Researcher | Prioritize improvements |
| Competitive benchmarking | Product Manager | Industry comparison |
| Accessibility conformance audit | UX + QA | Remediate findings |
| Cognitive load study (targeted) | UX Researcher | Improve complex workflows |

### 4.4 Metrics Dashboard

**Always-on dashboard showing:**
- Current vs target for each metric (RAG status)
- 30-day trend lines
- Breakdown by user role, module, device type
- Top 10 errors by frequency
- Sync health: success rate, pending count, average sync time
- Feature adoption: % of eligible users who have tried each feature
- Session replay highlights (flagged for friction)

---

## 5. User Feedback Collection Strategy

### 5.1 In-App Feedback

| Location | Prompt | Frequency |
|----------|--------|-----------|
| After task completion | "How easy was that?" (1-5 stars) | Every task completion |
| Feature discovery | "Was this helpful?" (Yes/No) | First 3 uses of a feature |
| Error recovery | "Did this error message help you resolve the issue?" (Yes/No) | After error recovery |
| Session end (desktop) | "Any feedback on today's session?" (optional text) | 1 in 10 sessions |
| Dashboard | "Is this dashboard showing what you need?" (Yes/No + optional) | Once per user per month |

### 5.2 Periodic Surveys

| Survey | Frequency | Sample | Questions |
|--------|-----------|--------|-----------|
| SUS | Quarterly | All active users (30+%) | Standard 10-item SUS |
| NPS | Quarterly | All users who completed ≥1 study | 0-10 recommendation + "Why?" |
| Feature satisfaction | Bi-annual | Power users (top 20% by usage) | Rate top 10 features |
| New user onboarding | After first week | All new users | "What was confusing?" + SUS-lite |
| Offline experience | After first offline session | All offline users | "Rate your offline experience" |

### 5.3 User Research Recruitment

- **Power user panel**: Top 5% by session count; invited to quarterly feedback sessions
- **New user panel**: Users in first 30 days; invited to weekly 15-min calls
- **Enterprise account reviews**: Quarterly check-ins with each enterprise customer
- **Field observation**: Annual visits to field sites to observe enumerators

---

## 6. A/B Testing Framework Considerations

### 6.1 When to A/B Test

- **Navigation changes**: New sidebar layout, restructured IA
- **Onboarding flows**: Different first-run experiences, tutorial placements
- **Form design**: Question layout, validation timing, submission flow
- **Dashboard layout**: Widget arrangement, KPI display, filter placement
- **Microcopy**: Button labels, error messages, empty state copy
- **Call-to-action placement**: Primary button location, color, size

### 6.2 When NOT to A/B Test

- Security-related changes (always choose most secure)
- Accessibility changes (always choose most accessible)
- Legal/compliance content
- Pattern-breaking experiments that confuse users across sessions
- Changes requiring < 100 users to reach significance

### 6.3 A/B Test Process

1. **Hypothesis**: "Changing the Save button from top-right to bottom-left will reduce accidental saves"
2. **Success metric**: Error rate (accidental saves), Task completion rate
3. **Secondary metrics**: Time on task, satisfaction score
4. **Sample size**: Minimum 200 users per variant (statistical power 0.8, α=0.05)
5. **Duration**: Minimum 1 week, maximum 4 weeks (avoid novelty effect)
6. **Guardrails**: No variant should decrease SUS > 5 points
7. **Decision criteria**: Winner declared if success metric improves > 5% with p < 0.05
8. **Documentation**: All A/B tests logged with hypothesis, results, decision

### 6.4 Tooling

- Feature flag system for server-side experiments
- Analytics integration for automated metric collection
- Statistical significance calculator built into dashboard
- Automated ramp: 1% → 5% → 25% → 50% → 100% (with auto-rollback on negative guardrail breach)

---

## 7. Metric-Driven Decision Framework

When a metric triggers, the following escalation applies:

| Trigger | Action | Owner | Timeline |
|---------|--------|-------|----------|
| Task completion drops below 70% | Immediate UX review; potential hotfix | UX Architect | 48 hours |
| Error rate exceeds 10% for a task | Root cause analysis; fix in current sprint | Product Manager | 1 sprint |
| NPS drops > 10 points in quarter | Executive review; strategic response | CEO / CPA | 1 week |
| SUS drops below 65 | Full usability audit; remediation plan | UX Architect | 2 weeks |
| Sync success below 95% | Engineering incident response | Backend Lead | Same day |
| Accessibility regression | Block release; fix before deploy | UX + Engineering | Before next release |
| Single metric outside target for 2 consecutive months | Targeted investigation | UX Architect | 1 month |

---

## 8. Privacy and Ethics

- All metrics collected anonymously or with explicit consent
- Session replays: recorded only with user consent; PII masked
- Survey responses: anonymous; optional demographic data
- No behavioral data shared with third parties
- Users can opt out of product analytics (enterprise feature)
- All data collection complies with GDPR, SOC 2, and organizational data policies
- Metrics dashboard accessible only to product team with audit trail
