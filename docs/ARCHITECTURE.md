# Documentation Architecture

## Version: 1.0.0 | Owner: Technical Documentation Lead | Status: Draft

---

## 1. Documentation Site Structure

### 1.1 Information Architecture

```
Merline Documentation
├── 📖 Getting Started
│   ├── Overview & Vision
│   ├── Quick Start (5-minute setup)
│   └── Platform Concepts (MERL 101)
│
├── 🏗️ Platform Architecture
│   ├── System Architecture (C4 Level 1-2)
│   ├── Technology Stack (ADR-001)
│   ├── Data Architecture (ADR-004)
│   ├── Deployment Architecture (ADR-005)
│   ├── Security Architecture
│   ├── AI Architecture
│   └── Design System
│
├── 🧑‍💻 Engineering
│   ├── Getting Started
│   ├── Backend (Laravel)
│   │   ├── Setup & Configuration
│   │   ├── Service Reference
│   │   ├── Queue & Jobs
│   │   └── Testing
│   ├── Frontend (Next.js)
│   │   ├── Setup & Configuration
│   │   ├── Component Library
│   │   ├── State Management
│   │   └── Testing
│   ├── Mobile (Flutter)
│   │   ├── Setup & Configuration
│   │   ├── Clean Architecture
│   │   ├── Offline Sync
│   │   └── Testing
│   ├── AI Services
│   │   ├── Agent Architecture
│   │   ├── RAG Pipeline
│   │   ├── Prompt Registry
│   │   └── Model Strategy
│   ├── DevOps
│   │   ├── CI/CD Pipeline
│   │   ├── Kubernetes Setup
│   │   ├── Monitoring & Alerting
│   │   └── Disaster Recovery
│   ├── Coding Standards
│   ├── Development Workflow
│   └── Troubleshooting Guide
│
├── 🔌 API Reference
│   ├── Overview & Authentication
│   ├── Endpoints by Module
│   │   ├── Auth & Organizations (18)
│   │   ├── Projects & Studies (15)
│   │   ├── Indicators (8)
│   │   ├── Questionnaires (12)
│   │   ├── Data Collection (14)
│   │   ├── Analytics (10)
│   │   ├── Reporting (8)
│   │   ├── Admin (6)
│   │   ├── AI Services (4)
│   │   └── Sync (6)
│   ├── SDK Examples
│   ├── Webhooks
│   ├── Rate Limiting
│   └── Changelog
│
├── 🧑‍🔧 Administration
│   ├── Platform Overview
│   ├── Organization Setup
│   ├── User Management
│   ├── Security Configuration
│   ├── Data Management
│   ├── Compliance Configuration
│   ├── Monitoring & Alerting
│   └── Troubleshooting
│
├── 🤖 AI Guide
│   ├── Overview & Capabilities
│   ├── Research Design Assistant
│   ├── Data Quality Engine
│   ├── Report Writer
│   ├── Knowledge Assistant
│   ├── Reviewing AI Output
│   ├── Privacy & Data Handling
│   └── FAQ
│
├── 📚 Reference
│   ├── Glossary
│   ├── Decision History (ADRs)
│   ├── Domain Model
│   ├── Database Schema
│   ├── Compliance Map
│   └── Feature Catalogue
│
├── 📋 Release Notes
│   ├── v1.0 (MVP)
│   ├── Migration Guides
│   └── Deprecation Notices
│
└── 📐 Knowledge Governance
    ├── Ownership Matrix
    ├── Review Cycles
    ├── Quality Standards
    ├── Deprecation Policy
    └── Metrics & Measurement
```

### 1.2 Cross-Linking Strategy

Every document includes an **Related Documents** section at the bottom with links to:
- Parent document (one level up in hierarchy)
- Child documents (one level down)
- Related ADRs
- Related API endpoints
- Related domain entities

Cross-link format: `[Document Title](path/to/doc.md)`

---

## 2. Audience-Based Documentation Paths

### 2.1 Engineer Path

