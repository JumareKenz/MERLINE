# Merline Customer Support Model

## Support Philosophy

Support is not a cost center — it is a retention engine. Every support interaction is an opportunity to build trust, deepen adoption, and prevent churn. We measure support by outcomes (customer confidence restored, problem solved permanently) not speed alone.

**Core principles:**
- Solve root causes, not just symptoms
- Educate while resolving (every ticket is a training opportunity)
- Proactive over reactive (identify and fix before customers notice)
- AI-assisted efficiency (chatbot handles Level 1, humans handle complexity)
- Closed-loop feedback (support insights drive product improvement)

---

## Support Tier Structure

### Tier 0: Self-Service

**Channel:** Knowledge Base, Community Forum, AI Chatbot, In-App Help

**Scope:**
- How-to questions ("How do I create a study?")
- Troubleshooting common issues ("Why can't I sync?")
- Feature documentation
- Known issues and workarounds
- Best practices and guides

**Response Time:** Instant (self-service)
**Availability:** 24/7

**Content:**
- 100+ knowledge base articles (organized by role and workflow)
- 30+ video tutorials
- FAQ section (updated monthly from common tickets)
- Community forum (user-to-user support)
- AI chatbot (Phase 2) trained on knowledge base + common issues

**Success Metric:** Self-service deflection rate > 40% (tickets prevented by self-service)

### Tier 1: Chat Support (In-App)

**Channel:** In-app chat widget, Community forum

**Scope:**
- Account and login issues (password reset, account locked)
- Navigation questions
- Basic feature guidance
- Simple troubleshooting
- Bug reporting
- Billing inquiries

**Response Time:**
- Professional: < 4 hours (business hours)
- Enterprise: < 1 hour (business hours)
- Government: < 30 min (extended hours)

**Availability:**
- Professional: Mon-Fri, 8am-6pm local time
- Enterprise: Mon-Fri, 8am-8pm local time
- Government: 24/5

**Staffing:** Support specialists (trained on all core features)

**First Contact Resolution Target:** > 60%

### Tier 2: Email & Phone Support

**Channel:** Email (support@merline.io), Phone (regional numbers)

**Scope:**
- Complex feature questions
- Data quality investigations
- Integration troubleshooting
- Mobile app issues (crash, sync failure, data loss)
- Configuration and setup help
- Escalated Tier 1 issues

**Response Time:**
- Professional: < 8 hours (email)
- Enterprise: < 2 hours (email), < 1 hour (phone)
- Government: < 1 hour (email), < 30 min (phone)

**Availability:**
- Professional: Mon-Fri, 8am-6pm local time
- Enterprise: 24/7 (on-call rotation)
- Government: 24/7 (dedicated)

**Staffing:** Senior support engineers (platform-wide expertise)

**First Contact Resolution Target:** > 75%

### Tier 3: Engineering Support

**Channel:** Escalation from Tier 2, direct engineer assignment

**Scope:**
- Bug reproduction and fix
- Performance issues
- Data migration
- API and integration issues
- Security incidents
- Complex investigations (sync conflicts, data integrity)

**Response Time:**
- Critical: < 2 hours
- High: < 4 hours
- Medium: < 24 hours
- Low: < 72 hours

**Availability:** Engineering on-call rotation (24/7 for critical)

**Staffing:** Backend engineers, mobile engineers, AI engineers

### Tier 4: Executive Escalation

**Channel:** Direct to CEO / Customer Success Director

**Scope:**
- Business-critical issues affecting operations
- Customer relationship risk
- Multi-tenant or platform-wide incidents
- Contract or SLA breach
- Executive-level customer complaints

**Response Time:** < 4 hours

**Availability:** Always (on-call executive)

**Staffing:** CEO, CPA, Customer Success Director

---

## Service Level Agreements (SLAs)

### Response Time by Priority

| Priority | Definition | Examples | Professional | Enterprise | Government |
|----------|-----------|---------|-------------|------------|------------|
| **Critical (P1)** | Platform unavailable, data loss, sync failure affecting > 10% of users | System down, submission data lost, sync not working | N/A | < 1 hour | < 30 min |
| **High (P2)** | Major feature unavailable, performance degradation, limited data loss | Dashboard not loading, report generation fails, GPS not capturing | < 4 hours | < 2 hours | < 1 hour |
| **Medium (P3)** | Non-critical feature issue, minor bug, configuration help | Skip logic not working correctly, form preview issue, user import error | < 8 hours | < 4 hours | < 2 hours |
| **Low (P4)** | Cosmetic issue, feature request, documentation question | Typo in UI, suggestion for improvement, how-to question | < 24 hours | < 8 hours | < 4 hours |

