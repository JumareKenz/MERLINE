# Merline — Extended Product Vision

## Executive Summary

Merline exists to solve a fundamental problem: organizations that collect evidence to improve lives are still using tools designed in the 1990s. Survey platforms capture data but ignore research design. Reporting tools generate PDFs but not insights. Field apps work offline but don't connect to analytical workflows. AI assistants generate text but hallucinate without grounding.

Merline is not another survey tool. It is not a BI dashboard. It is not a document generator. Merline is the first operating system purpose-built for the complete MERL lifecycle — from study design through data collection, analysis, reporting, and institutional learning. Every capability is designed from first principles to serve the scientific rigor required for evidence-based decision making.

---

## What Merline Is

Merline is an AI-native, offline-first, enterprise-grade operating system for Monitoring, Evaluation, Research, and Learning (MERL). It is the single source of truth for any organization that needs to:

- Design methodologically sound research studies
- Collect high-quality primary data in any environment (online, offline, remote)
- Analyze data with statistical rigor and AI assistance
- Generate evidence-based reports for diverse stakeholders
- Preserve institutional knowledge across programs and geographies
- Learn from past evidence to design better future programs

## Why Merline Exists

The MERL technology landscape is fragmented. Organizations piece together five to eight tools to cover one study lifecycle:

| Function | Typical Tool | Gap |
|----------|-------------|-----|
| Study Design | Word, Excel, specialized ToC tools | Static documents, no connection to data collection |
| Data Collection | KoboToolbox, ODK, CommCare, SurveyCTO | Captures data but ignores research design |
| Field Management | Separate tracking spreadsheets | No visibility into enumerator performance |
| Data Quality | Manual validation in Excel | Error-prone, reactive, not proactive |
| Analysis | SPSS, Stata, R, Power BI | Requires statistical expertise, steep learning curve |
| Reporting | Word, PowerPoint, manual PDF generation | Repetitive, inconsistent, error-prone |
| Knowledge Management | Shared drives, email attachments | No search, no structure, lost when staff leave |

Merline eliminates this fragmentation by providing a single, integrated platform where research design flows directly into data collection, data quality is enforced at entry, analysis is accessible to all users, reports are generated from live data, and every study contributes to an institutional knowledge base that persists beyond individual projects.

---

## Five-Year Product Aspiration (2026–2031)

### Year 1 (2026–2027) — Foundation
- Complete Phase 1 (Core Platform): Authentication, Projects, Survey Builder, Mobile Data Collection, Basic Dashboards, Report Generation
- AI Research Design Assistant (Phase 2) operational
- 5 enterprise pilot deployments across NGO, government, and academic sectors
- 10,000 data collection forms created on the platform

### Year 2 (2027–2028) — Intelligence
- Full AI Intelligence Layer: Data Quality AI, AI Report Writer, Insight Engine
- Knowledge Management module operational
- Integration connectors for DHIS2, KoboToolbox, Power BI, Tableau
- 50 organizational deployments
- 100,000 active monthly data collectors

### Year 3 (2028–2029) — Scale
- Enterprise SSO, RBAC, audit logs, compliance certifications (SOC 2, GDPR)
- Plugin marketplace with third-party extensions
- Multi-language support (15+ languages)
- 250 organizational deployments
- 500,000 active monthly data collectors

### Year 4 (2029–2030) — Ecosystem
- Public API and SDK ecosystem
- AI model marketplace (custom models, local LLM support)
- Advanced analytics: causal inference, predictive modeling, geospatial analysis
- 1,000 organizational deployments
- 2 million active monthly data collectors

### Year 5 (2030–2031) — Default Platform
- The default choice for any organization collecting primary data for decision making
- Self-improving platform with automated model fine-tuning
- Global presence in 50+ countries
- 5,000 organizational deployments
- 10 million active monthly data collectors

---

## Product Principles

### 1. Scientific Rigor Is Non-Negotiable
Every workflow must respect and enforce accepted MERL methodologies. The platform guides users toward methodologically sound decisions and prevents common research design errors. This is not optional — it is the foundation of trust in the platform.

### 2. AI Assists; Humans Decide
AI makes recommendations, detects patterns, automates repetitive work, and surfaces anomalies. Humans approve, reject, modify, and own every decision. AI confidence scores and reasoning chains are always visible. No black boxes.

### 3. Offline Is the Default
Field environments have unreliable connectivity. Merline treats offline as the primary mode of operation, not an afterthought. All core mobile workflows must work without internet. Synchronization must be automatic, conflict-free, and auditable.