```
Engineer (New)
  └── Engineer Guide
       ├── Getting Started (prerequisites, local setup, first build)
       ├── Architecture Overview → System Architecture
       ├── Development Workflow → Git flow, PR process
       ├── Coding Standards → PSR-12, TypeScript strict
       ├── Testing Guide → Test strategy, how to run tests
       ├── API Reference → Authentication, endpoints
       └── Troubleshooting → Common issues, FAQ

Engineer (Backend)
  └── Engineer Guide → Backend Section
       ├── Laravel Setup & Configuration
       ├── Service Reference (all 12 services)
       ├── Queue & Job Architecture
       ├── Data Model → Database Logical Model
       └── API Specification → All endpoints

Engineer (Frontend)
  └── Engineer Guide → Frontend Section
       ├── Next.js Setup & Configuration
       ├── Component Library → Storybook
       ├── State Management (TanStack Query, Zustand)
       └── Testing (Vitest, Playwright)

Engineer (Mobile)
  └── Engineer Guide → Mobile Section
       ├── Flutter Setup
       ├── Clean Architecture Layers
       ├── Offline Sync Engine
       └── Device Testing Matrix

Engineer (AI)
  └── Engineer Guide → AI Section
       ├── AI Architecture → Full architecture
       ├── Agent System → Multi-agent orchestration
       ├── Prompt Registry → Prompt engineering
       ├── Model Strategy → Model tiers, routing
       └── RAG Pipeline → Chunking, embedding, search
```

### 2.2 Researcher Path

```
Researcher
  └── Platform Overview → PRODUCT.md
       ├── Study Design → MERL Domain workflows
       ├── Questionnaire Builder → Feature guide
       ├── Data Collection → Mobile & web entry
       ├── Dashboards & Analytics → KPI tracking
       ├── Report Generation → Template library
       └── AI Capabilities Guide
            ├── Research Design Assistant
            ├── Data Quality Engine
            └── Report Writer
```

### 2.3 Administrator Path

```
Administrator
  └── Admin Guide
       ├── Platform Overview
       ├── Organization Setup & Configuration
       ├── User Management & RBAC
       ├── Security Configuration (SSO, MFA, Audit)
       ├── Data Management (Backup, Retention)
       ├── Compliance Configuration
       ├── Monitoring & Alerting
       └── Troubleshooting & FAQ
```

### 2.4 Partner/Integrator Path

```
Partner / Integrator
  └── API Reference
       ├── Overview & Authentication
       ├── Endpoints by Module
       ├── SDK Examples (curl, JS, Python, PHP, Dart)
       ├── Webhook Guide
       ├── Rate Limiting
       └── Changelog & Migration
  └── Integration Guide
       ├── DHIS2 Connector
       ├── KoboToolbox Import
       └── Data Import/Export
```

### 2.5 Executive Path

```
Executive
  └── Platform Vision → VISION.md
  └── Product Overview → PRODUCT.md
  └── Roadmap → ROADMAP.md
  └── Pricing → PRICING-STRATEGY.md
  └── Go-to-Market → GO-TO-MARKET.md
  └── Decision History → Key ADR summaries
  └── AI Executive Summary → AI Architecture overview
```

---

## 3. Documentation Types

| Type | Purpose | Examples | Freshness SLA |
|------|---------|----------|---------------|
| **Architecture** | System design, decisions, trade-offs | SYSTEM-ARCHITECTURE.md, ADRs | 6 months |
| **API Reference** | Endpoint specifications, schemas, examples | API-SPECIFICATION.md | Per release |
| **User Guides** | Task-oriented workflows for end users | Feature guides, AI guide | 3 months |
| **Admin Guides** | Configuration, maintenance, operations | ADMIN-GUIDE.md | 6 months |
| **Runbooks** | Operational procedures, incident response | Deployment runbook, DB recovery | 3 months |
| **Tutorials** | Step-by-step learning paths | Quick start, first study | 6 months |
| **Reference** | Facts, terms, data models | Glossary, domain model | 6 months |
| **Release Notes** | Version changes, migration, deprecation | CHANGELOG.md | Per release |
| **Standards** | Coding conventions, governance | Coding standards, governance | 12 months |

---

## 4. Tooling Recommendation

### Primary: Docusaurus 3

