# Updated Product Roadmap

**Replaces**: `ROADMAP.md`
**Author**: Product Strategy, Innovation & Roadmap Director
**Date**: 2026-07-18

---

## 1. Roadmap Philosophy

This roadmap is organized by **strategic outcomes**, not feature lists. Every phase answers: What problem are we solving? Who benefits? How do we measure success?

**Decision framework applied to every item:**
- Does it solve an important problem?
- Will users adopt it?
- Can engineering deliver it?
- Will it strengthen the platform?
- Can AI improve it?
- Does it support long-term strategy?
- Will it matter 5 years from now?

---

## 2. Phase 1 — Core Platform (Months 1-3)

**Strategic Objective**: Validate that the core data collection workflow works end-to-end with real users in field conditions.

### Milestones

| Month | Milestone | Success Metric | Gate Decision |
|-------|-----------|----------------|---------------|
| Month 1 | Auth, Organization, User Management live | User can register, create org, invite team | Pass CI + security review |
| Month 2 | Study design + Questionnaire builder complete | Researcher can build 50q form with logic in < 30 min | Pass user testing |
| Month 3 | Mobile offline data collection + Dashboard + Report | Enumerator submits data offline; manager sees dashboard; generate report | **Phase 1 Gate: 3 pilots with 50+ users** |

### Feature Delivery Sequence

| Sprint | Features | Business Value |
|--------|----------|----------------|
| 1-2 | Auth, Org, Team, RBAC | Foundation — nothing works without this |
| 3 | Projects, Studies, Study lifecycle | Core domain entity — organizes all work |
| 4 | Indicator Library | Creates measurement framework; links to forms |
| 5-6 | Questionnaire Builder (full P0) | Primary value creation — form design |
| 7 | Assignments, Enumerator/Supervisor dashboards | Enables field operations management |
| 8-9 | Submissions, Media, Validation | Core data collection pipeline |
| 10 | Sync Engine | Offline-first capability — key differentiator |
| 11 | Dashboard, Reporting | Value extraction — see data, share insights |
| 12 | Data Export, Polish, Performance | Production readiness |

### Key Decisions & Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| AI excluded from Phase 1 | Less impressive demo, simpler build | Platform must first prove reliable data collection |
| ToC/LogFrame builders deferred | Researchers use external tools temporarily | Indicator library is sufficient for MVP data flow |
| Custom dashboard builder deferred | Pre-built dashboards only | 80% of value from pre-built; custom is Phase 2 |
| Mobile: Flutter MVP | Android only initially | iOS follows in Phase 2; Android is 85% of field devices |

### Resource Requirements

| Role | Count | Commitment |
|------|-------|------------|
| Backend Engineers (Laravel) | 2-3 | 12 weeks |
| Frontend Engineers (Next.js) | 1-2 | 12 weeks |
| Mobile Engineer (Flutter) | 2-3 | 12 weeks |
| QA Engineer | 1 | Part-time (shared) |
| DevOps Engineer | 1 | Part-time |
| Product Manager | 1 | Full-time |
| UX Designer | 1 | Full-time |

### Risk-Adjusted Timeline

| Risk | Impact | Contingency |
|------|--------|-------------|
| Sync engine complexity extends timelines | +2 weeks | Mobile engineer starts sync design in Sprint 7 |
| Multi-language form builder delays | +1 week | English-only MVP as fallback |
| Offline media upload reliability | +1 week | Defer video to Phase 2; photo only in MVP |
| **Adjusted Phase 1 timeline** | **14 weeks** (12 plan + 2 buffer) | |

---

## 3. Phase 2 — Intelligence Layer (Months 4-7)

**Strategic Objective**: Embed AI into every major workflow to create measurable efficiency gains and differentiation.

### Milestones

| Month | Milestone | Success Metric |
|-------|-----------|----------------|
| Month 4 | AI Architecture live (AI Gateway, RAG, Prompt Registry) | All AI requests routed through single gateway |
| Month 5 | AI Research Design Assistant operational | 50% of users accept AI design suggestions |
| Month 6 | AI Data Quality Engine live | Data quality score improves 30% vs Phase 1 |
| Month 7 | AI Report Writer + Insight Engine live | Report generation time reduced 70% |

### Feature Delivery

