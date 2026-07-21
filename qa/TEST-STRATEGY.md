# Merline Test Strategy — Phase 1 (MVP)

## Testing Philosophy

1. **Confidence over coverage** — Tests exist to increase release confidence, not to hit arbitrary percentages
2. **Shift left** — Find defects at the cheapest point: requirements review > static analysis > unit test > integration > E2E
3. **Automate ruthlessly** — Any test run more than once should be automated. Manual testing reserved for exploratory and UX validation
4. **Test the smallest unit first** — Pyramid discipline prevents slow, brittle E2E suites
5. **Offline is a first-class concern** — Every feature that works online must work offline
6. **Quality gates are hard boundaries** — No release passes a failed gate

## Test Pyramid Ratios

| Layer | Ratio | Phase 1 Target Count |
|-------|-------|---------------------|
| Unit (services, helpers, models) | 60% | ~1,200 |
| Integration (API, database, queues) | 25% | ~500 |
| Component (frontend widgets) | 10% | ~200 |
| End-to-End (critical journeys) | 5% | ~20 |

**Total automated tests (Phase 1): ~1,920**

## Test Types by Layer

### Backend (Laravel/PHP)
- **Unit tests**: Services, value objects, helpers, trait behaviors
- **Feature tests**: API endpoints, FormRequest validation, policies
- **Database tests**: Migrations, seeders, relationships, scopes
- **Queue/Job tests**: Sync jobs, media processing, report generation
- **Event tests**: Event emission, listener behavior, side effects

### Frontend (Next.js/React/TypeScript)
- **Unit tests**: Utilities, hooks, pure components (Vitest)
- **Component tests**: UI component rendering, user interactions (Testing Library)
- **Integration tests**: Feature-level component compositions
- **E2E tests**: Critical user journeys (Playwright)
- **Visual regression**: Storybook + Chromatic
- **Accessibility**: axe-core automated checks

### Mobile (Flutter/Dart)
- **Unit tests**: Models, services, utilities, business logic
- **Widget tests**: Individual widget rendering and interaction
- **Integration tests**: Full-screen flows, navigation, form completion
- **Device tests**: Physical device matrix (Android 10-14, iOS 15-17)

### API (REST)
- **Contract tests**: OpenAPI spec compliance
- **Sync tests**: Push/pull endpoints, conflict resolution
- **Performance tests**: Response time, throughput, concurrent load
- **Security tests**: Auth, injection, rate limiting

## Test Environment Strategy

| Environment | Purpose | Data | Deploy Trigger | Tests Run |
|-------------|---------|------|----------------|-----------|
| **Local** | Developer inner loop | Fresh seeded | Manual | Unit + integration |
| **Dev** | CI verification | Ephemeral | PR merge to main | Full unit + integration + component |
| **Staging** | Pre-release validation | Anonymized production snapshot | Manual promotion | Full suite + E2E + performance + security |
| **Production** | Live monitoring | Real | Canary rollout | Smoke + health checks |

## Test Data Management

- **Factories**: Laravel model factories for all 48 MVP entities
- **Seeders**: Domain-specific seeders (org types, roles, question types, indicators)
- **Fixtures**: JSON fixtures for complex form definitions and sync payloads
- **Anonymization**: Production data anonymized for staging via `anon()` casts
- **Ephemeral databases**: Fresh migrate + seed per test run (no shared state)

## CI/CD Integration (GitHub Actions)

```
PR Created
  └─ Lint & Static Analysis (PHPStan, ESLint, Pint, Prettier)
  └─ Type Check (TypeScript, PHPStan level 6)
  └─ Unit + Integration Tests (PHPUnit, Vitest, Flutter test)
  └─ Build Check (Next.js build, Flutter build apk/ipa)
  └─ Test Coverage Report
  └─ Dependency Scan (Dependabot)

PR Merged to Main
  └─ Deploy to Dev
  └─ Full Test Suite (all layers)
  └─ API Contract Tests
  └─ Accessibility Scan

Manual Promotion to Staging
  └─ Deploy to Staging
  └─ Full Suite + E2E (Playwright)
  └─ Load Test (k6)
  └─ Security Scan (ZAP, Trivy)
  └─ Visual Regression

Canary Production Release
  └─ 1% → 5% → 25% → 100%
  └─ Health Checks at Each Step
  └─ Smoke Tests on Canary
  └─ Automated Rollback on Error Spike
```

## Quality Gates

### Gate 1: PR Merge
- All lint/type checks pass
- All unit + integration tests pass
- No critical dependency vulnerabilities
- Coverage does not decrease > 2%
- Code review approval

### Gate 2: Staging Promotion
- All CI gate passes
- E2E smoke tests pass (10 critical journeys)
- Performance baselines not regressed > 10%
- No high/critical security findings
- Accessibility score >= 90
- Manual QA sign-off

### Gate 3: Production Release
- Staging gate passes
- Feature flags verified (toggled off-safe)
- Rollback plan documented
- Release notes approved
- Monitoring dashboards configured
- Emergency contact list confirmed

## Test Automation Ownership

| Domain | Primary Owner | Secondary |
|--------|---------------|-----------|
| Backend unit/integration | Backend Engineering Lead | QA Lead |
| Frontend unit/component | Frontend Engineering Lead | QA Lead |
| Mobile unit/widget | Mobile Engineering Lead | QA Lead |
| API contract | Backend Lead + QA Lead | QA Lead |
| E2E (Playwright) | QA Lead | Frontend Lead |
| Performance/Load | QA Lead | DevOps Lead |
| Security | Security Architect | QA Lead |
| Accessibility | QA Lead | Frontend Lead |
| Visual Regression | QA Lead | Frontend Lead |
| Offline sync | QA Lead + Mobile Lead | Backend Lead |
