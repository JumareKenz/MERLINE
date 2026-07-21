# Merline Developer Experience

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Developer Portal Structure

**URL**: `https://developer.merline.app`

### 1.1 Portal Architecture

```
developer.merline.app
│
├── 🏠 Home
│   ├── Quick Start (5 min)
│   ├── Platform Overview
│   ├── Latest Changelog
│   └── SDK Downloads
│
├── 📚 Documentation
│   ├── Getting Started
│   │   ├── Authentication
│   │   ├── Your First API Call
│   │   ├── Understanding Rate Limits
│   │   └── Error Handling
│   ├── API Reference
│   │   ├── REST API (OpenAPI / Swagger UI)
│   │   ├── GraphQL API (GraphiQL Explorer)
│   │   ├── OData Feed
│   │   └── Webhooks
│   ├── SDKs & Libraries
│   │   ├── JavaScript / TypeScript
│   │   ├── Python
│   │   ├── PHP
│   │   ├── Dart
│   │   ├── Go
│   │   └── .NET
│   ├── Connectors
│   │   ├── DHIS2
│   │   ├── KoboToolbox
│   │   ├── REDCap
│   │   ├── Power BI / Tableau
│   │   └── Custom Connector Guide
│   ├── Plugin Development
│   │   ├── Plugin Architecture
│   │   ├── Extension Points
│   │   ├── Plugin Manifest
│   │   ├── Plugin Tutorial
│   │   └── Marketplace Submission
│   └── Guides & Tutorials
│       ├── Building a Dashboard Integration
│       ├── Syncing DHIS2 Data
│       ├── Creating Custom Reports
│       ├── Webhook Best Practices
│       ├── Handling Pagination
│       ├── Exporting Large Datasets
│       └── Importing Data from CSV
│
├── 🛠️ Dashboard
│   ├── API Keys
│   │   ├── Create API Key
│   │   ├── Revoke API Key
│   │   └── Key Permissions
│   ├── Usage Analytics
│   │   ├── Request Volume (daily/weekly/monthly)
│   │   ├── Latency (p50, p95, p99)
│   │   ├── Error Rates
│   │   └── Rate Limit Hits
│   ├── Webhooks
│   │   ├── Active Subscriptions
│   │   ├── Delivery Logs
│   │   └── Dead Letters
│   └── Apps
│       ├── OAuth Applications
│       └── Connected Integrations
│
├── 🎮 Playground
│   ├── Interactive API Console
│   │   ├── Method & URL
│   │   ├── Headers (auto-injected auth)
│   │   ├── Request Body (with schema validation)
│   │   └── Response (syntax-highlighted)
│   ├── Sandbox Environment
│   │   ├── Isolated test tenant
│   │   ├── Mock study data (10 studies, 50 indicators, 1000 submissions)
│   │   ├── Reset data on demand
│   │   └── Rate limit: 300 req/min
│   └── Webhook Tester
│       ├── Generate test events
│       ├── Inspect delivery payloads
│       └── View delivery logs
│
├── 💬 Community
│   ├── Forum (Discourse)
│   ├── Discord Server
│   ├── GitHub Discussions
│   └── Stack Overflow Tag: [merline-api]
│
├── 📋 Changelog
│   ├── API Changelog
│   ├── SDK Releases
│   ├── Deprecation Notices
│   └── Migration Guides
│
├── 📊 Status
│   ├── API Uptime (99.9% SLA)
│   ├── Incident History
│   └── Subscribe to Status Updates
│
└── ❓ Help & Support
    ├── FAQ
    ├── Support Ticket
    ├── API Support SLA
    └── Contact
```

---

## 2. Interactive API Documentation

### 2.1 Swagger/OpenAPI

- OpenAPI 3.0 specification at `https://developer.merline.app/openapi.json`
- Interactive Swagger UI at `https://developer.merline.app/docs/api`
- Try-it-in-browser: authenticated requests against sandbox environment
- Code samples auto-generated for all SDK languages
- Schema validation: request body validated against OpenAPI schema in-browser