**Recommendation:** Docusaurus 3 with the following configuration:

| Feature | Configuration |
|---------|--------------|
| **Search** | Algolia DocSearch (or Meilisearch for self-hosted) |
| **Versioning** | Built-in version dropdown per doc |
| **i18n** | Built-in i18n with Crowdin integration |
| **API Docs** | OpenAPI plugin (`docusaurus-plugin-openapi-docs`) |
| **MDX** | React components embedded in markdown |
| **Diagrams** | Mermaid diagram support |
| **Analytics** | Plausible / Umami (privacy-friendly) |

**Rationale:**
- **Docusaurus** is the most mature open-source documentation framework. Versioning, i18n, search, and plugin ecosystem are production-ready.
- **Mintlify** is an alternative if budget allows — better search, AI chat built-in, lower maintenance — but vendor lock-in and cost.
- **Custom** is not recommended. Documentation tooling is not a differentiator.

### Phase 2 Enhancement: AI-Powered Search

- Embed all docs into the RAG knowledge base
- Knowledge Assistant can answer questions from documentation
- Semantic search across all documentation
- "Ask Merline" button on every doc page

---

## 5. Search & Discoverability Design

### 5.1 Search Layers

| Layer | Technology | Scope |
|-------|-----------|-------|
| **Full-text search** | Algolia / Meilisearch | All published docs |
| **Semantic search** | pgvector embeddings | Knowledge base + docs |
| **AI Chat** | Knowledge Assistant (RAG) | Natural language queries |
| **Faceted search** | Tags, categories, doc type | Filtered by audience or type |
| **Cross-reference graph** | Wikilinks + backlinks | Related documents |

### 5.2 Metadata Per Document

Every document includes frontmatter:

```yaml
---
title: "Document Title"
description: "One-line summary for search results"
tags: [backend, api, authentication]
audience: [engineer, integrator]
doc_type: reference
status: published
version: 1.0.0
owner: "Backend Engineering Lead"
last_reviewed: "2026-07-18"
review_frequency: "quarterly"
related_docs:
  - ADR-001-technology-stack.md
  - API-SPECIFICATION.md
---
```

### 5.3 Search Optimization Rules

1. Every document starts with a clear **title** and **description**
2. Every heading level is meaningful (no "Introduction" without context)
3. Code blocks use language identifiers for syntax highlighting and search
4. Key terms are bolded on first use (enhances snippet quality)
5. Every acronym is expanded on first use per document

---

## 6. Versioning Strategy

### 6.1 Documentation Versions

| Version Label | Applies To | Retention |
|---------------|-----------|-----------|
| **Current** (latest) | All doc types | Always available |
| **Version X.Y** | API docs, release notes, migration guides | 2 versions back |
| **Archived** | Superseded docs | Removed from search, preserved in repo |

### 6.2 Versioning Rules

- **API documentation**: Versioned alongside API (v1, v2). URL-based: `/docs/api/v1/`
- **Architecture docs**: Versioned with major platform changes. ADR-style versioning.
- **User guides**: Always point to current version. Previous versions archived.
- **Release notes**: Permanently available. Tagged by version.

### 6.3 Version Badge

Every document shows a version badge in the header:

```
[ v1.0.0 | Last reviewed: 2026-07-18 | Owner: Engineering ]
```

---

## 7. Localization Strategy

### 7.1 Priority Languages

| Priority | Language | Phase |
|----------|----------|-------|
| P0 | English | Phase 1 |
| P1 | French, Spanish, Arabic | Phase 2 |
| P2 | Portuguese, Swahili | Phase 3 |
| P3 | Hindi, Bahasa, Bengali | Phase 4 |

### 7.2 Localization Approach

- **Tool**: Crowdin (integrates with Docusaurus natively)
- **Scope**: User guides, AI guide, admin guide, glossary
- **Excluded**: API reference (English-only), architecture docs (English-only), ADRs (English-only)
- **Review**: Native speakers per language. No machine translation without human review.
- **Freshness**: Localized docs lag English by max 1 release cycle

### 7.3 Right-to-Left Support

