# Product Overview

## Definition

Merline is an AI-native MERL (Monitoring, Evaluation, Research, Learning) operating system.

## Core Capabilities

| Capability | Description |
|------------|-------------|
| Study Design | Theory of Change, Logical Frameworks, Indicator Definition, Sampling |
| Data Collection | Surveys, Questionnaires, FGDs, KIIs, Observations |
| Field Operations | Offline mobile data collection, GPS, media, sync |
| Analytics | Dashboards, KPIs, Statistical Analysis, GIS |
| AI Intelligence | Research design assistance, data quality, insight generation |
| Reporting | Technical reports, donor reports, executive briefs |
| Knowledge Management | Institutional memory, lessons learned, evidence repository |
| Integration | API, webhooks, connectors to DHIS2, KoboToolbox, etc. |

## Platform Architecture

- **Web Application** (Next.js / React) - Primary interface for researchers, managers, administrators
- **Mobile Application** (Flutter) - Field data collection, offline-first
- **Backend API** (Laravel / PostgreSQL) - Core business logic, data services
- **AI Services** - Model routing, RAG, multi-agent orchestration
- **Integration Layer** - REST APIs, webhooks, connectors
- **Analytics Layer** - Data warehouse, BI, statistical computing

## Design Tenets

1. Every feature saves time, reduces errors, improves decisions, or increases visibility
2. Every workflow has one primary purpose
3. AI assists; humans decide
4. Offline is the default, not the exception
5. Data is an organizational asset with governance
6. Security is a product feature, not an afterthought
