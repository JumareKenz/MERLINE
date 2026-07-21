# Updated Unknowns Register

**Replaces**: `UNKNOWNS.md`
**Author**: Product Strategy, Innovation & Roadmap Director
**Date**: 2026-07-18

---

## 1. Resolved Unknowns (from Phase 0-1 Planning)

| Unknown | Resolution | Source |
|---------|-----------|--------|
| Target Market Size | $2.8-3.5B total MERL software market. $500-800M SAM in Year 1-3. | MARKET-INTELLIGENCE.md |
| Competitive Landscape | 7 direct competitors, 8 adjacent. No AI-native competitor. Merline differentiates on AI + offline-first + scientific rigor. | COMPETITIVE-ANALYSIS.md |
| Pricing Model | Hybrid per-organization + tiered (Free/Professional/Enterprise/Government). Not per-user. | PRICING-STRATEGY.md |
| Funding Source | Assumption: bootstrapped/pre-seed for Phase 1-2. Revenue from Phase 2+ sustains growth. | CEO assumption; recommend Series A at Phase 2 gate |
| Go-to-Market Channel | Direct sales + implementing partner resellers + content marketing. Primary: mid-size NGOs and consultancies. | GO-TO-MARKET.md |
| User Personas | 8 personas defined (Researcher, Enumerator, Supervisor, Program Manager, M&E Officer, Country Director, Donor, Admin). | PRODUCT/PERSONAS.md |
| MVP Definition | 36 P0 features across 7 modules. Excludes AI, ToC/LogFrame, Knowledge Management, Enterprise features. | PRODUCT/MVP.md |
| Geographic Focus | Primary: East Africa, West Africa, South Asia. Secondary: SE Asia, Latin America, MENA. | MARKET-INTELLIGENCE.md |
| Language Requirements | English (default), French, Swahili, Arabic, Portuguese, Hindi, Bengali, Bahasa — multi-language forms from MVP. | MVP.md, MARKET-INTELLIGENCE.md |
| Regulatory Environment | GDPR + SOC 2 + NDPR + HIPAA-inspired + IRB. Primary compliance: GDPR, SOC 2 Type II by Phase 3. | COMPLIANCE-MAP.md |
| Cloud Provider | AWS (primary). Multi-cloud consideration for Phase 3+ (government data residency). | SYSTEM-ARCHITECTURE.md |
| Deployment Regions | Single region (eu-west-1) for MVP. Multi-region Phase 3+. | SYSTEM-ARCHITECTURE.md |
| AI Model Strategy | Multi-model: GPT-4o, Claude 3.5, Gemini 2, Llama 3, Mistral. AI Gateway routes by cost/latency/capability. | SYSTEM-ARCHITECTURE.md |
| Development Velocity | 12 sprints for backend, 12 weeks for mobile. Team of 5-8 engineers. | MVP-IMPLEMENTATION-PLAN.md |
| Technology Stack | Laravel backend, Next.js frontend, Flutter mobile, PostgreSQL, Redis, S3, Kubernetes. | SYSTEM-ARCHITECTURE.md |
| Integration Priorities | DHIS2 (highest demand), KoboToolbox (migration), Power BI/Tableau (BI integration), Zapier (workflow automation). | COMPETITIVE-ANALYSIS.md |

---

## 2. Remaining Strategic Unknowns

| ID | Unknown | Impact | Decision Deadline | Owner |
|----|---------|--------|------------------|-------|
| S-01 | **Willingness to pay** — Will mid-size NGOs pay $500/mo for a MERL platform? | High - Pricing model validity | Month 6 (after 5+ pilots) | Product Strategy |
| S-02 | **Sales cycle reality** — How long is the actual sales cycle for each segment? | High - Cash flow planning | Month 9 (after 10+ sales) | Sales Lead |
| S-03 | **Churn rate** — What is natural monthly churn for MERL SaaS? | High - Unit economics | Month 12 (after 12+ months of data) | Product Strategy |
| S-04 | **AI willingness** — Will researchers trust AI-generated content? | Medium - AI adoption | Month 7 (Phase 2 launch) | AI Systems Architect |
| S-05 | **Partner channel effectiveness** — Can partners drive adoption? | Medium - Growth model | Month 12 (after 5+ partner deals) | Partner Lead |
| S-06 | **Donor mandate potential** — Will major donors mandate Merline for grantees? | High - Scale acceleration | Month 18 (after enterprise traction) | CEO / Product Strategy |
| S-07 | **Government procurement complexity** — How hard is it to sell to African governments? | High - Revenue mix | Month 15 (after first government pursuit) | Sales Lead |
| S-08 | **Optimal pricing elasticity** — At what price does conversion drop off? | Medium - Revenue optimization | Month 12 (A/B test pricing) | Product Strategy |
| S-09 | **Competitive response timing** — When will DevResults/ActivityInfo add AI? | Medium - Head start duration | Continuous monitoring | Product Strategy |
| S-10 | **Offline-first vs online-only demand** — How critical is offline for enterprise sales? | Medium - Engineering priority | Month 6 (pilot feedback) | Mobile Lead |

