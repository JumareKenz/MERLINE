# Quality Measurement Framework — Phase 1 (MVP)

## 1. Defect Density Targets

| Module | Target (defects/KLOC) | Threshold | Measurement |
|--------|----------------------|-----------|-------------|
| Auth & Organization | < 2.0 | > 4.0 | Sentry + bug tracker |
| Project & Study | < 2.5 | > 5.0 | Sentry + bug tracker |
| Research Design (Indicators) | < 2.0 | > 4.0 | Sentry + bug tracker |
| Questionnaire Builder | < 3.0 | > 6.0 | Sentry + bug tracker |
| Data Collection (API) | < 3.0 | > 6.0 | Sentry + bug tracker |
| Data Collection (Mobile) | < 4.0 | > 8.0 | Crashlytics + bug tracker |
| Analytics & Dashboards | < 3.0 | > 6.0 | Sentry + bug tracker |
| Reporting | < 3.0 | > 6.0 | Sentry + bug tracker |
| Administration | < 2.0 | > 4.0 | Sentry + bug tracker |

**Overall Phase 1 target**: < 2.8 defects/KLOC weighted average

## 2. Test Coverage Targets

### By Layer

| Layer | Coverage Target | Measurement Tool |
|-------|----------------|-----------------|
| Backend Unit (Services) | >= 90% | PHPUnit coverage (pcov) |
| Backend Feature (API) | >= 85% | PHPUnit coverage |
| Backend Database (Scopes/Relations) | >= 80% | PHPUnit coverage |
| Frontend Unit (Hooks/Utils) | >= 85% | Vitest coverage (istanbul) |
| Frontend Component | >= 80% | Vitest coverage |
| Mobile Unit (Dart) | >= 80% | flutter test --coverage |
| Mobile Widget | >= 70% | flutter test --coverage |

### By Module (Backend API Coverage)

| Module | Target | Minimum |
|--------|--------|---------|
| Auth endpoints | 100% | 95% |
| Organization endpoints | 95% | 90% |
| Study endpoints | 95% | 90% |
| Questionnaire endpoints | 95% | 90% |
| Submission endpoints | 95% | 90% |
| Dashboard endpoints | 90% | 80% |
| Report endpoints | 90% | 80% |
| Sync endpoints | 95% | 90% |
| Export endpoints | 90% | 80% |

## 3. Automation Pass Rate Requirements

| Test Suite | Required Pass Rate | Blocking |
|------------|-------------------|----------|
| Backend Unit Tests | 100% | Yes |
| Backend Feature Tests | 100% | Yes |
| Frontend Unit Tests | 100% | Yes |
| Frontend Component Tests | 100% | Yes |
| Mobile Unit Tests | 100% | Yes |
| Mobile Widget Tests | 100% | Yes |
| API Contract Tests | 100% | Yes |
| E2E (Critical Journeys) | 100% | Yes |
| E2E (Full Suite) | >= 95% | Yes |
| Visual Regression | >= 98% | No (review required) |
| Accessibility (Automated) | 0 violations | Yes |
| Performance (Baseline) | No regression > 10% | Yes |
| Security (Critical/High) | 0 findings | Yes |

## 4. Performance Benchmarks

### API Response Times (P95 on Staging)

| Endpoint Group | Target | Warning | Critical |
|----------------|--------|---------|----------|
| Auth endpoints | < 500ms | > 800ms | > 1,500ms |
| CRUD (list) | < 500ms | > 1,000ms | > 2,000ms |
| CRUD (detail) | < 300ms | > 600ms | > 1,000ms |
| Submission submit | < 1,500ms | > 3,000ms | > 5,000ms |
| Dashboard load | < 3,000ms | > 5,000ms | > 10,000ms |
| Sync push | < 3,000ms | > 5,000ms | > 8,000ms |
| Sync pull | < 1,500ms | > 3,000ms | > 5,000ms |
| Report generate | < 15,000ms | > 30,000ms | > 60,000ms |

### Database Query Performance

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| P50 query latency | < 20ms | > 50ms | > 100ms |
| P95 query latency | < 100ms | > 200ms | > 500ms |
| P99 query latency | < 500ms | > 1,000ms | > 2,000ms |
| Queries per request (list) | < 5 | > 10 | > 15 |
| Queries per request (detail) | < 10 | > 15 | > 25 |
| N+1 occurrences | 0 | > 1 | > 3 |

### Frontend Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4.0s | > 4.0s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | < 1.8s | 1.8s - 3.0s | > 3.0s |
| TTI | < 3.0s | 3.0s - 5.0s | > 5.0s |

### Mobile App Performance

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Cold start | < 5s | > 8s | > 12s |
| Form load (200 questions) | < 3s | > 5s | > 8s |
| Question navigation | < 100ms | > 200ms | > 500ms |
| Sync (100 submissions, text) | < 30s | > 60s | > 120s |
| Sync (10 submissions + 20 photos) | < 3min | > 5min | > 10min |
| Memory (idle) | < 100MB | > 150MB | > 200MB |
| Memory (form + media) | < 300MB | > 400MB | > 500MB |
| Battery (8hr field day) | < 40% | > 50% | > 60% |

