# Merline Permission Matrix

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

---

## 1. Role Hierarchy

### 1.1 Platform Roles

| Role | Level | Scope | Description |
|------|-------|-------|-------------|
| **SystemAdmin** | 100 | Global | Platform-wide super admin, all tenants |
| **OrgAdmin** | 90 | Organization | Full control over one organization |
| **ProjectManager** | 80 | Project/Organization | Manages projects and studies |
| **ResearchDirector** | 75 | Organization | Oversees research methodology |
| **PrincipalInvestigator** | 70 | Project | Leads specific study/project |
| **DataManager** | 65 | Project | Data quality, cleaning, analysis |
| **ResearchAssociate** | 60 | Study | Supports study execution |
| **FieldSupervisor** | 50 | Study/Team | Manages field enumerators |
| **QualityAssurance** | 45 | Organization | Reviews methodology and data quality |
| **EthicsOfficer** | 40 | Organization | Ethics compliance oversight |
| **Enumerator** | 30 | Assignment | Collects field data |
| **DonorViewer** | 20 | Study | Read-only access for donors |
| **Guest** | 10 | Study | Limited read-only access |

### 1.2 Role Inheritance

```
SystemAdmin ──── inherits ──── ALL permissions
    │
OrgAdmin ─────── inherits ──── All org-level permissions, can delegate
    │
ProjectManager ─ inherits ──── All project-level + study-level permissions
    │
PrincipalInvestigator ── inherits ──── All study-level permissions
    │
├── DataManager (study data)
├── ResearchAssociate (study execution)
│
FieldSupervisor ── inherits ──── Enumerator + team management
    │
Enumerator ────── limited to own assignments and submissions
```

---

## 2. Permission Definitions

### 2.1 Permission Structure

Permissions follow the pattern: `{module}:{entity}:{action}`

**Actions:**
- `create` — Create new entities
- `read` — View/read entities
- `update` — Modify existing entities
- `delete` — Soft-delete entities
- `approve` — Approve/submit for approval
- `export` — Export data
- `manage` — Full management (create+read+update+delete)
- `assign` — Assign resources to users
- `impersonate` — View as another user (audit-trailed)

### 2.2 Module Permissions Matrix

#### Organization Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| organization:read | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | — | — | — |
| organization:update | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| organization:delete | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| organization:settings:manage | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| organization:billing:read | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| organization:users:manage | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| organization:roles:manage | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| organization:audit:read | ✓ | ✓ | — | — | — | — | — | — | ✓ | ✓ | — | — | — |
| organization:integrations:manage | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |

#### Project Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| project:create | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| project:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| project:update | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| project:delete | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| project:archive | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |

#### Study Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| study:create | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| study:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | ✓ | ✓ |
| study:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| study:delete | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| study:approve | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | — | — | — |
| study:status:change | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | — | — | — |

¹ Enumerator can read only assigned studies.

#### Indicator Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| indicator:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| indicator:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| indicator:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| indicator:delete | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| indicator:approve | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| indicator:version:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |

#### Questionnaire Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| questionnaire:create | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| questionnaire:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | ✓ | ✓ |
| questionnaire:update | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| questionnaire:delete | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| questionnaire:publish | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — |
| questionnaire:version:create | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| questionnaire:preview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓² | — | — |

¹ Enumerator can read only assigned questionnaire versions.  
² Enumerator can preview only live/active versions.

#### Submission Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| submission:create | ✓ | — | — | — | — | — | — | — | — | — | ✓¹ | — | — |
| submission:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓² | ✓ | — | ✓³ | — | — |
| submission:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓² | — | — | ✓⁴ | — | — |
| submission:delete | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| submission:approve | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓² | ✓ | — | — | — | — |
| submission:reject | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓² | ✓ | — | — | — | — |
| submission:flag | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — |
| submission:export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| submission:pii:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |

¹ Enumerator can submit only own assignments.  
² Supervisor can read/update/approve submissions for own team only.  
³ Enumerator can read own submissions only.  
⁴ Enumerator can update own draft submissions only.