### 4. One Screen, One Purpose
Every screen in Merline serves exactly one primary purpose. Interfaces are not overloaded with secondary actions. If a screen needs to do two things, it becomes two screens. This protects users from cognitive overload and ensures clarity.

### 5. Data Flows, Documents Do Not
Research design documents (Theory of Change, LogFrame, protocols) are not static Word files. They are structured data objects that flow directly into questionnaires, indicator tracking, analysis plans, and reports. Nothing is copied and pasted. Nothing is re-entered.

### 6. Every Click Must Justify Itself
Every interaction in the platform must pull its weight. If a click, tap, or keystroke does not save time, reduce errors, or improve the user's outcome, it is eliminated. Expert workflows must be efficient. Beginner workflows must be guided.

### 7. Transparency Builds Trust
Users must understand where data comes from, how it was collected, who handled it, what transformations were applied, and how AI arrived at its recommendations. Merline provides complete provenance for every data point and every insight.

### 8. Permission by Design
Access control is not an afterthought bolted on during deployment. Every feature, every data point, every report, every API endpoint is designed with multi-tenant, role-based, attribute-based permissions from day one.

### 9. Platform Over Application
Merline is not a single application. It is a platform with a core engine, modular capabilities, API-first architecture, and the ability to extend through plugins, integrations, and custom deployments. Every feature is a module. Every module can be enabled, disabled, or replaced.

### 10. Learn Once, Use Everywhere
A user who learns how to navigate a project in one module should be able to navigate every module. A pattern used in the survey builder should be consistent with the report builder. Navigation, terminology, interactions, and visual design are consistent across the entire platform.

---

## Key Differentiators vs Existing MERL Platforms

| Capability | Existing Platforms | Merline |
|------------|-------------------|---------|
| Research Design | Manual in Word/Excel; disconnected from data collection | Built-in ToC, LogFrame, indicator design flows directly into survey builder |
| AI Integration | None or bolted-on chatbot | AI-native: design assistance, data quality, insight generation, report writing — all grounded in study context |
| Data Collection | Online-first with offline fallback | Offline-first with auto-sync; advanced device management |
| Data Quality | Post-collection validation in spreadsheets | Real-time validation, AI anomaly detection, field-level quality scores |
| Reporting | Manual copy-paste from multiple tools | One-click report generation from live data; template-driven |
| Knowledge Management | Not addressed or separate tool | Built-in evidence repository; every study contributes to organizational memory |
| Methodology Enforcement | None (any question type in any order) | Guided research design that validates methodological coherence |
| Multi-tenant Architecture | Single-tenant or basic org separation | Enterprise multi-tenant with organization hierarchies, sub-orgs, and cross-org collaboration |
| Offline Capabilities | Basic form download/submit | Full offline with conflict resolution, media management, and device-to-device sync |
| Extensibility | Limited API access | API-first, plugin architecture, integration marketplace |

---

## Success Metrics Framework

Merline's success is measured across four dimensions:

### Product-Market Fit Metrics
- **Net Promoter Score (NPS)**: Target > 50 (excellent for enterprise B2B SaaS)
- **Monthly Active Organizations**: Number of organizations actively using the platform
- **Study Completion Rate**: Percentage of studies designed that reach data collection completion
- **Time-to-Value**: Days from account creation to first data point collected (target < 1 day)
- **Feature Adoption Rate**: Percentage of activated features used weekly

### Business Metrics
- **Annual Recurring Revenue (ARR)**: Target $50M by Year 5
- **Customer Acquisition Cost (CAC)**: Target < 20% of Year 1 contract value
- **Customer Lifetime Value (LTV)**: Target > 5x CAC
- **Gross Revenue Retention**: Target > 95%
- **Net Revenue Retention**: Target > 120% (expansion revenue from existing customers)

### Quality Metrics
- **Data Quality Score**: Average quality score across all collected data (target > 95%)
- **Field Error Rate**: Percentage of collected data requiring correction (target < 2%)
- **System Uptime**: 99.9% uptime SLA (enterprise tier)
- **Sync Success Rate**: Percentage of offline-to-online syncs without conflict (target > 99%)
- **AI Recommendation Accuracy**: Percentage of AI recommendations accepted by users (target > 80%)

### Impact Metrics
- **Studies Enabled**: Total research studies designed and executed on the platform
- **Evidence Generated**: Total high-quality data points collected
- **Decision Impact**: Documented instances where Merline-powered evidence influenced program decisions
- **Capacity Built**: Number of users trained in MERL best practices through platform guidance
- **Time Saved**: Aggregate time saved vs. traditional MERL workflows (documented through user studies)