### Resolution Time

| Priority | Professional | Enterprise | Government |
|----------|-------------|------------|------------|
| P1 (Critical) | N/A | < 4 hours | < 2 hours |
| P2 (High) | < 24 hours | < 8 hours | < 4 hours |
| P3 (Medium) | < 72 hours | < 48 hours | < 24 hours |
| P4 (Low) | < 1 week | < 72 hours | < 48 hours |

### Uptime SLA

| Tier | Uptime Guarantee | Service Credit |
|------|-----------------|----------------|
| Free | 99.0% (best effort) | None |
| Professional | 99.5% | 5% credit per 0.5% below |
| Enterprise | 99.9% | 10% credit per 0.1% below |
| Government | 99.95% | Custom (negotiated) |

---

## Support Channels

### Channel Overview

| Channel | Tier Access | Availability | Best For |
|---------|------------|--------------|----------|
| Knowledge Base | All tiers (self-service) | 24/7 | How-to, troubleshooting FAQ |
| Community Forum | All tiers | 24/7 (moderated) | Peer support, best practices, feature requests |
| AI Chatbot (Phase 2) | All tiers | 24/7 | Quick answers, guided troubleshooting |
| In-App Chat | Professional+ | Business hours | Real-time support for urgent questions |
| Email | All tiers | Per SLA | Detailed questions, attachments, complex issues |
| Phone | Enterprise+ | Per SLA | Critical issues, complex troubleshooting, escalation |
| Dedicated Slack/Teams Channel | Enterprise+ | Business hours | Direct communication with CSM + Support |
| On-Site Support | Government | Scheduled | Implementation support, training, incident response |

### In-App Chat

- Floating button in bottom-right corner of web app
- Pre-populated context (page URL, user role, recent activity)
- File and screenshot upload
- Chat transcript emailed after session
- Escalation button to phone call
- CSAT survey after resolution

### Email Support

- support@merline.io (automatic routing by region)
- Regional addresses: eastafrica@merline.io, westafrica@merline.io, etc.
- Auto-reply with ticket number and expected response time
- Automatic categorization by keywords
- Suggested knowledge base articles in auto-reply

### Phone Support

- Regional phone numbers (Nairobi, Lagos, Nairobi, DC)
- Enterprise customers receive dedicated line
- IVR: Language selection → Priority selection → Tier selection
- Call-back option (no wait)

### Community Forum

- User-to-user support (moderated by Merline)
- Knowledge base integration (suggested articles shown before posting)
- Upvote system for best answers
- Solved/unsolved tagging
- Community leader badges
- Topic categories: How-To, Best Practices, Feature Requests, Bug Reports, Show and Tell

---

## AI-Assisted Support (Phase 2)

### AI Chatbot (Support Bot)

**Capabilities:**
- Answers common questions from knowledge base (RAG-based)
- Troubleshooting guidance ("Try clearing your app cache")
- Account status checks ("Your subscription is active until Dec 2026")
- Escalates to human when confidence < 80%
- Learns from resolved tickets (continuous improvement)
- Multi-language support (initial: EN, FR, SW)

**Integration:**
- Embedding in web app (bottom-right chat)
- Embedding in mobile app
- Standalone widget on website

**Measurement:**
| Metric | Target |
|--------|--------|
| Deflection rate | > 40% of inquiries resolved without human |
| User satisfaction (bot) | > 4.0/5 |
| Escalation accuracy | Correct escalation decision > 95% |
| Resolution time (bot vs human) | Bot < 2 min, Human < 30 min |

### AI Knowledge Retrieval

- Automatic suggestion of relevant articles based on user context (page, role, recent activity)
- Search enhancement: semantic search over knowledge base
- Smart snippet: show answer directly in search results (no click needed)
- Feedback loop: "Was this helpful?" → improves ranking

---

## Bug Reporting & Feature Request Workflow

### Bug Reporting Flow

```
User discovers bug
  → Reports via in-app "Report Bug" button or community forum (Bug Report category)
  → Auto-tagged by severity (based on description keywords)
  → Support triages within SLA
  → If confirmed bug:
    → Engineering creates issue (GitHub)
    → Status tracked: New → Triaged → In Progress → Fixed → Deployed → Verified
  → User notified of status changes
  → Post-fix verification with reporter
  → Known issue published if workaround available
```