#### Field Operations Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| team:create | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| team:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓¹ | — | — |
| team:update | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| team:delete | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| assignment:create | ✓ | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — | — | — |
| assignment:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓² | — | — |
| assignment:update | ✓ | ✓ | ✓ | — | ✓ | — | — | ✓ | — | — | — | — | — |
| assignment:delete | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — | — | — |
| enumerator:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| enumerator:performance:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — |

¹ Enumerator can read own team only.  
² Enumerator can read own assignments only.

#### Analytics & Reporting Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| dashboard:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| dashboard:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | ✓ | ✓ |
| dashboard:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| dashboard:delete | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| dashboard:export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| report:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| report:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| report:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| report:delete | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| report:publish | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | — | — | — |

¹ Enumerator can read own performance dashboard only.

#### AI Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| ai:research-assistant:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| ai:questionnaire-assistant:use | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| ai:report-writer:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| ai:insight-engine:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| ai:data-quality:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — |
| ai:translation:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓² | — | — |
| ai:photo-analysis:use | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| ai:conversation:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓¹ | — | ✓ | ✓ | — | — | — |
| ai:prompts:manage | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| ai:usage:read | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |

¹ User can view own conversations only.  
² Enumerator can use translation in-field only.

#### Administration Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| admin:audit:read | ✓ | ✓ | — | — | — | — | — | — | ✓ | ✓ | — | — | — |
| admin:audit:export | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |
| admin:logs:read | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| admin:settings:read | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| admin:settings:update | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| admin:approve:access | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — |

#### Data Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| data:export:raw | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — |
| data:export:aggregate | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| data:import | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| data:delete:hard | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| data:purge | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| data:retention:read | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |
| data:retention:configure | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — |

#### Knowledge Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| knowledge:create | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| knowledge:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| knowledge:update | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| knowledge:delete | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — |
| knowledge:approve | ✓ | ✓ | — | — | — | — | — | — | ✓ | — | — | — | — |

#### Consent Module

| Permission | SA | OA | PM | RD | PI | DM | RA | FS | QA | EO | EN | DV | GT |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| consent:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — |
| consent:record | ✓ | — | — | — | — | — | — | — | — | — | ✓ | — | — |
| consent:withdraw | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| consent:audit | ✓ | ✓ | — | — | — | — | — | — | ✓ | ✓ | — | — | — |

---

## 3. Row-Level Security Model

### 3.1 Organization Isolation

```
┌───────────────────────────────────────────────────────┐
│                  PostgreSQL Cluster                     │
│                                                         │
│  Schema: public            Schema: tenant_abc           │
│  ┌─────────────────┐      ┌───────────────────────┐    │
│  │ users            │      │ projects               │    │
│  │ organizations    │      │ studies (org_id)        │    │
│  │ roles            │      │ submissions (org_id)    │    │
│  │ permissions      │      │ ... (all org-scoped)    │    │
│  └─────────────────┘      └───────────────────────┘    │
│                                                         │
│  Schema: tenant_xyz           Schema: tenant_lmn        │
│  ┌───────────────────────┐   ┌────────────────────┐     │
│  │ projects               │   │ projects            │     │
│  │ studies                │   │ studies             │     │
│  │ ...                    │   │ ...                 │     │
│  └───────────────────────┘   └────────────────────┘     │
└───────────────────────────────────────────────────────┘
```

### 3.2 Scope Hierarchy

```
Organization (tenant schema)
  └── Projects (org-scoped)
       └── Studies (project-scoped)
            ├── Questionnaires (study-scoped)
            ├── Submissions (study-scoped, enumerator-scoped)
            ├── Assignments (study-scoped, enumerator-scoped)
            ├── Indicators (study-scoped)
            └── Reports (study-scoped)
```

### 3.3 Data Scoping Rules