- Docusaurus supports RTL via `direction: rtl` in config
- Arabic language docs use RTL layout
- All components tested with RTL text

---

## 8. AI Readiness

Documentation is designed as a first-class AI asset:

| Requirement | Implementation |
|-------------|---------------|
| **Semantic chunking** | Markdown headings define chunk boundaries |
| **Metadata enrichment** | Frontmatter provides structured context |
| **Citation** | Every claim traceable to source document |
| **Version awareness** | AI retrieves version-correct docs |
| **Source traceability** | Every doc links to source code or ADR |
| **Knowledge reuse** | Cross-links enable graph traversal |

---

## 9. Quick Reference: Document Inventory

| ID | Document | Location | Audience | Type |
|----|----------|----------|----------|------|
| D-001 | Platform Vision | `VISION.md` | All | Strategic |
| D-002 | Product Overview | `PRODUCT.md` | All | Product |
| D-003 | System Architecture | `architecture/SYSTEM-ARCHITECTURE.md` | Engineers | Architecture |
| D-004 | Technology Stack (ADR-001) | `architecture/ADR-001-technology-stack.md` | Engineers | Decision |
| D-005 | System Architecture (ADR-002) | `architecture/ADR-002-system-architecture.md` | Engineers | Decision |
| D-006 | API Design (ADR-003) | `architecture/ADR-003-api-design.md` | Engineers | Decision |
| D-007 | Data Architecture (ADR-004) | `architecture/ADR-004-data-architecture.md` | Engineers | Decision |
| D-008 | Deployment Architecture (ADR-005) | `architecture/ADR-005-deployment-architecture.md` | Engineers | Decision |
| D-009 | API Specification | `backend/API-SPECIFICATION.md` | Engineers/Integrators | Reference |
| D-010 | Database Logical Model | `database/LOGICAL-MODEL.md` | Engineers | Reference |
| D-011 | Frontend Architecture | `frontend/ARCHITECTURE.md` | Frontend Engineers | Architecture |
| D-012 | Mobile Architecture | `mobile/ARCHITECTURE.md` | Mobile Engineers | Architecture |
| D-013 | AI Architecture | `ai/AI-ARCHITECTURE.md` | AI Engineers | Architecture |
| D-014 | Prompt Architecture | `prompts/ARCHITECTURE.md` | AI Engineers | Architecture |
| D-015 | Data Architecture | `data/ARCHITECTURE.md` | Data Engineers | Architecture |
| D-016 | DevOps Setup Guide | `devops/SETUP-GUIDE.md` | DevOps | Guide |
| D-017 | Test Strategy | `qa/TEST-STRATEGY.md` | QA/Engineers | Strategy |
| D-018 | Compliance Map | `security/COMPLIANCE-MAP.md` | Security/Admin | Reference |
| D-019 | Design System | `design/EXECUTIVE-SUMMARY.md` | Designers/Frontend | Reference |
| D-020 | Feature Catalogue | `product/FEATURES.md` | Product/All | Product |
| D-021 | MVP Scope | `product/MVP.md` | Product/Engineers | Product |
| D-022 | User Personas | `product/PERSONAS.md` | Product/Design | Research |
| D-023 | Go-to-Market Strategy | `strategy/GO-TO-MARKET.md` | Leadership | Strategic |
| D-024 | Pricing Strategy | `strategy/PRICING-STRATEGY.md` | Leadership | Strategic |
| D-025 | Roadmap | `ROADMAP.md` | All | Strategic |
| D-026 | Domain Model | `domain/` | Engineers | Reference |
| D-027 | Risk Register | `RISKS.md` | Leadership | Strategic |
| D-028 | Decision Index | `DECISIONS.md` | Engineers | Reference |

---

## 10. Related Documents

- [Engineer Guide](ENGINEER-GUIDE.md)
- [API Reference](API-REFERENCE.md)
- [Admin Guide](ADMIN-GUIDE.md)
- [AI Guide](AI-GUIDE.md)
- [Decision History](DECISION-HISTORY.md)
- [Glossary](GLOSSARY.md)
- [Knowledge Governance](KNOWLEDGE-GOVERNANCE.md)