**Bug Reporting Guidelines:**
- One bug per report
- Include: steps to reproduce, expected vs actual behavior, screenshots/video, environment info
- Severity assigned by support (based on impact + frequency)

### Feature Request Flow

```
User submits feature request
  → via in-app "Suggest a Feature" or community forum (Feature Request category)
  → Product Manager reviews weekly
  → Categorized: Roadmap, Consider, Not Now, Already Exists
  → User updated on status + rationale
  → Upvoted by other users (community weighting)
  → High-demand features prioritized in quarterly planning
  → When implemented, original requester notified
```

### Feedback Loop

- Monthly "You Asked, We Built" communication to customers
- Feature request heatmap published quarterly (most requested by org type, region)
- Product roadmap shared with champions quarterly

---

## Escalation Matrix

### Internal Escalation Paths

| Issue Type | Level 1 | Level 2 | Level 3 | Level 4 |
|-----------|---------|---------|---------|---------|
| Technical bug | Support Specialist | Senior Support | Engineering | Engineering Lead |
| Data integrity | Support Specialist | Senior Support | Backend Engineer | Database Architect |
| Security incident | Support Specialist | Security Lead | Engineering Lead | CEO |
| Performance | Support Specialist | Senior Support | DevOps Engineer | DevOps Lead |
| Billing | Support Specialist | Finance | Sales | CEO |
| Feature request | Support Specialist | Product Manager | CPA | - |

### Customer Escalation Path

```
Customer Issue
  ↓
Tier 1/2 (CSM / Support)
  ↓ (if unresolved)
CSM Manager
  ↓ (if unresolved)
Customer Success Director
  ↓ (if business-critical)
CEO / CPA
```

### Escalation SLA

| Escalation Level | Response Time | Update Frequency |
|-----------------|---------------|-----------------|
| Level 1 (CSM/Support) | Standard SLA | Per ticket update |
| Level 2 (Manager) | < 4 hours | Daily |
| Level 3 (Director) | < 2 hours | Daily |
| Level 4 (CEO/CPA) | < 1 hour | Every 12 hours |

---

## Support Metrics

### Key Metrics & Targets

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **CSAT** | Customer satisfaction with support interaction (1-5) | > 4.5/5 | Post-ticket survey |
| **FCR** | First contact resolution rate | > 75% | Support system |
| **MTTR** | Mean time to resolution | P1: < 4h, P2: < 8h, P3: < 48h, P4: < 72h | Support system |
| **Ticket Volume Trend** | Tickets per customer per month | Stable or declining | Support analytics |
| **Deflection Rate** | % of inquiries resolved via self-service | > 40% | Support + analytics |
| **Escalation Rate** | % of tickets escalated to Tier 3+ | < 15% | Support system |
| **Reopen Rate** | % of resolved tickets reopened within 7 days | < 10% | Support system |
| **Response Time SLA** | % of tickets meeting response SLA | > 95% | Support system |
| **Resolution Time SLA** | % of tickets meeting resolution SLA | > 90% | Support system |
| **Agent CSAT** | Customer rating of support agent | > 4.5/5 | Post-ticket survey |

### Metric Dashboard

Real-time support dashboard showing:
- Current open tickets by priority (P1-P4)
- Response and resolution SLA compliance (last 24h, 7d, 30d)
- CSAT trend (7-day rolling average)
- FCR rate trend
- Top 10 issue categories (by volume)
- Ticket volume trend (daily/weekly/monthly)
- Escalation rate by tier
- Agent performance (individual CSAT, FCR, tickets resolved)

### Reporting Cadence

| Report | Frequency | Audience |
|--------|-----------|----------|
| Support snapshot (tickets, SLA, CSAT) | Daily | Support team |
| Support trends and top issues | Weekly | Product + Engineering |
| Customer health correlation (tickets + health score) | Weekly | CSM team |
| Support deep dive and improvement plan | Monthly | Leadership |
| Customer satisfaction and NPS impact | Quarterly | Executive |

---

## After-Hours & Emergency Support

### Emergency Support Coverage

| Tier | After-Hours Coverage | Method |
|------|---------------------|--------|
| Free/Community | None (self-service only) | Knowledge Base + Community Forum |
| Professional | None (business hours only) | Email submitted after hours, responded next business day |
| Enterprise | 24/7 for P1 (Critical) only | Phone + dedicated on-call engineer |
| Government | 24/7 for P1 + P2 | Dedicated support team with follow-the-sun coverage |

