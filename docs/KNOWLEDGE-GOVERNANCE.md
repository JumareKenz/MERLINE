# Merline Knowledge Governance

## Version: 1.0.0 | Owner: Technical Documentation Lead | Status: Draft

---

## 1. Documentation Ownership Matrix

Every document has a single **owner** responsible for accuracy, freshness, and quality.

| Document | Location | Owner | Review Cycle |
|----------|----------|-------|-------------|
| Platform Vision | `VISION.md` | CEO | Annual |
| Product Overview | `PRODUCT.md` | CPA | Semi-annual |
| System Architecture | `architecture/SYSTEM-ARCHITECTURE.md` | PSA | Semi-annual |
| Technology Stack (ADR-001) | `architecture/ADR-001-technology-stack.md` | PSA | Annual |
| System Architecture (ADR-002) | `architecture/ADR-002-system-architecture.md` | PSA | Annual |
| API Design (ADR-003) | `architecture/ADR-003-api-design.md` | PSA | Annual |
| Data Architecture (ADR-004) | `architecture/ADR-004-data-architecture.md` | PSA | Annual |
| Deployment Architecture (ADR-005) | `architecture/ADR-005-deployment-architecture.md` | PSA | Annual |
| API Specification | `backend/API-SPECIFICATION.md` | Backend Lead | Per release |
| Database Logical Model | `database/LOGICAL-MODEL.md` | Database Architect | Semi-annual |
| Frontend Architecture | `frontend/ARCHITECTURE.md` | Frontend Lead | Semi-annual |
| Mobile Architecture | `mobile/ARCHITECTURE.md` | Mobile Lead | Semi-annual |
| AI Architecture | `ai/AI-ARCHITECTURE.md` | AI Systems Architect | Semi-annual |
| Prompt Architecture | `prompts/ARCHITECTURE.md` | Prompt Engineering Lead | Quarterly |
| Data Architecture | `data/ARCHITECTURE.md` | Data Engineering Lead | Semi-annual |
| DevOps Setup Guide | `devops/SETUP-GUIDE.md` | DevOps Lead | Quarterly |
| Test Strategy | `qa/TEST-STRATEGY.md` | QA Lead | Semi-annual |
| Compliance Map | `security/COMPLIANCE-MAP.md` | Security Architect | Semi-annual |
| Design System | `design/EXECUTIVE-SUMMARY.md` | Design Lead | Semi-annual |
| Feature Catalogue | `product/FEATURES.md` | CPA | Per release |
| MVP Scope | `product/MVP.md` | CPA | Per phase |
| User Personas | `product/PERSONAS.md` | UX Architect | Annual |
| Go-to-Market Strategy | `strategy/GO-TO-MARKET.md` | Product Strategy | Annual |
| Pricing Strategy | `strategy/PRICING-STRATEGY.md` | Product Strategy | Annual |
| Roadmap | `ROADMAP.md` | CPA | Quarterly |
| Domain Model | `domain/` | MERL Domain Expert | Semi-annual |
| Risk Register | `RISKS.md` | CEO | Quarterly |
| Decision Index | `DECISIONS.md` | PSA | Per ADR |
| **Documentation Architecture** | `docs/ARCHITECTURE.md` | **Doc Lead** | **Semi-annual** |
| **Engineer Guide** | `docs/ENGINEER-GUIDE.md` | **Doc Lead** | **Quarterly** |
| **API Reference** | `docs/API-REFERENCE.md` | **Doc Lead** | **Per release** |
| **Admin Guide** | `docs/ADMIN-GUIDE.md` | **Doc Lead** | **Semi-annual** |
| **AI Guide** | `docs/AI-GUIDE.md` | **Doc Lead** | **Quarterly** |
| **Decision History** | `docs/DECISION-HISTORY.md` | **Doc Lead** | **Per ADR** |
| **Glossary** | `docs/GLOSSARY.md` | **Doc Lead** | **Semi-annual** |
| **Knowledge Governance** | `docs/KNOWLEDGE-GOVERNANCE.md` | **Doc Lead** | **Annual** |

---

## 2. Review Cycles & Freshness SLA

### 2.1 Freshness SLA by Document Type

| Document Type | Max Age Before Review | Review Method | Owner Action on Stale |
|---------------|---------------------|---------------|----------------------|
| **Architecture** | 6 months | Full review | Update or archive |
| **API Reference** | Per release | Automated (diff) | Regenerate from spec |
| **User Guides** | 3 months | Spot check | Update workflows |
| **Admin Guides** | 6 months | Full review | Verify procedures |
| **Runbooks** | 3 months | Walkthrough test | Verify steps work |
| **Tutorials** | 6 months | End-to-end test | Update screenshots |
| **Reference** | 6 months | Spot check | Add new terms |
| **Release Notes** | Per release | Automated | Append changelog |
| **Standards** | 12 months | Full review | Update or confirm |
| **Decision Records** | Per decision | New ADR | Append or supersede |
| **Glossary** | 6 months | Add new terms | Review existing |

### 2.2 Review Process

1. **Alert**: Document owner receives notification 2 weeks before SLA expiry
2. **Review**: Owner reads document, verifies accuracy against current system
3. **Update**: Owner makes changes, bumps version, updates `last_reviewed` date
4. **Approve**: For architecture/security docs, a peer review is required
5. **Publish**: Updated document goes live

### 2.3 Automated Freshness Checks

