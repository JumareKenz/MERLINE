# Release Engineering Process — Phase 1 (MVP)

## Release Cadence

| Release Type | Frequency | Scope | Risk |
|-------------|-----------|-------|------|
| **Daily** | Every merge to main | Fixes, small features, dependency updates | Low |
| **Weekly** | Every Friday | Feature completions, sprint deliverables | Medium |
| **Minor** | Every 2 weeks | Milestone releases, significant features | Medium |
| **Major** | Monthly | Phase milestones, breaking changes | High |
| **Hotfix** | As needed | Critical bug / security fix | High |

**Note**: Phase 1 uses continuous deployment to Dev. Staging and Production are manually promoted.

## Versioning Strategy (Semver)

**Format**: `MAJOR.MINOR.PATCH` (e.g., `1.3.0`)

| Component | Example | When |
|-----------|---------|------|
| MAJOR | 1.0.0 → 2.0.0 | Breaking API changes, major feature milestones |
| MINOR | 1.0.0 → 1.1.0 | New features, backward-compatible API additions |
| PATCH | 1.0.0 → 1.0.1 | Bug fixes, security patches, no API changes |

**Pre-release identifiers**: `1.0.0-alpha.1`, `1.0.0-beta.1`, `1.0.0-rc.1`

**Tagged artifacts**:
- Backend: Docker image tagged with version + git SHA
- Frontend: Docker image tagged with version + git SHA
- Mobile: APK/IPA named `merline-v{version}-{build-number}`

## Feature Flag Management

### Flag Lifecycle
1. **Dev**: Flag created, default false
2. **Staging**: Toggle for internal testing
3. **Production**: Gradual rollout (0% → 25% → 50% → 100%)
4. **Stable**: Flag default true, removal scheduled

### Flag Types

| Type | Example | Persistence |
|------|---------|-------------|
| Release flag | `new-form-builder` | Removed after full rollout |
| Experiment flag | `dashboard-layout-v2` | Removed after A/B decision |
| Permission flag | `beta-reports` | Removed after all users migrated |
| Kill switch | `disable-sync` | Permanent (emergency use) |

### Flag Configuration
```php
// config/feature-flags.php
return [
    'new-form-builder' => env('FEATURE_NEW_FORM_BUILDER', false),
    'beta-dashboards' => env('FEATURE_BETA_DASHBOARDS', false),
    'disable-submissions' => env('KILL_SUBMISSIONS', false),
];
```

### Testing Flags
- Verify feature is hidden when flag is off
- Verify feature works when flag is on
- Verify flag toggling does not break unrelated features
- Test with both flag states in CI

## Pre-Release Checklist

### T-Minus 48 Hours (Feature Freeze)
- [ ] All P0 features merged to main
- [ ] All P0 tests passing on CI (no regressions)
- [ ] Feature flags reviewed and configured
- [ ] Release branch created (`release/v{version}`)
- [ ] Changelog started
- [ ] Known issues documented

### T-Minus 24 Hours (Staging Deployment)
- [ ] Deployed to staging environment
- [ ] Full E2E test suite passed
- [ ] Performance baseline verified (no regression > 10%)
- [ ] Security scan completed (no critical/high findings)
- [ ] Accessibility scan completed (score >= 90)
- [ ] Visual regression review completed
- [ ] Manual QA smoke test (10 critical journeys)
- [ ] Database migration verified (run in staging)
- [ ] Rollback plan reviewed
- [ ] Release notes drafted

### T-Minus 4 Hours (Release Candidate)
- [ ] RC tagged (`v{version}-rc.1`)
- [ ] RC deployed to staging
- [ ] Smoke tests re-run on RC
- [ ] Product owner sign-off obtained
- [ ] Documentation updated
- [ ] Support team notified

### T-Minus 0 (Production Deployment)
- [ ] Maintenance page ready (if needed)
- [ ] Monitoring dashboards open
- [ ] On-call engineer confirmed
- [ ] Deploy to canary (1% traffic)
- [ ] Health check: error rate, latency, CPU, memory
- [ ] Wait 15 minutes on canary
- [ ] Deploy to 5% → 25% → 100%
- [ ] Post-deploy smoke tests pass
- [ ] Final sign-off

## Release Communication

### Changelog Format

```markdown
## [1.2.0] - 2026-08-15

### Added
- New feature: Skip logic validation detects circular references
- New feature: Dashboard filtering by date range
- API endpoint: GET /api/v1/studies/{id}/analytics

### Changed
- Improved: Form builder load time reduced by 40%
- Updated: Third-party library versions (see dependencies)

### Fixed
- Bug: Submission duplicate detection edge case with media-only changes
- Bug: Mobile app crash on Android 10 when capturing photo
- Security: Rate limiting now applies to sync endpoints

### Deprecated
- `GET /api/v1/studies?include_drafts` — use `?status[]=draft` instead

### Known Issues
- Report PDF generation timeouts for studies with >50K submissions
```