### Emergency Support Process

1. Customer calls emergency support number (Enterprise/Government only)
2. IVR collects: Customer ID, Priority (must be P1 to trigger emergency)
3. On-call support engineer calls back within 15 minutes
4. Engineer triages: If P1 → immediate response; If not P1 → scheduled for next business day
5. CSM notified of all after-hours interactions
6. Post-incident review scheduled for next business day

### Emergency Definition (P1 Criteria)

All of the following must be true:
- Platform is unavailable or unusable for > 50% of users
- Data loss is occurring or has occurred
- Sync failure affecting > 10% of active field devices
- No workaround available
- Business operations materially impacted

---

## Support Team Structure

### Phase 1 Team (Pilot + Early Customers)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| Customer Success Manager(s) | 2-3 | Primary customer contact, health monitoring, adoption, QBRs |
| Support Specialist | 1-2 | Tier 1 chat + email support |
| Senior Support Engineer | 1 | Tier 2 complex issues, escalations |
| Engineering on-call | Rotating | Tier 3 critical issues |

### Phase 2 Team (Growth)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| Customer Success Manager(s) | 4-6 | Named account ownership |
| Support Specialist | 3-4 | Tier 1 for all channels |
| Senior Support Engineer(s) | 2 | Tier 2 + Tier 3 triage |
| Support Engineer (Mobile) | 1 | Mobile-specific issues |
| Technical Writer | 1 | Knowledge base, training materials |
| Community Manager | 1 | Forum moderation, community building |

### Phase 3+ Team (Scale)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| Customer Success Director | 1 | Team leadership, strategy, executive escalation |
| Customer Success Manager(s) | 10+ | Named account ownership (segmented by tier) |
| Support Manager | 1 | Support team leadership |
| Support Specialist(s) | 8+ | Tier 1 (follow-the-sun coverage) |
| Senior Support Engineer(s) | 4 | Tier 2 + Tier 3 |
| Support Engineer (Mobile) | 2 | Mobile-specific support |
| Technical Writer | 2 | Knowledge base, documentation |
| Community Manager | 2 | Community, events, content |
| AI Support Engineer | 1 | AI chatbot training + improvement |

---

## Support Tools

| Tool | Purpose |
|------|---------|
| Help desk (Zendesk/Freshdesk) | Ticket management, SLA tracking, CSAT surveys |
| Knowledge base (Guru/Notion) | Internal + external knowledge base |
| Community platform (Discourse) | User community forum |
| AI chatbot (Intercom/Tidio) | Tier 0 automated support |
| Screen recording (Loom) | Asynchronous video support |
| Remote assistance (TeamViewer) | Direct user assistance (Enterprise+) |
| Monitoring (Grafana/Sentry) | Issue investigation |
| CRM (HubSpot/Salesforce) | Customer context, health score |
| In-app messaging (Intercom) | In-app chat + contextual help |
| Status page (Statuspage) | Incident communication |

---

## Knowledge Base Structure

### Content Organization

```
Knowledge Base
├── Getting Started
│   ├── Welcome to Merline
│   ├── Quick Start Guide (by Role)
│   └── Platform Overview
├── Role-Based Guides
│   ├── Administrator Guide
│   ├── Researcher Guide
│   ├── Enumerator Guide
│   ├── Supervisor Guide
│   └── Manager Guide
├── Workflows
│   ├── Creating a Study
│   ├── Designing a Questionnaire
│   ├── Collecting Data (Mobile)
│   ├── Monitoring Data Quality
│   └── Generating Reports
├── Troubleshooting
│   ├── Mobile App Issues
│   ├── Sync Issues
│   ├── Login & Account Issues
│   └── Dashboard & Report Issues
├── FAQ
│   ├── Account & Billing
│   ├── Data & Privacy
│   ├── Integration
│   └── Platform
└── Releases & Updates
    ├── Release Notes
    ├── New Features
    └── Known Issues
```

### Content Standards

- Each article follows: Problem → Solution → Related Topics
- Maximum reading time: 5 minutes per article
- Screenshots with callouts on all how-to articles
- Video embedded for complex workflows
- Last reviewed date visible
- "Was this helpful?" feedback at bottom
- Related articles linked
- Searchable by keyword, role, and workflow