| Capability | Value | Effort | Priority |
|-----------|-------|--------|----------|
| AI Research Design Assistant | High — accelerates study design | Medium | P1 |
| AI Data Quality (anomaly, fraud detection) | High — reduces errors 30%+ | High | P1 |
| AI Report Writer (narrative + exec summary) | High — eliminates manual report writing | Medium | P1 |
| AI Insight Engine (NLQ-to-visualization) | Medium — democratizes data access | High | P2 |
| AI Questionnaire Assistant | High — accelerates form design | Medium | P1 |
| Knowledge Management (Evidence Repository) | Medium — institutional memory | Medium | P1 |
| ToC/LogFrame Builders | Medium — structured research design | Medium | P1 |
| Custom Dashboard Builder | Medium — user customization | Medium | P1 |
| iOS Mobile App | High — doubles addressable mobile users | Medium | P1 |
| REST API (public) | High — enables integration and dev community | Medium | P1 |
| Cross-tabulation | Medium — comparative analysis | Low | P2 |

### Key Decisions & Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Build AI gateway vs use vendor | Build gives control, flexibility | Multi-model strategy prevents lock-in; AI gateway enables cost optimization |
| Self-hosted Llama vs cloud-only | Self-hosted enables data-sensitive orgs | Start cloud-only; add self-hosted option for government |
| Prioritize AI Design Assist over AI Report Writer | Design Assist differentiates earlier | Report Writer is more visible but harder to get right |

### Resource Requirements (additional)

| Role | Count |
|------|-------|
| AI/ML Engineer | 2 |
| Prompt Engineer | 1 |
| Backend Engineer | +1 (existing) |
| Frontend Engineer | +1 (existing) |

### Risk-Adjusted Timeline: 18 weeks (16 plan + 2 buffer)

---

## 4. Phase 3 — Enterprise Readiness (Months 8-11)

**Strategic Objective**: Production hardening and compliance certification to unblock government and large NGO procurement.

### Milestones

| Month | Milestone | Success Metric |
|-------|-----------|----------------|
| Month 8 | SAML/SSO + MFA enforced for admin users | 100% admin MFA adoption |
| Month 9 | SOC 2 Type II audit in progress | Zero critical findings |
| Month 10 | Audit logs, data retention, compliance dashboard | Compliance dashboard operational |
| Month 11 | Load test: 1,000 concurrent users | P95 latency < 2s |

### Feature Delivery

| Capability | Value |
|-----------|-------|
| SAML/SSO (OIDC, SAML 2.0) | Unlocks government/enterprise procurement |
| Audit Logs + Audit Dashboard | Compliance requirement for SOC 2, GDPR |
| Data Retention Policies | GDPR compliance, cost optimization |
| Multi-region Deployment Infrastructure | Data sovereignty, government requirements |
| Performance Optimization + Load Testing | Production scalability confidence |
| Security Penetration Testing | SOC 2 requirement |
| CI/CD Pipeline Hardening | Deployment reliability |
| Usage Analytics Dashboard | Internal platform governance |

### Key Decisions & Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| SOC 2 Type II in Phase 3 vs earlier | Later start means longer enterprise sales delay | No point certifying prematurely; must have customer base first |
| Multi-region vs single-region longer | Higher complexity; government revenue justifies it | Key UN/government contracts require local data residency |

### Resource Requirements
- Existing team + Security Engineer (1)
- DevOps Engineer (1, full-time)
- QA + Performance Engineer (1)

### Risk-Adjusted Timeline: 14 weeks (12 plan + 2 buffer)

---

## 5. Phase 4 — Ecosystem & Scale (Months 12-18)

**Strategic Objective**: Build platform extensibility and achieve global deployment footprint.

### Milestones

| Month | Milestone |
|-------|-----------|
| Month 12 | Public API GA with SDKs (Python, JS) |
| Month 13 | Plugin architecture with first 3 third-party plugins |
| Month 14 | Integration Marketplace with 5 connectors (DHIS2, Kobo, Power BI, Tableau, Zapier) |
| Month 15 | Multi-language support (10+ languages) |
| Month 18 | 1,000 organizational deployments |

### Feature Delivery

| Capability | Value |
|-----------|-------|
| Public API + SDKs | Enables ecosystem; third-party devs build on Merline |
| Plugin Architecture | Custom extensions without core modification |
| Integration Marketplace | DHIS2, KoboToolbox, Power BI, Tableau, Zapier connectors |
| Advanced Analytics (predictive, causal inference) | Higher-value insights |
| AI Model Marketplace | Custom models, local LLM support |
| White-label / Multi-branding | Large NGO and government branding requirements |
| Multi-language (15+ languages) | Global adoption |

### Key Decisions & Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Plugin marketplace vs all internal | Quality control vs extensibility speed | Marketplace speeds innovation; revenue share model |
| Priority connectors: DHIS2 first | Health sector focus vs general | DHIS2 is highest-demand connector in primary markets |

### Resource Requirements
- Existing team + Integration Engineers (2)
- DevOps + Site Reliability (2)

---

## 6. Phase 5 — Platform of Platforms (Months 18-24+)

**Strategic Objective**: Self-improving, intelligent platform that becomes the default MERL infrastructure globally.

