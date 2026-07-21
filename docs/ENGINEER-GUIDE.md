# Merline Engineer Guide

## Version: 1.0.0 | Owner: Technical Documentation Lead | Status: Draft

---

## 1. Getting Started

### 1.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker Desktop | Latest | Local infrastructure |
| PHP | >= 8.3 | Backend runtime |
| Composer | >= 2.7 | PHP dependency manager |
| Node.js | >= 20 | Frontend build |
| pnpm | >= 9 | Node package manager |
| Flutter SDK | >= 3.22 | Mobile build |
| Git | Latest | Version control |
| IDE | Any | VS Code recommended with PHP IntelliSense, ESLint, Prettier |

### 1.2 Clone & Configure

```bash
git clone https://github.com/merline/merline.git
cd merline

# Copy environment file
cp .env.example .env
```

### 1.3 Start Infrastructure

```bash
# Start all Docker Compose services
docker compose up -d

# Verify services are healthy
docker compose ps

# Expected:
# postgres   Up (healthy)   0.0.0.0:5432->5432/tcp
# redis      Up (healthy)   0.0.0.0:6379->6379/tcp
# minio      Up (healthy)   0.0.0.0:9000-9001->9000-9001/tcp
# mailhog    Up             0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### 1.4 Setup Backend

```bash
# Install PHP dependencies
docker compose exec api composer install

# Generate application key
docker compose exec api php artisan key:generate

# Run database migrations
docker compose exec api php artisan migrate

# Seed development data
docker compose exec api php artisan db:seed

# Create storage link
docker compose exec api php artisan storage:link
```

### 1.5 Setup Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
# Access: http://localhost:3000
```

### 1.6 Setup Mobile (Optional)

```bash
cd mobile
flutter pub get
flutter run
```

### 1.7 Verify Everything

```bash
# Test API health
curl http://localhost:8080/health
# Expected: {"status":"ok","timestamp":"..."}

# Test login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@merline.local","password":"password"}'

# Test frontend
curl http://localhost:3000
```

---

## 2. Architecture Overview

### 2.1 System Context

Merline is composed of 4 primary surfaces:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Web App      │  │  Mobile App  │  │   REST API   │  │  AI Services │
│  (Next.js)    │  │  (Flutter)   │  │  (Laravel)   │  │  (Python)    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │                  │
       └──────────────────┴──────────────────┴──────────────────┘
                                │
                        ┌───────┴───────┐
                        │  PostgreSQL   │
                        │  + Redis + S3 │
                        └───────────────┘