### Distribution Channels
- GitHub Releases (tag + release notes)
- Email to internal stakeholders
- Slack #releases channel
- Status page update (if downtime involved)

## Canary Release Process

### Step 1: Deploy to Canary (1%)
- Route 1% of traffic to new version
- Health checks: HTTP 200, latency P99 < 2x baseline, error rate < 0.1%
- Metric comparisons enabled in Grafana

### Step 2: Scale to 5%
- 5% for 15 minutes
- Verify all metrics stable
- Check application logs for new errors

### Step 3: Scale to 25%
- 25% for 15 minutes
- Verify business metrics (submission rate, sync success)

### Step 4: Scale to 100%
- Full rollout
- Final smoke tests on production

### Step 5: Announce
- Release notes published
- Status page updated
- Stakeholder notified

## Rollback Procedure

### Automated Rollback Triggers
- Error rate increases > 1% (5xx responses)
- P99 latency increases > 3x baseline
- Critical business metric drops > 20% (submissions/min)
- Uptime monitor fails

### Manual Rollback Steps
```bash
# 1. Revert to previous version
kubectl rollout undo deployment/merline-api -n production
kubectl rollout undo deployment/merline-frontend -n production

# 2. Verify rollback
kubectl rollout status deployment/merline-api -n production
kubectl rollout status deployment/merline-frontend -n production

# 3. Run post-rollback smoke tests
./scripts/smoke-test.sh production

# 4. Database rollback (if migration applied)
php artisan migrate:rollback --step=1

# 5. Notify team
./scripts/notify-rollback.sh "v1.2.0 rolled back to v1.1.0"
```

### Rollback Time Targets
| Action | Target |
|--------|--------|
| Automated rollback trigger detection | < 30s |
| Kubernetes rollback execution | < 2 min |
| Database migration revert | < 5 min |
| Full rollback complete | < 10 min |

## Emergency Hotfix Process

### Hotfix Criteria
- Critical security vulnerability (CVE with CVSS >= 9.0)
- Data loss bug (submissions failing silently)
- Production outage (platform unavailable)
- Sync failure affecting > 10% of active devices

### Hotfix Flow
```
1. Engineer identifies critical issue
2. QA Lead confirms severity
3. Branch from last stable tag: hotfix/v1.1.1
4. Fix applied, tested locally
5. Deploy to staging: hotfix tests run
6. Skip canary: deploy directly to production (5% → 100%)
7. Post-deploy monitoring: 1 hour at 100%
8. Hotfix merged back to main and release branch
9. Post-mortem scheduled
```

### Hotfix Time Targets
| Step | Target |
|------|--------|
| Fix identification | < 15 min |
| Fix implementation | < 1 hour |
| Staging verification | < 30 min |
| Production deployment | < 15 min |
| Total resolution | < 2 hours |

## Post-Release Monitoring

### First Hour (High Alert)
- [ ] Error rate monitoring (Sentry, Grafana)
- [ ] API latency monitoring (P50, P95, P99)
- [ ] Database query performance
- [ ] Queue worker throughput
- [ ] Sync success rate
- [ ] Mobile app crash rate
- [ ] Frontend Web Vitals

### First 24 Hours (Medium Alert)
- [ ] User-reported issues tracked
- [ ] Feature flag metrics (if new features rolled out)
- [ ] Business metrics (submission count, active users)
- [ ] Infrastructure metrics (CPU, memory, disk, network)

### First Week (Low Alert)
- [ ] Release retrospective scheduled
- [ ] Performance trend analysis
- [ ] Bug triage for post-release defects
- [ ] Changelog finalization

## Release Quality Gates Summary

| Gate | Who | Criteria |
|------|-----|----------|
| Feature complete | Product | All P0 features implemented and tested |
| Code review | Engineering | PR approved, no blockers |
| CI green | CI | All tests pass, no regressions |
| QA validation | QA Lead | E2E tests pass, exploratory testing done |
| Security review | Security Lead | No critical/high findings |
| Performance OK | QA/DevOps | No baseline regression > 10% |
| Accessibility OK | QA Lead | Score >= 90 |
| Rollback ready | DevOps | Rollback plan documented, tested |
| Product sign-off | Product Owner | Feature parity confirmed |
| Final approval | CEO/CPA | Release authorized |