## 5. Accessibility Compliance Targets

| Standard | Target | Measurement |
|----------|--------|-------------|
| WCAG 2.1 Level A | 100% compliance | axe-core (automated) + manual audit |
| WCAG 2.1 Level AA | >= 95% compliance | axe-core + manual audit |
| Keyboard navigation | All flows complete | Manual QA |
| Screen reader (NVDA/VoiceOver) | All flows understandable | Manual QA |
| Color contrast | >= 4.5:1 (normal), >= 3:1 (large) | axe-core |
| Touch targets (mobile) | >= 48x48dp | Mobile audit |

### Accessibility Violation Thresholds

| Severity | Allow | Action |
|----------|-------|--------|
| Critical | 0 | Block release |
| Serious | 0 | Block release |
| Moderate | < 5 | Fix within 7 days |
| Minor | < 10 | Fix within 30 days |

## 6. Security Finding Severity Thresholds

| Severity | Max Allowed | Action |
|----------|-------------|--------|
| Critical | 0 | Block release, immediate fix |
| High | 0 | Block release, fix within 24h |
| Medium | < 5 | Fix within 7 days |
| Low | < 10 | Fix within 30 days |
| Informational | No limit | Document, address in next sprint |

### Scanning Frequency

| Scan Type | Frequency | Tool |
|-----------|-----------|------|
| SAST (static analysis) | Every PR | PHPStan, ESLint |
| Dependency scan | Daily | Dependabot, npm audit, composer audit |
| Container scan | Every build | Trivy |
| DAST (dynamic) | Weekly (staging) | OWASP ZAP |
| Penetration test | Quarterly | External vendor |

## 7. Release Stability Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Release frequency | Weekly | Bi-weekly | Monthly |
| Hotfix frequency | < 1 / month | > 2 / month | > 4 / month |
| Rollback frequency | < 5% of releases | > 10% | > 20% |
| Escaped defect rate | < 5% | > 10% | > 15% |
| Mean time to detect (MTTD) | < 15 min | > 30 min | > 1 hour |
| Mean time to resolve (MTTR) | < 2 hours | > 4 hours | > 8 hours |
| Uptime (production) | >= 99.5% | < 99% | < 98% |

## 8. Quality Scorecard (Per Release)

Each release is scored 0-100 based on weighted criteria:

| Category | Weight | Metrics |
|----------|--------|---------|
| **Test Coverage** | 20% | Line coverage % vs target for each layer |
| **Test Reliability** | 15% | Flaky test count, CI pass rate |
| **Performance** | 20% | API P95 vs baseline, Web Vitals, DB queries |
| **Security** | 20% | Open findings by severity |
| **Accessibility** | 10% | Violation count, WCAG compliance % |
| **Release Process** | 10% | Rollback? Hotfix? On-time? |
| **User Impact** | 5% | Escaped defects, user-reported issues |

### Score Interpretation

| Score | Rating | Action |
|-------|--------|--------|
| 90-100 | Excellent | Release confidently |
| 75-89 | Good | Release with documentation of minor issues |
| 60-74 | Fair | Release with conditions (known issues documented) |
| < 60 | Poor | Block release, address gaps |

### Scorecard Template

```markdown
## Quality Scorecard — v1.2.0

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Test Coverage | 92% | 20% | 18.4 |
| Test Reliability | 95% | 15% | 14.3 |
| Performance | 88% | 20% | 17.6 |
| Security | 100% | 20% | 20.0 |
| Accessibility | 85% | 10% | 8.5 |
| Release Process | 90% | 10% | 9.0 |
| User Impact | 95% | 5% | 4.8 |

**Total Score: 92.6 / 100 — Excellent**

### Blockers
- None

### Known Issues
- Dashboard slow (>5s) for studies with >50K submissions (fixed in next patch)

### Sign-off
- [ ] QA Lead
- [ ] Security Lead
- [ ] Engineering Lead
- [ ] Product Owner
```

## 9. Quality Dashboard (Grafana)

### Panels
1. **Test Pass Rate** — Last 30 days trend (all suites)
2. **Coverage Trend** — Line coverage % by module (last 30 days)
3. **Flaky Tests** — Count of flaky tests (last 7 days)
4. **API Latency P50/P95/P99** — Last 24 hours
5. **Slow Queries** — Count of queries > 100ms (last hour)
6. **Web Vitals** — LCP, FID, CLS distribution daily
7. **Error Rate** — 5xx responses (last 24 hours)
8. **Open Security Findings** — By severity (last 30 days)
9. **Accessibility Violations** — Count by severity
10. **Escaped Defects** — Defects found in production per release
11. **Release Scorecard** — Last 5 releases with scores
12. **MTTR/MTTD** — Rolling 30-day average