```

### 2.2 Service Map

12 services form the backend:

| Service | Responsibility | Key Endpoints |
|---------|---------------|---------------|
| **Study** | Study lifecycle, design frameworks | `/studies`, `/toc`, `/logframes` |
| **Data Collection** | Forms, questions, responses | `/questionnaires`, `/submissions` |
| **Field Ops** | Teams, assignments, sync | `/assignments`, `/sync` |
| **Analytics** | KPIs, statistics, dashboards | `/analytics`, `/dashboards` |
| **Reporting** | Templates, generation, delivery | `/reports`, `/templates` |
| **Knowledge** | Repository, search, lessons | `/knowledge`, `/search` |
| **Identity** | Users, roles, tenants, auth | `/auth`, `/organizations` |
| **Integration** | Connectors, webhooks | `/integrations`, `/webhooks` |
| **AI Gateway** | Model routing, cache, fallback | `/ai/*` |
| **RAG** | Embeddings, vector search | `/rag/*` |
| **Prompt Registry** | Versioned prompts, A/B testing | `/prompts/*` |
| **Notification** | Email, SMS, push | `/notifications` |

### 2.3 Key Architecture Documents

| Document | Location |
|----------|----------|
| System Architecture | `architecture/SYSTEM-ARCHITECTURE.md` |
| Technology Stack | `architecture/ADR-001-technology-stack.md` |
| API Design | `architecture/ADR-003-api-design.md` |
| Data Architecture | `architecture/ADR-004-data-architecture.md` |
| Database Model | `database/LOGICAL-MODEL.md` |
| API Specification | `backend/API-SPECIFICATION.md` |
| AI Architecture | `ai/AI-ARCHITECTURE.md` |

---

## 3. Development Workflow

### 3.1 Git Flow

```
main (production-ready)
  └── develop (integration branch)
       └── feature/XXX (feature branches)
       └── fix/XXX (bug fix branches)
       └── chore/XXX (maintenance branches)
```

### 3.2 Standard Workflow

1. **Create branch**: `feature/study-lifecycle` from `develop`
2. **Develop locally**: Write code, run tests
3. **Pre-commit hooks**: Run automatically:
   - Laravel Pint (PHP CS Fixer)
   - ESLint + Prettier (TypeScript/CSS)
   - TypeScript type check
4. **Push and create PR**: Against `develop`
5. **CI runs**: Lint → Static analysis → Tests → Build
6. **Code review**: At least 1 approval required
7. **Merge**: Squash merge to `develop`
8. **Auto-deploy**: Merges to `develop` deploy to Dev environment
9. **Release**: `develop` → `main` via release branch, deploys to Staging → Production

### 3.3 Commit Message Convention

```
type(scope): description

types: feat, fix, refactor, test, docs, chore, perf, security
scope: backend, frontend, mobile, ai, devops, api, db
```

Examples:
```
feat(api): add study lifecycle transitions endpoint
fix(mobile): resolve sync conflict on duplicate submission
docs(api): document rate limiting headers
```

### 3.4 PR Review Standards

| Check | Requirement |
|-------|-------------|
| Lint/Format | All linters pass |
| Type Check | No TypeScript/PHPStan errors |
| Tests | All pass, coverage not decreased > 2% |
| Build | Frontend + backend build successfully |
| Security | No new critical/high vulnerabilities |
| Review | At least 1 approval from domain owner |
| Description | Clearly describes what and why |

---

## 4. Coding Standards

### 4.1 Backend (Laravel/PHP)

| Standard | Rule |
|----------|------|
| **PSR-12** | Follow PSR-12 coding style. Enforced by Laravel Pint. |
| **PHPStan** | Level 6 minimum. Level 9 for core services. |
| **Naming** | `camelCase` for methods/variables, `PascalCase` for classes |
| **Routes** | All routes in `routes/` directory. No routes in controllers. |
| **Validation** | Use FormRequest classes. No inline validation in controllers. |
| **Business logic** | In service classes. Controllers are thin (request → service → response). |
| **Eloquent** | Use Eloquent ORM. Raw SQL only when performance-critical and documented. |
| **Migrations** | Every migration has `up()` and `down()`. Test rollbacks. |
| **Queue Jobs** | Jobs are self-contained. Idempotent. Have `failed()` method. |
| **Events** | Events for cross-service communication. Listeners handle side effects. |
| **Testing** | PHPUnit. Feature tests for endpoints. Unit tests for services. |

### 4.2 Frontend (Next.js/TypeScript)

| Standard | Rule |
|----------|------|
| **TypeScript** | Strict mode enabled. No `any` unless explicitly justified. |
| **Components** | Server components by default. Client components only when interactivity needed. |
| **State** | TanStack Query for server state. Zustand for client state. No Context for global state. |
| **Forms** | React Hook Form + Zod schemas. Shared Zod schemas with API validation. |
| **Styling** | Tailwind CSS. CSS Modules for complex overrides. No inline styles. |
| **Imports** | Absolute imports using `@/` alias. Group: external → internal → types. |
| **File structure** | Feature-based: `features/{module}/components/`, `features/{module}/hooks/` |
| **Testing** | Vitest for unit/component. Playwright for E2E. MSW for API mocking. |

### 4.3 Mobile (Flutter/Dart)

| Standard | Rule |
|----------|------|
| **Clean Architecture** | Presentation → Application → Domain → Infrastructure layers. Strict dependency rules. |
| **State** | Riverpod for state management. No global state outside providers. |
| **Navigation** | GoRouter for declarative routing. Named routes for deeplinks. |
| **Models** | Freezed for immutable data classes. JSON serialization via `fromJson`/`toJson`. |
| **Local DB** | Drift (SQLite) for local storage. Isar for simple key-value. |
| **Sync** | All sync through SyncService. No direct API calls outside infrastructure layer. |
| **Testing** | Unit tests for domain/application. Widget tests for presentation. Integration tests for flows. |

### 4.4 AI Services (Python)

| Standard | Rule |
|----------|------|
| **Code style** | Black + isort + flake8. 88 char line length. |
| **Type hints** | Every function has type hints. Mypy strict mode. |
| **FastAPI** | All services use FastAPI. OpenAPI auto-generated. |
| **Async** | Async endpoints. Background tasks for long operations. |
| **Prompt code** | Prompts are NOT hardcoded. Read from Prompt Registry API. |
| **Evaluation** | Every model call has evaluation logging. |
| **Graceful degradation** | Fallback chains for model failures. Never crash on model error. |

---

## 5. Testing Guide

### 5.1 Running Tests

```bash
# Backend
docker compose exec api php artisan test                    # Full test suite
docker compose exec api php artisan test --filter=StudyTest  # Specific test
docker compose exec api php artisan test --coverage          # With coverage

# Frontend
cd frontend
pnpm test                    # Vitest (unit + component)
pnpm test:e2e               # Playwright (E2E)
pnpm test:e2e --ui          # Playwright with UI mode

# Mobile
cd mobile
flutter test                # Unit + widget tests
flutter test --integration  # Integration tests
```

### 5.2 Test Pyramid

| Layer | Tools | Target Ratio | Phase 1 Count |
|-------|-------|-------------|---------------|
| Unit | PHPUnit, Vitest, Flutter test | 60% | ~1,200 |
| Integration | PHPUnit, MSW, Drift | 25% | ~500 |
| Component | Testing Library, Flutter widget | 10% | ~200 |
| E2E | Playwright | 5% | ~20 |

### 5.3 Writing Tests

```php
// Backend: Feature test
class StudyTest extends TestCase
{
    public function test_researcher_can_create_study(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create();

        $response = $this->actingAs($user)
            ->postJson("/api/v1/projects/{$project->id}/studies", [
                'title' => 'Health Impact Evaluation',
                'study_type' => 'baseline',
                'start_date' => '2026-08-01',
                'end_date' => '2026-12-31',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.title', 'Health Impact Evaluation');
    }
}
```

```typescript
// Frontend: Component test
import { render, screen } from '@testing-library/react';
import { StudyCard } from './StudyCard';

describe('StudyCard', () => {
  it('displays study title and status', () => {
    render(<StudyCard title="Baseline Survey" status="active" />);
    expect(screen.getByText('Baseline Survey')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });
});
```

### 5.4 CI Integration

Tests run automatically in GitHub Actions:
- **On PR**: Unit + integration + lint + type check + build
- **On merge to develop**: Full suite + deploy to Dev
- **On staging promotion**: Full suite + E2E + performance + security
- **On production**: Smoke tests + health checks

---

## 6. Deployment Guide

### 6.1 Environment Overview

| Environment | Infrastructure | URL | Access |
|-------------|---------------|-----|--------|
| **Local** | Docker Compose | http://localhost:3000 | Developer |
| **Dev** | Shared K8s | https://dev.merline.app | Engineering |
| **Staging** | Prod-like K8s | https://staging.merline.app | Engineering + QA |
| **Production** | Multi-AZ K8s | https://app.merline.app | All users |

### 6.2 CI/CD Pipeline

```
Feature Branch → PR → CI passes → Merge to develop
  → Auto-deploy to Dev → Full tests pass → Approval gate
  → Deploy to Staging → E2E + Load tests → Release approval
  → Canary (10% → 50% → 100%) → Production
```

### 6.3 Rollback Procedure

1. **Detect**: Monitoring alert (error rate > 0.1%, p95 latency > 500ms)
2. **Revert**: GitHub Actions rollback job triggered
3. **Deploy previous**: Re-deploy last known-good image tag
4. **Verify**: Smoke tests + health checks
5. **Root cause**: Incident investigation and fix

### 6.4 Full Deployment Details

See `devops/SETUP-GUIDE.md` for:
- Terraform infrastructure setup
- Kubernetes cluster configuration
- Helm chart deployment
- External secrets management
- Database migration automation

---

## 7. Troubleshooting Common Issues

### 7.1 Docker Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `port already allocated` | Port conflict | Stop other services or change ports in `docker-compose.yml` |
| `container exited` | Config error | Check `docker compose logs` for error details |
| `permission denied` | Volume permissions | Run `docker compose down -v && docker compose up -d` |

### 7.2 Backend Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Class not found` | Autoload cache stale | Run `composer dump-autoload` |
| `No application key` | Key not generated | Run `php artisan key:generate` |
| `Migration not found` | Outdated | Run `php artisan migrate` |
| `419 expired` | CSRF token | Clear cookies and retry |
| `500 server error` | Various | Check `storage/logs/laravel.log` |

### 7.3 Frontend Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Module not found` | Dependencies missing | Run `pnpm install` |
| `TypeScript errors` | Type mismatch | Run `pnpm typecheck` for details |
| `API 401` | No auth token | Login again or check `.env.local` |
| `Build fails` | Various | Check `pnpm build` output for errors |

### 7.4 Mobile Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `App crashes on start` | Missing config | Check `lib/core/constants/api_constants.dart` |
| `Sync fails` | Network or auth | Check connectivity and token expiry |
| `Build fails` | Version mismatch | Run `flutter upgrade` and `flutter pub upgrade` |
| `GPS not working` | Permissions | Grant location permissions in device settings |

### 7.5 Database Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Connection refused` | DB not running | Check `docker compose ps` |
| `Too many connections` | Connection leak | Restart API containers: `docker compose restart api` |
| `Migration timeout` | Large dataset | Run `php artisan migrate --force` with increased timeout |

---

## 8. FAQ

### General

**Q: Where is the API documentation?**
A: Full API specification at `backend/API-SPECIFICATION.md`. Interactive docs at `/docs/api` when running locally.

**Q: How do I get development data?**
A: Run `php artisan db:seed` to populate demo data including organizations, users, projects, and studies.

**Q: What's the default admin login?**
A: After seeding: `admin@merline.local` / `password`. See `database/seeders/` for all test accounts.

**Q: How do I reset my local environment?**
A: `docker compose down -v && docker compose up -d && php artisan migrate --seed`

### Architecture

**Q: Why Laravel over Django/Rails?**
A: See ADR-001 for full rationale. Key factors: ecosystem maturity, talent pool, built-in enterprise features.

**Q: Why schema-per-tenant multi-tenancy?**
A: See ADR-004. Best isolation without database-per-tenant operational cost.

**Q: How does offline sync work?**
A: Flutter app uses local SQLite (Drift). Sync engine pushes/pulls deltas via REST API. Conflict resolution via last-writer-wins with supervisor override.

### Workflow

**Q: How do I deploy to staging?**
A: Create a release branch from develop, PR to main. After CI passes, use GitHub Actions workflow to promote to staging.

**Q: What's the code review policy?**
A: Every PR requires 1 approval from domain owner. Security-sensitive changes require Security Architect review.

**Q: How are secrets managed?**
A: Never commit secrets. Use `.env` locally. Use AWS Secrets Manager + External Secrets Operator in production.

---

## 9. Related Documents

- [Documentation Architecture](ARCHITECTURE.md)
- [API Reference](API-REFERENCE.md)
- [System Architecture](../architecture/SYSTEM-ARCHITECTURE.md)
- [DevOps Setup Guide](../devops/SETUP-GUIDE.md)
- [Test Strategy](../qa/TEST-STRATEGY.md)
- [Decision History](DECISION-HISTORY.md)
- [Glossary](GLOSSARY.md)
