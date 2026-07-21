# Merline Minimum Viable Product (MVP) — Phase 1 Definition

## Executive Summary

The Merline MVP (Phase 1) delivers the minimum set of features required for an end-to-end research study lifecycle: creating a project, designing a survey form, deploying it to field enumerators (mobile + web), collecting data, and viewing results on a dashboard. The MVP excludes AI capabilities, advanced analytics, knowledge management, and enterprise integrations — these are deferred to Phase 2 and beyond.

The MVP is designed to be deployed with real users within 8-12 weeks of active development. It must be functional, stable, and secure enough for production use by pilot organizations.

---

## Phase 1 Scope — What We Build

### Capability Modules in Scope (6 of 12)

| Module | Scope |
|--------|-------|
| Authentication & Organization Management | Full (all P0 features) |
| Project & Study Management | Full (all P0 features) |
| Research Design | Core (Indicator Library only — ToC/LogFrame deferred) |
| Questionnaire / Survey Builder | Full (all P0 features) |
| Data Collection (Mobile + Web) | Full (all P0 features) |
| Analytics & Dashboards | Core (Built-in dashboards, filtering, export — custom dashboard builder deferred) |
| Reporting | Core (Template library + one-click generation — custom builder deferred) |
| Administration & Permissions | Core (User management + RBAC only) |
| Integrations | Core (Data export only) |
| AI Capabilities | **Excluded** |
| Knowledge Management | **Excluded** |
| Advanced Admin (billing, analytics, data retention) | **Excluded** |

### P0 Features for Initial Release

#### Authentication & Organization Management (5 features)
- Email/password registration and login
- Organization creation and multi-tenant isolation
- Team management
- Role-based access control (Admin, Manager, Researcher, Enumerator, Viewer)
- User profile with session management

#### Project & Study Management (3 features)
- Project creation and listing
- Study configuration with lifecycle (Draft → Approved → In Progress → Data Collection → Analysis → Complete → Archived)
- Study archive and restoration

#### Research Design (1 feature)
- Indicator Library with name, description, type, unit, target, baseline

#### Questionnaire / Survey Builder (9 features)
- Question type library (12+ types including text, number, date, select one/multiple, Likert, GPS, photo, audio, barcode, signature)
- Drag-and-drop form builder
- Skip logic / conditional branching
- Validation rules (required, min/max, pattern, range)
- Multi-language support
- Indicator-to-question linking
- Form preview (web + mobile)
- Repeating groups / roster
- Multimedia questions

#### Data Collection — Mobile (12 features)
- Offline-first mobile app (Flutter)
- Assignment management (assign forms to enumerators)
- GPS capture
- Media capture (photo, audio)
- Auto-sync on connectivity
- Sync status indicator
- Partial save / resume on crash
- Enumerator dashboard (assigned, completed, pending)
- Supervisor dashboard (team progress, quality flags)
- Web data entry (same forms via browser)
- Data export (CSV, Excel, JSON)

#### Analytics & Dashboards (4 features)
- Pre-built study dashboard (auto-generated from study data)
- Filtering and segmentation
- Indicator tracking with RAG status
- Data export

#### Reporting (3 features)
- Report template library (donor report, evaluation report, executive brief)
- One-click report generation with live data
- Report sections (executive summary, methodology, findings, annexes)
- Export to PDF

#### Administration (2 features)
- User management (invite, suspend, assign roles)
- Permission policies (create, design, collect, view, export, delete)

### Infrastructure Requirements

| Component | Technology | MVP Requirement |
|-----------|------------|-----------------|
| Web Application | Next.js / React | All P0 web features |
| Mobile Application | Flutter | All P0 mobile features (offline-first) |
| Backend API | Laravel / PostgreSQL | All P0 API endpoints |
| File Storage | S3-compatible (local or cloud) | Media uploads, report files, form assets |
| Authentication | Laravel Sanctum (MVP) / SAML (Phase 3) | Email/password, MFA |
| Hosting | Single-region (MVP); multi-region (Phase 4) | Production-grade single-region deployment |
| Monitoring | Basic error tracking and uptime | Sentry, basic health checks |

---

## Phase 1 Exclusions (Anti-Scope)

The following are explicitly excluded from MVP and will not be built in Phase 1:

### Deliberately Excluded
- All AI features (AI Design Assistant, AI Data Quality, AI Report Writer, AI Insight Engine, AI Translation, AI Photo Analysis, AI Voice-to-Text, AI Knowledge Assistant)
- Theory of Change and Logical Framework builders (Research Design module is limited to Indicator Library)
- Custom dashboard builder (only pre-built auto-generated dashboards)
- Custom report builder (only template-based reports)
- SAML/SSO enterprise authentication
- Advanced data quality features (AI anomaly detection, fraud detection, manual review workflow)
- Knowledge Management module (evidence repository, cross-study search, lessons learned)
- Integration connectors (DHIS2, KoboToolbox, Power BI, Tableau, Zapier)
- Public API (REST API for platform access)
- Audit logs
- Billing and subscription management
- Usage analytics
- Plugin architecture and marketplace
- White-label / multi-branding
- Multi-region deployment
- Advanced statistical analysis (cross-tabulation deferred to Phase 2)

### Rationale for Exclusions
1. **AI deferred to Phase 2**: AI features add significant complexity. The platform must first demonstrate that the core data collection workflow works reliably. AI is an accelerator, not a foundation.
2. **ToC/LogFrame deferred**: While important for research design, teams can work with indicator libraries alone for MVP. Design tools can be added once the data flow is proven.
3. **Enterprise features deferred**: SSO, audit logs, billing, and advanced admin are critical for enterprise adoption but not for proving product-market fit with early pilot organizations.
4. **Integrations deferred**: Manual data export (CSV/Excel) meets MVP needs. API and structured connectors come when integration demand is proven.
5. **Advanced analytics deferred**: Pre-built dashboards provide sufficient visibility for MVP. Custom dashboards and cross-tabulation are Phase 2 improvements.

---

## MVP Success Criteria

### Must Achieve
1. **End-to-end study lifecycle**: A researcher can create a study, design a form with skip logic and validation, deploy it to enumerators, collect data on mobile (offline-first), and view results on a dashboard — all without leaving the platform.
2. **Offline data collection**: Enumerators can download forms, collect data, capture GPS and photos, save partial progress, and sync when connected — all without data loss.
3. **Multi-tenant isolation**: Organization A cannot see Organization B's data. Role-based permissions work correctly for all roles.
4. **50 concurrent users**: Platform handles 50 simultaneous users (researchers + enumerators) without performance degradation.
5. **99% sync reliability**: Offline submissions sync successfully without data loss.
6. **< 3 second page load**: Web application pages load in under 3 seconds on standard internet connections.
7. **< 1 second form navigation**: Mobile form navigation between questions takes under 1 second.

### Success Metrics Targets

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Study completion rate | > 60% of started studies reach data collection completion | Platform analytics |
| Form creation time | < 30 minutes for a 50-question form with basic logic | Internal testing |
| Enumerator submissions/day | > 10 completed forms per enumerator per day | Field pilot data |
| Data loss rate | < 0.1% of submissions | Sync success tracking |
| User error rate | < 5% validation errors in submitted data | Data quality metrics |
| NPS (pilot users) | > 30 | Pilot user survey |
| System uptime | > 99% | Monitoring |

### Pilot Requirements
- Minimum 3 pilot organizations (at least one NGO, one government/agency, one academic/research)
- Minimum 50 total enumerators across pilots
- Minimum 10 researchers/managers across pilots
- Minimum 5,000 total submissions
- Minimum 2 weeks of sustained field operations

### Gate Criteria for Phase 2
- All MVP success metrics met for at least 2 consecutive weeks
- No critical or high-severity bugs open for more than 72 hours
- Pilot NPS >= 30
- At least 2 pilot organizations express desire to continue using the platform
- CEO and CPA approve Phase 2 readiness

---

## Capability Coverage Summary

| Module | Total Features | P0 Features | P0 in MVP | % of Module in MVP |
|--------|---------------|------------|-----------|-------------------|
| Auth & Org Management | 10 | 5 | 5 | 50% |
| Project & Study Management | 8 | 4 | 3 | 38% |
| Research Design | 7 | 1 | 1 | 14% |
| Questionnaire Builder | 13 | 10 | 9 | 69% |
| Data Collection | 14 | 10 | 12 | 86% |
| Data Quality | 9 | 1 | 0 | 0% |
| Analytics & Dashboards | 9 | 3 | 3 | 33% |
| Reporting | 10 | 3 | 3 | 30% |
| AI Capabilities | 9 | 0 | 0 | 0% |
| Knowledge Management | 5 | 0 | 0 | 0% |
| Administration | 6 | 2 | 2 | 33% |
| Integrations | 8 | 1 | 1 | 13% |
| **Total** | **108** | **40** | **39** | **36%** |

**Estimated overall capability coverage of MVP**: ~36% of total planned features, representing ~80% of the core data collection workflow value.

The MVP is intentionally lean. It delivers the highest-value capabilities first — the ability to collect data in the field and see results — while deferring everything that is not essential to that core loop.