| Entity | Scope | Scoping Field | Enforcement |
|--------|-------|---------------|-------------|
| Organization | — | `id` | Schema isolation |
| Project | Organization | `organization_id` | Global scope + API filter |
| Study | Project → Organization | `project_id → organization_id` | Through project join |
| Questionnaire | Study | `study_id` | Direct scope |
| Submission | Study + Enumerator | `study_id + enumerator_id` | Direct + role scope |
| Response Value | Submission | `submission_id` | Through submission |
| Indicator | Project/Study | `indicator_able_id` | Polymorphic scope |
| Assignment | Study + Enumerator | `study_id + enumerator_id` | Direct scope |
| Team | Organization | `organization_id` | Global scope |
| Dashboard | Project/Study/Org | polymorphic | Through parent scope |
| Report | Project/Study | polymorphic | Through parent scope |

### 3.4 Eloquent Global Scopes

```php
// Applied to all tenant-scoped models
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = app(ContextService::class)->currentTenantId();
        $builder->where($model->getQualifiedOrganizationColumn(), $tenantId);
    }
}

// Applied to enumerator-facing models
class EnumeratorScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();
        if ($user->isEnumerator()) {
            $builder->where('enumerator_id', $user->id);
        }
    }
}

// Applied to supervisor-facing models
class SupervisorScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();
        if ($user->isSupervisor()) {
            $teamMemberIds = $user->team->members()->pluck('user_id');
            $builder->whereIn('enumerator_id', $teamMemberIds);
        }
    }
}
```

---

## 4. Field-Level Access Control

### 4.1 PII/Sensitive Field Visibility

| Field | Admin | Manager | Researcher | Supervisor | Enumerator | Donor | Guest |
|-------|:-----:|:-------:|:----------:|:----------:|:----------:|:-----:|:-----:|
| Email | Full | Full | Masked | Masked | Masked | — | — |
| Phone | Full | Full | Masked | Masked | — | — | — |
| Respondent ID | Full | Full | Full | Masked | Full¹ | — | — |
| GPS location | Full | Full | Full | Full | Full² | Aggregated | Aggregated |
| Media files | Full | Full | Full | Full | Full³ | — | — |
| Consent records | Full | — | — | — | — | — | — |
| Health data | Full | Full | Full | — | — | — | — |
| Qualitative transcripts | Full | Full | Full | — | — | — | — |
| Audit logs | Full | — | — | — | — | — | — |
| Org settings | Full | Full | — | — | — | — | — |
| Financial data | Full | Full | — | — | — | — | — |

¹ Enumerator can see respondent ID during collection only.  
² GPS visible in field, aggregated in dashboards.  
³ Enumerator can access own media captures only.

### 4.2 Field Masking Implementation

```php
class DataMaskingService
{
    public function maskForRole(array $data, string $role, string $entity): array
    {
        $maskingRules = $this->getMaskingRules($role, $entity);

        foreach ($maskingRules as $field => $rule) {
            if (isset($data[$field])) {
                $data[$field] = $this->applyMask($data[$field], $rule);
            }
        }

        return $data;
    }

    private function applyMask($value, string $rule): mixed
    {
        return match ($rule) {
            'email' => preg_replace('/(^.{2})(.*)(@.*)/', '$1***$3', $value),
            'phone' => '***-***-' . substr($value, -4),
            'gps' => [
                'lat' => round($value['lat'], 2),
                'lon' => round($value['lon'], 2),
            ],
            'partial' => substr($value, 0, 3) . str_repeat('*', max(0, strlen($value) - 6)) . substr($value, -3),
            'aggregate' => $value, // Already aggregated
            'block' => null,
            default => $value,
        };
    }
}
```

### 4.3 Access Approval Workflows

| Access Type | Requestor | Approver | Duration | Justification Required |
|-------------|-----------|----------|----------|------------------------|
| Elevated PII access | Researcher | OrgAdmin | 7 days | Yes — specific study reason |
| Data export (raw) | Any | OrgAdmin | One-time | Yes — purpose of export |
| Data deletion | Any | OrgAdmin + Security | One-time | Yes — legal/compliance reason |
| Hard delete | OrgAdmin | SystemAdmin | One-time | Yes — retention override |
| Permission override | OrgAdmin | SystemAdmin | 30 days | Yes — business justification |
| Cross-org access | OrgAdmin | Both OrgAdmins | 14 days | Yes — collaboration reason |
| Audit log access | QA/Ethics | OrgAdmin | 30 days | Yes — investigation purpose |
| API key creation | Any user | Self (PAT) / OrgAdmin (service) | As configured | No for PAT, Yes for service |