---

## 3. New Unknowns Identified During Planning

| ID | Unknown | Origin | Risk |
|----|---------|--------|------|
| N-01 | **Schema-per-tenant scalability limit** — At what tenant count does migration management become untenable? | Database Architecture | Medium — affects Phase 3+ enterprise scalability |
| N-02 | **AI cost per tenant at scale** — What is actual AI cost per active user in production? | AI Architecture | High — affects pricing AI features |
| N-03 | **Real sync performance** — How does sync engine perform at 1,000+ devices per study? | Mobile Architecture | High — affects field operations at scale |
| N-04 | **Data localization requirement depth** — How many countries require in-country hosting? | Security/Compliance | Medium — affects Phase 3 infrastructure cost |
| N-05 | **Flutter performance on low-end Android** — Does the app perform adequately on $50 Android devices? | Mobile Architecture | High — affects enumerator adoption in primary markets |
| N-06 | **Laravel throughput ceiling** — Is 1,000+ concurrent users achievable with Laravel? | Backend Architecture | Medium — affects Phase 3 scalability confidence |
| N-07 | **Cross-study search performance** — How does knowledge management search perform at 10K+ studies? | AI/Knowledge | Medium — affects Phase 2 knowledge management value |
| N-08 | **Enumerator digital literacy** — Can low-literacy enumerators use the app without extensive training? | UX Research | High — affects field adoption in primary markets |
| N-09 | **Data migration friction** — How hard is it to migrate from KoboToolbox/DevResults? | Product | High — affects switching cost and conversion |
| N-10 | **Multi-language form usability** — Do forms with 3+ languages cause performance or UX issues? | Product/Mobile | Medium — affects multi-country studies |

---

## 4. Research Plan for Each Unknown

### Resolve by Month 3 (Phase 1 Completion)

| Unknown | Research Method | Deliverable |
|---------|----------------|-------------|
| N-05 — Low-end device performance | Test Flutter app on Tecno Spark, Samsung Galaxy A series, Nokia 2 | Performance report with pass/fail per device |
| N-08 — Enumerator digital literacy | Usability testing with 5-10 enumerators in target country | Usability findings + design recommendations |

### Resolve by Month 6 (Phase 1 → Phase 2 Gate)

| Unknown | Research Method | Deliverable |
|---------|----------------|-------------|
| S-01 — Willingness to pay | Pricing discussion with 3-5 pilot orgs after 3 months of use | Pricing validation report |
| S-10 — Offline-first demand | Pilot org interviews: "Would you use Merline without offline?" | Feature priority adjustment |
| N-03 — Sync performance | Load test with 500 simulated devices; measure sync latency | Performance benchmark |
| N-08 — Enumerator feedback | Survey of all pilot enumerators: satisfaction, pain points, training needs | Enumerator satisfaction report |

### Resolve by Month 9 (Phase 2 Mid-point)

| Unknown | Research Method | Deliverable |
|---------|----------------|-------------|
| S-03 — Churn rate | Analyze first 6 months of customer data | Churn analysis + retention playbook update |
| S-04 — AI willingness | Measure AI acceptance rate across pilot orgs | AI trust report with recommendations |
| S-09 — Competitive response | Competitive monitoring: track DevResults/ActivityInfo releases | Quarterly competitive intelligence brief |
| N-02 — AI cost per tenant | Analyze production AI costs across first 10 orgs | AI cost model with per-feature breakdown |

### Resolve by Month 12 (Phase 2 → Phase 3 Gate)

| Unknown | Research Method | Deliverable |
|---------|----------------|-------------|
| S-02 — Sales cycle reality | Analyze pipeline data from 20+ sales opportunities | Sales cycle report by segment |
| S-06 — Donor mandate potential | Engage 3 major donors (USAID, FCDO, Gates) for feedback | Donor adoption assessment |
| N-01 — Schema-per-tenant limit | Performance test with 50+ tenant schemas | Scalability limit report |
| N-06 — Laravel throughput | Load test with target 1,000 concurrent users | Throughput ceiling report |
| N-07 — Cross-study search | Performance test with 1,000+ studies | Search performance report |

### Resolve by Month 18 (Phase 3 Completion)