### 2.2 Documentation Quality Standards

Every endpoint must have:

1. **Description**: What the endpoint does in plain language
2. **Request example**: cURL + all SDK languages
3. **Response example**: Full JSON response
4. **Error scenarios**: 400, 401, 403, 404, 422, 429 examples
5. **Rate limit**: Specific limit for this endpoint
6. **Pagination**: How to paginate
7. **Authentication**: Which auth method is accepted

---

## 3. SDKs

### 3.1 Planned SDK Coverage

| Language | Status | Planned Release | Package Manager | Auto-generation |
|----------|--------|-----------------|-----------------|-----------------|
| **JavaScript / TypeScript** | Planned | Phase 4 (Month 12) | `npm install @merline/sdk` | OpenAPI Generator |
| **Python** | Planned | Phase 4 (Month 12) | `pip install merline-sdk` | OpenAPI Generator |
| **PHP** | Planned | Phase 4 (Month 13) | `composer require merline/sdk` | Manual (Laravel alignment) |
| **Dart** | Planned | Phase 4 (Month 14) | `dart pub add merline_sdk` | Manual (Flutter alignment) |
| **Go** | Planned | Phase 4 (Month 14) | `go get github.com/merline/sdk-go` | OpenAPI Generator |
| **.NET (C#)** | Planned | Phase 4+ | `dotnet add package Merline.Sdk` | OpenAPI Generator |
| **Java** | Planned | Phase 4+ | `gradle io.merline:sdk` | OpenAPI Generator |
| **Ruby** | TBD | TBD | `gem install merline-sdk` | OpenAPI Generator |

### 3.2 SDK Consistency

All SDKs share:
- Same method names (`client.studies.list()`, `client.submissions.get()`)
- Same parameter names (`studyId`, `page`, `limit`)
- Same response shapes (PascalCase → camelCase adaptation as needed)
- Same error types (`MerlineApiError`, `MerlineAuthError`, `MerlineRateLimitError`)
- Same pagination pattern (async iterators or cursor-based)

### 3.3 TypeScript SDK Example

```typescript
import { MerlineClient } from '@merline/sdk'

const client = new MerlineClient({
  apiKey: 'mer_pub_a1b2c3d4e5f6',
  environment: 'production', // or 'sandbox'
})

// List studies with filtering and pagination
const studies = await client.studies.list({
  status: 'active',
  limit: 20,
})

for await (const study of studies) {
  console.log(study.name, study.status)
}

// Get indicators for a study
const indicators = await client.indicators.list({
  studyId: 'uuid',
  page: 1,
  perPage: 50,
})

// Create an export
const exportJob = await client.exports.create({
  studyId: 'uuid',
  format: 'csv',
  filters: { status: ['approved'] },
})

// Wait for completion
const completedExport = await client.exports.waitForCompletion(
  exportJob.id,
  { pollIntervalMs: 2000, timeoutMs: 300000 }
)

// Download the file
await completedExport.download('./export.csv')
```

### 3.4 Python SDK Example

```python
from merline import MerlineClient

client = MerlineClient(
    api_key="mer_pub_a1b2c3d4e5f6",
    environment="sandbox"
)

# List studies
studies = client.studies.list(status="active")

for study in studies:
    print(f"{study.id}: {study.name}")

# Create export
export = client.exports.create(
    study_id="uuid",
    format="csv",
    filters={"status": ["approved"]}
)

# Wait for completion
export.wait_for_completion()
export.download("./export.csv")
```

---

## 4. Quickstart Guides & Tutorials

### 4.1 Quickstart (5 minutes)

**Step 1**: Register at `developer.merline.app`
**Step 2**: Create an API key (select `studies:read`, `indicators:read` scopes)
**Step 3**: Make your first API call:

```bash
curl https://api.merline.app/api/v1/studies \
  -H "Authorization: Bearer mer_pub_your_key_here" \
  -H "Accept: application/json"
```

**Step 4**: Explore the interactive API reference

### 4.2 Tutorial Library

| Tutorial | Duration | Difficulty | Skills |
|----------|----------|------------|--------|
| Your First API Call | 5 min | Beginner | Auth, GET request |
| Export Study Data | 10 min | Beginner | Async jobs |
| Set Up a Webhook | 15 min | Intermediate | Event subscriptions |
| Sync DHIS2 Data | 30 min | Intermediate | Connector configuration |
| Build a Custom Dashboard | 45 min | Advanced | Plugin development |
| Import Data from CSV | 15 min | Intermediate | Data import |
| Create a Report Integration | 30 min | Advanced | Webhooks + SDK |

---

## 5. Testing Sandbox Environment

### 5.1 Sandbox Features

| Feature | Description |
|---------|-------------|
| **Isolated tenant** | Dedicated organization for testing |
| **Pre-loaded data** | 10 studies, 50 indicators, 1000 sample submissions |
| **Reset on demand** | One-click data reset to initial state |
| **Higher rate limits** | 300 req/min (vs 30 in production free tier) |
| **Mock webhooks** | Test webhook delivery without real endpoints |
| **Free** | No cost, no expiration for registered developers |

### 5.2 Sandbox Limitations

| Aspect | Limitation |
|--------|------------|
| Data persistence | Resets weekly (or on demand) |
| Storage | 100 MB max |
| Users | 5 test users max |
| Webhook delivery | Loopback to developer.merline.app/webhook-tester |
| SLA | Best effort (no uptime guarantee) |

---

## 6. Reference Applications

| Application | Stack | Purpose | Repository |
|-------------|-------|---------|------------|
| **Survey Dashboard** | Next.js + Merline SDK | Example study dashboard | `github.com/merline/reference-dashboard` |
| **Data Export CLI** | Python + Merline SDK | CLI tool for automated exports | `github.com/merline/reference-export-cli` |
| **DHIS2 Sync Monitor** | Node.js + React | Monitor DHIS2 sync status | `github.com/merline/reference-dhis2-sync` |
| **Webhook Receiver** | Express.js | Example webhook endpoint | `github.com/merline/reference-webhook-receiver` |
| **Mobile Data Viewer** | Flutter + Dart SDK | Mobile data overview app | `github.com/merline/reference-mobile-viewer` |

---

## 7. Community & Support

### 7.1 Community Channels

| Channel | Purpose | URL |
|---------|---------|-----|
| **Forum** | Long-form discussions, guides, best practices | `community.merline.app` |
| **Discord** | Real-time developer chat, support | Discord invitation |
| **GitHub Discussions** | Feature requests, bug reports, SDK issues | `github.com/merline/discussions` |
| **Stack Overflow** | Q&A (tag: `merline-api`) | `stackoverflow.com/questions/tagged/merline-api` |
| **Monthly Office Hours** | Video Q&A with Merline engineering | Registration required |

### 7.2 Support Tiers

| Tier | Response Time | Channels | Included With |
|------|---------------|----------|---------------|
| **Community** | Best effort | Forum, Discord, Stack Overflow | Free |
| **Standard** | 8 business hours | Ticket, Email | Starter plan |
| **Priority** | 2 business hours | Ticket, Email, Chat | Professional plan |
| **Enterprise** | 30 minutes | Ticket, Email, Chat, Phone, Slack | Enterprise plan |

---

## 8. API Status Page & Changelog

### 8.1 Status Page

**URL**: `https://status.merline.app`

| Feature | Description |
|---------|-------------|
| **API uptime** | Current status + 90-day history |
| **Service components** | API, Webhooks, Sync, Connectors, OData |
| **Incident history** | Past incidents with resolution timeline |
| **Subscribe** | Email, Slack, webhook notifications |
| **SLA** | 99.9% uptime for public API |

### 8.2 Changelog

**URL**: `https://developer.merline.app/changelog`

| Section | Content |
|---------|---------|
| **API Changelog** | New endpoints, changes, deprecations per version |
| **SDK Releases** | New SDK versions with changes |
| **Connector Updates** | New connectors, connector version updates |
| **Deprecation Notices** | Endpoints/schemas being deprecated with migration timeline |
| **RSS/Atom Feed** | Subscribe to changes programmatically |

---

## 9. Developer Journey

```
Discovery                          Onboarding                        Build
─────────                         ──────────                        ──────
                                  │                                 │
  ┌──────────────────┐            │  ┌──────────────────┐           │  ┌──────────────────┐
  │ Find via search   │            │  │ Register at       │           │  │ Create API key    │
  │ or referral       │            │  │ developer portal  │           │  │                   │
  └──────────────────┘            │  └──────────────────┘           │  └──────────────────┘
                                  │                                 │
  ┌──────────────────┐            │  ┌──────────────────┐           │  ┌──────────────────┐
  │ Read documentation│            ├──│ Complete quickstart│──────────│  │ Make first API    │
  │ & API reference   │            │  │ (5 min)           │           │  │ call              │
  └──────────────────┘            │  └──────────────────┘           │  └──────────────────┘
                                  │                                 │
  ┌──────────────────┐            │  ┌──────────────────┐           │  ┌──────────────────┐
  │ Explore sandbox   │            │  │ Download SDK      │           │  │ Build integration │
  │ environment       │            │  │                   │           │  │                   │
  └──────────────────┘            │  └──────────────────┘           │  └──────────────────┘
                                  │                                 │
                                  │  ┌──────────────────┐           │  ┌──────────────────┐
                                  │  │ Explore tutorials │           │  │ Test in sandbox   │
                                  │  └──────────────────┘           │  │                   │
                                  │                                 │  └──────────────────┘
                                                                     │
Publish                           Grow                               │
───────                           ────                               │
                                                                     │
┌──────────────────┐            ┌──────────────────┐                 │
│ Deploy to         │            │ Monitor usage &   │                 │
│ production        │            │ performance       │                 │
└──────────────────┘            └──────────────────┘                 │
                                                                     │
┌──────────────────┐            ┌──────────────────┐                 │
│ Set up webhooks   │            │ Join community    │                 │
│ for real-time     │            │ & provide feedback │                 │
└──────────────────┘            └──────────────────┘                 │
                                                                     │
┌──────────────────┐            ┌──────────────────┐                 │
│ Submit connector  │            │ Become certified  │                 │
│ / plugin (opt)    │            │ partner (opt)     │                 │
└──────────────────┘            └──────────────────┘                 │
```

---

## 10. Developer Experience Principles

| Principle | Implementation |
|-----------|----------------|
| **Self-service** | Everything available via developer portal — no sales call required |
| **Test before deploy** | Sandbox environment with realistic mock data |
| **Consistent SDKs** | Same API across all languages |
| **Clear errors** | Every error has a code, message, and resolution hint |
| **Comprehensive docs** | Every endpoint documented with examples in all SDK languages |
| **Community-first** | Public community channels before paid support |
| **Transparent status** | Public status page with incident history |
| **Changelog-driven** | Every change documented with migration guide |
| **Fast onboarding** | First API call in under 5 minutes |

---

## 11. API Client Libraries (Community maintained)

In addition to official SDKs, community-maintained libraries are listed:

| Language | Library | Maintainer | Status |
|----------|---------|------------|--------|
| Rust | `merline-rs` | Community | Unofficial |
| Swift | `MerlineKit` | Community | Unofficial |
| Kotlin | `merline-kotlin` | Community | Unofficial |
| Elixir | `merline_ex` | Community | Unofficial |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial developer experience design |