| Check | Tool | Frequency |
|-------|------|-----------|
| Broken links | Link checker | Weekly |
| Code example validity | CI pipeline | Per commit |
| API spec consistency | OpenAPI diff | Per release |
| Screen capture accuracy | Visual regression | Per release |
| Dependency references | Deprecation scanner | Monthly |

---

## 3. Quality Standards & Review Process

### 3.1 Documentation Quality Gates

Every document must pass these gates before publishing:

| Gate | Question | How to Verify |
|------|----------|---------------|
| **Accuracy** | Does it match the actual system? | Test with running system |
| **Currency** | Is it less than the SLA max age? | Check `last_reviewed` |
| **Searchability** | Can a user find it? | Check tags, title, description |
| **Completeness** | Does it cover the scope? | Check against checklist |
| **Understandability** | Can a new user follow it? | Peer review by non-expert |
| **Actionability** | Can the user do what it says? | Follow steps manually |
| **Versioning** | Does it have version metadata? | Check frontmatter |

### 3.2 Writing Standards

| Standard | Requirement |
|----------|-------------|
| **Clarity** | No ambiguous language. Define terms on first use. |
| **Precision** | Use specific versions, numbers, and names. |
| **Active voice** | "Click the Save button" not "The Save button should be clicked" |
| **Examples** | Every concept has at least one example. |
| **Code blocks** | Every code example is executable and tested. |
| **Headings** | Meaningful hierarchy. No orphan headings. |
| **Links** | Cross-reference related documents. |
| **Acronyms** | Expand on first use per document. |
| **Diagrams** | Every architecture doc has at least one diagram. |

### 3.3 Review Checklist

For each document:
- [ ] Title and metadata (version, owner, status) present
- [ ] Table of contents (if > 100 lines)
- [ ] All links work and point to correct locations
- [ ] Code examples are syntactically correct
- [ ] Screenshots (if any) are current
- [ ] No TODO or placeholder text
- [ ] Consistent terminology with glossary
- [ ] Audience-appropriate depth
- [ ] Reviewed by at least one subject matter expert

---

## 4. Deprecation & Archival Policy

### 4.1 When to Deprecate

A document is deprecated when:
- It describes a system that no longer exists
- It has been superseded by a newer version
- The technology or process it describes is end-of-life
- Content has been merged into another document
- It is no longer relevant to any audience

### 4.2 Deprecation Process

1. **Mark**: Add `status: deprecated` to frontmatter
2. **Redirect**: Update related documents to point to replacement
3. **Replace**: Deployment or new document linked from deprecation notice
4. **Remove from search**: Deprecated docs excluded from Docusaurus search
5. **Archive**: Moved to `archive/` directory in repository
6. **Delete**: After 2 years or per legal retention requirements

### 4.3 Archival Policy

| Document State | In Search | In Navigation | In Repository | In Backup |
|---------------|-----------|---------------|---------------|-----------|
| **Active** | Yes | Yes | Current directory | Yes |
| **Deprecated** | No | No (link from replacement) | Current directory | Yes |
| **Archived** | No | No | `archive/` directory | Yes |
| **Deleted** | No | No | No | No (after retention) |

**Retention period**: All documents retained for minimum 2 years after deprecation. ADRs retained permanently.

---

## 5. Metrics & Measurement

### 5.1 Documentation KPIs

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| **Coverage** | 100% of ADRs documented | Document count vs decision count | Monthly |
| **Freshness** | > 90% within SLA | Documents within review cycle | Monthly |
| **Search success** | > 85% first-click success | Search analytics (Algolia) | Monthly |
| **Broken links** | 0 | Link checker | Weekly |
| **User satisfaction** | > 4.0 / 5.0 | Feedback widget on each page | Quarterly |
| **Time to find** | < 30 seconds | Search analytics (time to click) | Monthly |
| **New engineer onboarding** | < 2 days to first commit | Survey of new engineers | Per hire |
| **Support ticket deflection** | > 20% | Tickets with "found in docs" flag | Monthly |

### 5.2 Measurement Tools

| Metric | Tool |
|--------|------|
| Page views | Plausible / Umami |
| Search analytics | Algolia / Meilisearch |
| User satisfaction | In-page feedback widget |
| Broken links | lychee / html-proofer |
| Freshness | Custom script (check frontmatter dates) |
| Coverage | Document inventory vs feature catalog |
| Support deflection | Support ticketing system tags |

### 5.3 Reporting Cadence

| Report | Frequency | Audience |
|--------|-----------|----------|
| Documentation health dashboard | Weekly | Doc Lead |
| Freshness compliance report | Monthly | All doc owners |
| User satisfaction summary | Quarterly | Leadership |
| Annual documentation review | Annual | All stakeholders |

---

## 6. Decision Workflow

### 6.1 New ADR Process

```
1. Identify need for decision
2. Draft ADR using template (architecture/ADR-NNN-title.md)
3. Submit for review to PSA and affected domain owners
4. Decision owner accepts, rejects, or requests changes
5. Committed to repository
6. Added to DECISIONS.md index
7. Announced in engineering channel
```

### 6.2 Document Change Workflow

```
1. Author identifies change needed
2. Makes edit (PR for significant changes)
3. Updates version and last_reviewed date
4. For major changes: peer review required
5. Merge and publish
```

---

## 7. Related Documents

- [Documentation Architecture](ARCHITECTURE.md)
- [Decision History](DECISION-HISTORY.md)
- [Glossary](GLOSSARY.md)
- All `architecture/ADR-*.md` files