| Capability | Timeline |
|-----------|----------|
| Cross-organizational Learning Network | Month 18+ |
| Autonomous Research Agents | Month 20+ |
| Decision Intelligence Engine | Month 20+ |
| AI-Powered Research Publication | Month 22+ |
| Continuous Model Fine-tuning | Month 18+ |
| Automated Evidence Synthesis | Month 24+ |

---

## 7. Timeline Visualization

```
Phase 1 — Core Platform
[████████████░░░░░░░░░░░░░░░░░░░░░░░░░░]  12-14 weeks
Auth • Projects • Studies • Indicators • Forms • Mobile • Sync • Dashboard • Reports

Phase 2 — Intelligence Layer
[░░░░░░░░░░░░░░██████████████████░░░░░░]  16-18 weeks
AI Gateway • Design Assistant • Data Quality AI • Report Writer • Knowledge Mgt • iOS

Phase 3 — Enterprise Readiness
[░░░░░░░░░░░░░░░░░░░░░░░░████████████░░]  12-14 weeks
SSO • SOC 2 • Audit • Performance • Security • Multi-region

Phase 4 — Ecosystem
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████]  24+ weeks
API • Plugins • Marketplace • Advanced Analytics • Languages

Phase 5 — Intelligence at Scale
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  Ongoing
Cross-org learning • Autonomous agents • Decision intelligence
```

---

## 8. Success Metrics Per Phase

| Phase | North Star | Key Results |
|-------|-----------|-------------|
| **Phase 1** | Study completion rate > 60% | 3 pilots • 50 enumerators • 5K submissions • NPS > 30 |
| **Phase 2** | AI feature adoption > 50% | 50 orgs • 100K submissions • Report generation time -70% • NPS > 40 |
| **Phase 3** | Enterprise customers > 20% of revenue | SOC 2 certified • 100 orgs • 99.9% uptime • 1K concurrent users |
| **Phase 4** | Platform revenue > 20% from ecosystem | 1,000 orgs • 5 marketplace plugins • 10 integrations • 15 languages |
| **Phase 5** | Self-sustaining improvement loop | 5K orgs • AI acceptance rate > 80% • Cross-org learning active |

---

## 9. Decision Criteria for Phase Transitions

| Transition | Criteria | Who Decides |
|-----------|----------|-------------|
| Phase 1 → Phase 2 | ≥3 pilot orgs complete studies • NPS ≥ 30 • No critical bugs > 72h • CEO + CPA approve | CEO + CPA |
| Phase 2 → Phase 3 | ≥30 orgs active • AI adoption ≥ 50% • Revenue ≥ $200K ARR • SOC 2 readiness review passed | CEO + PSA |
| Phase 3 → Phase 4 | ≥100 orgs active • SOC 2 certified • Enterprise customer satisfaction ≥ 40 NPS • Multi-region operational | CEO + Product Director |
| Phase 4 → Phase 5 | ≥500 orgs active • Revenue ≥ $5M ARR • Ecosystem has 10+ plugins • NPS ≥ 50 | Board / CEO |

---

## 10. Resource Requirements Estimate

| Phase | Engineers | AI/ML | Design | Product | Ops | Total |
|-------|-----------|-------|--------|---------|-----|-------|
| Phase 1 | 5-7 | 0 | 1 | 1 | 1 | 8-10 |
| Phase 2 | 7-9 | 3 | 1-2 | 1-2 | 1-2 | 14-17 |
| Phase 3 | 8-10 | 3-4 | 2 | 2 | 2-3 | 17-21 |
| Phase 4 | 12-15 | 4-5 | 2-3 | 3 | 3-4 | 24-30 |
| Phase 5 | 15-20 | 6-8 | 3 | 4 | 5 | 33-40 |

---

## 11. Key Roadmap Decisions Log

| Decision | Date | Rationale |
|----------|------|-----------|
| AI deferred to Phase 2 | 2026-07-18 | Platform reliability must precede AI |
| ToC/LogFrame deferred | 2026-07-18 | Indicator library sufficient for MVP data flow |
| Mobile: Android-first | 2026-07-18 | 85% of field devices in target markets are Android |
| SOC 2 in Phase 3 (not Phase 2) | 2026-07-18 | Certify when customer demand justifies cost |
| Custom dashboard builder deferred | 2026-07-18 | Pre-built dashboards cover 80% of use cases |
| Schema-per-tenant from day one | 2026-07-18 | Hard to add later; key differentiator for government |
| Multi-model AI (not single vendor) | 2026-07-18 | Prevent lock-in, optimize cost, serve privacy needs |
| Plugin marketplace in Phase 4 | 2026-07-18 | Platform maturity needed before third-party extensions |