---

## 5. Just-in-Time (JIT) Access

### 5.1 JIT Access Patterns

| Pattern | Description | Implementation |
|---------|-------------|----------------|
| Time-bound approval | Temporary role elevation for specific period | Approve → auto-revoke after expiry |
| Approval-based escalation | Request elevated permission, must be approved | Request → notify approver → approve → auto-revoke |
| Break-glass emergency | Emergency access with immediate notification | Access granted with alert to Security Architect |
| Delegated admin | Temporary admin rights delegation | Time-bound, fully audited |

### 5.2 JIT Access Flow

```
1. User requests elevated access
2. Selects: permission, scope, duration, justification
3. Optional: approver selected (or auto-routed)
4. Approval notification sent
5. On approval: elevated role activated
6. All actions during elevated access specially tagged in audit
7. Auto-revocation at expiry
8. Access expiry notification to user + approver
```

### 5.3 JIT Parameters

| Parameter | Default | Range |
|-----------|---------|-------|
| Maximum elevation duration | 24 hours | 1 hour — 7 days |
| Maximum concurrent elevations | 3 | 1 — 10 |
| Cool-down period between elevations | 24 hours | 6 — 72 hours |
| Approval timeout | 2 hours | 30 min — 24 hours |
| Break-glass notification | Immediate to security team | — |
| Elevation limit per month | 5 per user | Configurable |

---

## 6. Separation of Duties

| Conflicting Roles | Rationale | Enforced By |
|-------------------|-----------|-------------|
| Enumerator cannot design questionnaires | Prevents data manipulation at source | Role assignment |
| Enumerator cannot approve own submissions | Prevents fraudulent acceptance | Submission approval policy |
| Creator cannot approve own requests | Conflict of interest | Approval workflow |
| OrgAdmin cannot audit own actions | Self-audit conflict | Immutable audit with separate viewer |
| DataManager cannot delete data without approval | Data integrity | Deletion approval workflow |
| Researcher cannot override ethics decisions | Research integrity | Workflow enforcement |

---

## 7. Permission Audit

### 7.1 Audit Events for Permissions

| Event | Logged Data | Retention |
|-------|-------------|-----------|
| Role assigned | Who, to whom, which role, scope | 7 years |
| Role revoked | Who, from whom, which role | 7 years |
| Permission changed | What changed, before/after, who | 7 years |
| Access approved | Who approved, what access, duration | 7 years |
| Access revoked (manual) | Who revoked, reason | 7 years |
| Access auto-revoked | System action, reference to approval | 7 years |
| Permission denied | Who, what action, resource, reason | 1 year |
| Elevated session start | Who, what elevation, reason | 7 years |
| Elevated session end | Who, duration, actions taken | 7 years |

### 7.2 Quarterly Access Certification

| Requirement | Detail |
|-------------|--------|
| Frequency | Quarterly |
| Scope | All users with access to sensitive data |
| Process | OrgAdmin reviews and certifies each user's current permissions |
| Non-response | Access automatically suspended after 14 days |
| Audit trail | Certification records maintained for compliance |

---

## 8. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Permission model | RBAC + attribute-based field masking | RBAC handles 90% of cases, field-level for sensitive data |
| Permission enforcement | Middleware + FormRequest + service layer | Defense in depth at HTTP, validation, and business logic layers |
| Tenant isolation | Schema-per-tenant + global scopes | Database-level isolation + application-level enforcement |
| Role inheritance | Flat roles with explicit permission sets | Avoids complex hierarchy bugs, explicit is auditable |
| JIT access | Time-bound approvals with auto-revoke | Balances security with operational flexibility |
| Field masking | Server-side transformation | Never sends unmasked data to unauthorized clients |
