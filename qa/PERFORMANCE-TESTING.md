# Performance Testing Plan — Phase 1 (MVP)

## Tooling

- **Load Testing**: k6 (Grafana)
- **API Performance**: Laravel Telescope, Laravel Debugbar (dev), custom middleware (staging/prod)
- **Database**: pg_stat_statements, slow query log, EXPLAIN ANALYZE
- **Frontend**: Lighthouse, Web Vitals (Next.js Analytics)
- **Mobile**: Flutter DevTools, Android Profiler, Xcode Instruments
- **Monitoring**: Prometheus + Grafana dashboards

## Performance Baselines (Phase 1)

### API Endpoints

| Endpoint | P50 | P95 | P99 | Throughput |
|----------|-----|-----|-----|------------|
| POST /api/v1/auth/login | 300ms | 800ms | 1,500ms | 50 req/s |
| GET /api/v1/studies | 200ms | 500ms | 1,000ms | 100 req/s |
| GET /api/v1/studies/{id} | 100ms | 300ms | 500ms | 200 req/s |
| POST /api/v1/questionnaires | 500ms | 1,500ms | 3,000ms | 30 req/s |
| POST /api/v1/questionnaires/{id}/questions | 300ms | 800ms | 2,000ms | 50 req/s |
| POST /api/v1/submissions | 500ms | 1,500ms | 3,000ms | 30 req/s |
| GET /api/v1/submissions?study_id=X | 300ms | 800ms | 2,000ms | 80 req/s |
| GET /api/v1/dashboards/study/{id} | 1,000ms | 3,000ms | 5,000ms | 20 req/s |
| POST /api/v1/sync/push | 1,000ms | 3,000ms | 5,000ms | 20 req/s |
| GET /api/v1/sync/pull | 500ms | 1,500ms | 3,000ms | 30 req/s |
| POST /api/v1/reports/generate | 5,000ms | 15,000ms | 30,000ms | 5 req/s |
| GET /api/v1/data/export | 10,000ms | 30,000ms | 60,000ms | 2 req/s |

### Database Queries

| Query Pattern | P50 | P99 | Max Rows |
|---------------|-----|-----|----------|
| Study list by project | 5ms | 50ms | 100 |
| Submission list by study | 10ms | 100ms | 10,000 |
| Indicator values by period | 20ms | 200ms | 50,000 |
| Dashboard aggregation | 100ms | 500ms | 100,000 |
| Sync delta pull | 50ms | 300ms | 5,000 |
| Audit trail by entity | 10ms | 100ms | 10,000 |

### Frontend

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| First Input Delay (FID) | < 100ms | Web Vitals |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Dashboard render (1K rows) | < 2.0s | Manual |
| Form builder drag latency | < 100ms | Manual |
| Report generation (10 pages) | < 30s | Manual |

### Mobile App

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start (first launch) | < 5s | Flutter DevTools |
| Warm start | < 2s | Flutter DevTools |
| Form navigation (between questions) | < 100ms | Frame timing |
| Form load (200 questions) | < 3s | Flutter DevTools |
| Photo capture to preview | < 1s | Manual timing |
| Sync queue (100 submissions) | < 5 min | Test script |
| Chunked upload (10MB file) | < 2 min | Test script |
| Memory (idle) | < 100MB | Android Profiler |
| Memory (form + media) | < 300MB | Android Profiler |
| Battery (8hr field day) | < 40% | Battery Historian |

## Load Testing Scenarios (k6)

### Scenario 1: Normal Day (50 concurrent users)

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 },  // Peak
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
  const session = login(BASE_URL, 'enumerator@test.org', 'password');

  // Sync push: submit 1 survey
  syncPush(BASE_URL, session.token, generateSurveyPayload());

  // View dashboard
  viewDashboard(BASE_URL, session.token, 'study-123');
}
```

### Scenario 2: Sync Spike (500 concurrent syncs)

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 500 },
    { duration: '1m', target: 0 },
  ],
};
```

### Scenario 3: Report Generation (10 concurrent requests)

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '1m', target: 0 },
  ],
};
```

### Scenario 4: Database Bulk Insert (10K submissions)

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 1 },
    { duration: '5m', target: 1 },
  ],
};
```

## Database Performance Testing

### N+1 Detection
- Every list endpoint scanned with Telescope for query count
- Any endpoint exceeding N+2 queries per result is a regression
- Automated check runs on every PR

### Slow Query Monitoring
- `pg_stat_statements` tracked with Prometheus exporter
- Alert on P99 query latency > 500ms
- Index recommendations automated with `pg_qualstats`

### Connection Pool Testing
- Test with max connections = 25 (Phase 1 limit)
- Verify PGBouncer transaction pooling does not break transactions
- Measure queue wait times at peak load

## Frontend Performance Testing

### Automated Lighthouse CI
- Run on every staging deployment
- Block regression on LCP > 500ms increase
- Block regression on accessibility score drop

### Component Rendering Benchmarks
```typescript
// data-table.benchmark.tsx
describe('DataTable rendering performance', () => {
  it('renders 100 rows under 500ms', async () => {
    const start = performance.now();
    render(<DataTable data={generateRows(100)} />);
    await screen.findByText('Row 100');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('filters 10,000 rows under 100ms', async () => {
    render(<DataTable data={generateRows(10000)} />);
    const start = performance.now();
    await userEvent.type(screen.getByPlaceholderText('Search...'), 'Target text');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

## Offline Sync Throughput Testing

### Test Scenarios
| Scenario | Volume | Target |
|----------|--------|--------|
| Sync push (text only) | 500 submissions | < 30s |
| Sync push (with photos) | 100 submissions, 2 photos each | < 5 min |
| Sync pull (full form refresh) | 50 forms, 200 questions each | < 30s |
| Chunked upload | 10MB file | < 2 min |
| Concurrent sync (same device) | 10 parallel submissions | No corruption |
| Conflict detection | 1,000 submissions checked | < 5s server-side |

## Performance Regression Detection

### Automated Checks (CI Gate)
1. Compare P50/P95/P99 against baseline on every staging deploy
2. Block promotion if any endpoint regresses > 10%
3. Block promotion if database P99 > 500ms
4. Block promotion if Lighthouse score drops > 5 points

### Monitoring Alerts (Production)
| Condition | Severity | Response |
|-----------|----------|----------|
| P99 endpoint > 3s for 5 min | Critical | Auto-rollback canary |
| P50 endpoint > 1s for 15 min | High | Engineer assigned |
| Database CPU > 80% for 10 min | High | Scale up / optimize |
| Slow query count > 50/min | Medium | Query review |
| Lighthouse score < 70 | Medium | Frontend optimization ticket |
| Mobile frame drop > 10% (Beta) | Medium | Flutter performance review |

## AI Inference Latency (Phase 2 Baseline)

While AI is not in Phase 1, establish baseline monitoring now:
- Track and log all future AI endpoint response times
- Pre-create Prometheus metrics for `ai_inference_duration_ms`
- Document expected latency targets for Phase 2:

| AI Operation | Target P50 | Target P95 | Max |
|-------------|-----------|-----------|-----|
| Text generation (short) | 2s | 5s | 15s |
| Text generation (long) | 10s | 30s | 60s |
| Embedding (short text) | 500ms | 2s | 5s |
| Image analysis | 3s | 10s | 30s |
| RAG retrieval | 1s | 3s | 5s |