| Unknown | Research Method | Deliverable |
|---------|----------------|-------------|
| S-05 — Partner effectiveness | Analyze partner-sourced deals vs direct | Partner channel ROI report |
| S-07 — Government procurement | Debrief from first 3 government sales pursuits | Government procurement playbook |
| S-08 — Pricing elasticity | A/B test pricing on landing page; analyze conversion | Pricing optimization report |
| N-04 — Data localization | Survey 20 target country governments on data residency requirements | Data localization requirements map |
| N-09 — Migration friction | Track time-to-value for migrating orgs vs new orgs | Migration experience improvement plan |
| N-10 — Multi-language forms | Performance and UX audit of multi-language forms | Multi-language optimization report |

---

## 5. Decision Deadlines for Key Unknowns

| Decision | Depends On | Deadline | Consequence of Missing |
|----------|-----------|----------|----------------------|
| Pricing tier finalization | S-01 (willingness to pay) | Month 6 | Enter Phase 2 with suboptimal pricing |
| AI feature inclusion in Professional tier | S-04 (AI trust), N-02 (AI cost) | Month 7 | Wrong AI pricing approach for market |
| Self-hosted Llama investment | N-02 (AI cost), government demand | Month 12 | Miss cost optimization or lose privacy-sensitive customers |
| Multi-region infrastructure investment | S-07 (gov procurement), N-04 (data localization) | Month 12 | Delay government sales by 6+ months |
| iOS mobile app investment | Market demand from pilots | Month 6 | iOS-only organizations choose competitors |
| Plugin marketplace investment | Customer demand for customization | Month 15 | Miss ecosystem window or invest too early |
| Series A fundraise decision | S-03 (churn), S-02 (sales cycle), ARR | Month 12-15 | Run out of funding for Phase 3 enterprise investment |
| Cross-org learning network investment | N-07 (search performance), customer trust | Month 20 | Network effects delayed |
| Autonomous agents investment | S-04 (AI trust), AI model capability | Month 18 | Competitor catches up in AI |

---

## 6. Unknowns Governance

| Activity | Cadence | Owner |
|----------|---------|-------|
| Unknowns register review | Monthly | Product Strategy Director |
| Research plan progress | Bi-weekly | Assigned owner per unknown |
| Decision deadline monitoring | Monthly | Product Strategy Director |
| New unknown identification | Continuous | All executives |
| Unknown resolution documentation | Per resolution | Assigned owner |
| Updated register published | Monthly | Product Strategy Director |

### Unknown Resolution Process

```
1. Identify → Log unknown with impact assessment
2. Assign → Appoint owner with research plan
3. Research → Execute research method (user study, technical spike, market analysis)
4. Analyze → Synthesize findings, produce recommendation
5. Decide → CEO / Product Council makes decision
6. Document → Update register, record decision rationale
7. Act → Update affected plans (roadmap, architecture, pricing)
```

---

## Appendix: Previously Documented Unknowns — Disposition

| Original Unknown | Resolution | Status |
|-----------------|-----------|--------|
| Target Market Size | $2.8-3.5B — documented in MARKET-INTELLIGENCE.md | **RESOLVED** |
| Competitive Landscape | 7 direct + 8 adjacent — documented in COMPETITIVE-ANALYSIS.md | **RESOLVED** |
| Pricing Model | Hybrid per-org + tiered — documented in PRICING-STRATEGY.md | **RESOLVED** |
| Funding Source | Bootstrapped/seed to Phase 2, Series A at Phase 3 gate | **RESOLVED (assumption)** |
| Go-to-Market | Direct + partner + content — documented in GO-TO-MARKET.md | **RESOLVED** |
| Cloud Provider | AWS primary, multi-cloud Phase 3 | **RESOLVED** |
| Deployment Regions | EU-West-1 Phase 1, multi-region Phase 3 | **RESOLVED** |
| Scale Requirements | < 100K submissions/mo Phase 1; < 1M Phase 2; < 10M Phase 3 | **RESOLVED (estimate)** |
| Integration Priorities | DHIS2, KoboToolbox, Power BI, Tableau, Zapier | **RESOLVED** |
| AI Model Strategy | Multi-model with AI Gateway routing | **RESOLVED** |
| Team Composition | 5-8 engineers Phase 1, growing to 15-20 by Phase 3 | **RESOLVED (plan)** |
| Development Velocity | 12 sprints backend, 12 weeks mobile | **RESOLVED (plan)** |
| Decision Authority | CEO + CPA for product, CEO for budget | **RESOLVED** |
| User Personas | 8 personas defined in PRODUCT/PERSONAS.md | **RESOLVED** |
| MVP Definition | 36 P0 features, 7 modules in PRODUCT/MVP.md | **RESOLVED** |
| Geographic Focus | Africa (East + West) primary, South Asia secondary | **RESOLVED** |
| Language Requirements | English + 7 target languages, multi-language from MVP | **RESOLVED** |
| Regulatory Environment | GDPR + SOC 2 + NDPR + HIPAA-inspired + IRB | **RESOLVED** |
