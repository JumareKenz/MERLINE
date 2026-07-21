# Merline Implementation Playbook

## Playbook Philosophy

Implementation is a structured program, not an installation. Every implementation should be planned, resourced, governed, and measured. This playbook provides the templates, checklists, and processes that guide every customer implementation from signed contract to successful go-live.

**Core principle:** Implementation success is measured by customer outcomes (users confident, workflows adopted, value achieved), not by technical deployment.

---

## 1. Pre-Sales Handoff Checklist

### When
Upon contract signing. The handoff ensures the Customer Success team has everything needed to begin the implementation with zero information loss.

### Handoff Meeting Attendees
- Sales Representative (presenting)
- Customer Success Manager (receiving)
- Implementation Lead (receiving)
- Customer Project Manager (optional)

### Handoff Checklist

**Customer Information**
- [ ] Customer name, organization type, tier
- [ ] Primary contact (project manager name, email, phone)
- [ ] Executive sponsor (name, email, phone)
- [ ] Secondary contacts (admin, researcher lead, etc.)

**Sales Context**
- [ ] Sales discovery notes (pain points, goals, decision criteria)
- [ ] Demo recording or notes (what was shown, what was promised)
- [ ] Key buying factors (why they chose Merline)
- [ ] Competitive threats (who they evaluated, why they chose us)
- [ ] Price and contract terms (tier, duration, discount, payment terms)

**Implementation Scope**
- [ ] Agreed implementation scope (modules, users, studies)
- [ ] Exclusions (what was explicitly NOT included)
- [ ] Expected go-live date
- [ ] Expected training approach (self-paced, live, in-person)
- [ ] Data migration requirements (from which tools, how much data)

**Technical Information**
- [ ] Security questionnaire responses (if completed)
- [ ] DPA status (signed / in progress)
- [ ] Integration requirements (DHIS2, SSO, etc.)
- [ ] Data residency requirements
- [ ] Mobile device requirements (Android version, device types)

**Stakeholder Map**
- [ ] Decision-making unit (who approves, who influences, who uses)
- [ ] Champion name and role
- [ ] Known resisters or skeptics

**Pipeline**
- [ ] Referral potential (would customer provide reference?)
- [ ] Expansion opportunities identified during sales

### Handoff Meeting Agenda

| Item | Duration | Description |
|------|----------|-------------|
| Customer overview | 15 min | Org, stakeholders, context |
| Sales process highlights | 15 min | What was sold, what was promised, what was excluded |
| Technical requirements | 15 min | Integration, security, data migration |
| Stakeholder dynamics | 15 min | Champion, resisters, decision-makers |
| Q&A and next steps | 10 min | Handoff acceptance, kickoff scheduling |

### Handoff Acceptance Criteria

The CSM accepts the handoff when:
- All checklist items are complete
- No information gaps that would delay kickoff
- Implementation scope is clearly defined
- Customer project manager contact is confirmed
- Technical requirements are documented

---

## 2. Implementation Planning Template

### Document Header

`markdown
# Implementation Plan — [Customer Name]

**Version**: 1.0
**Date**: [Date]
**Prepared by**: [CSM Name]
**Approved by**: [Customer PM Name], [Merline Lead Name]

## 1. Customer Information
- Organization: [Name]
- Tier: [Free/Professional/Enterprise/Government]
- Project Manager: [Name, Email, Phone]
- Executive Sponsor: [Name, Email, Phone]
- Admin/IT Lead: [Name, Email, Phone]

## 2. Implementation Scope

### In Scope
| Module | Included | Notes |
|--------|----------|-------|
| Organization Setup | Yes/No | |
| User Management | Yes/No | |
| Project & Study Management | Yes/No | |
| Indicator Library | Yes/No | |
| Questionnaire Builder | Yes/No | |
| Mobile Data Collection | Yes/No | |
| Supervisor Dashboard | Yes/No | |
| Executive Dashboard | Yes/No | |
| Report Generation | Yes/No | |
| Data Quality Monitoring | Yes/No (Phase 2) | |
| AI Features | Yes/No (Phase 2) | |
| Knowledge Management | Yes/No (Phase 2) | |
| Integrations | Yes/No | |

### Out of Scope
- [List features explicitly excluded]
- [List future phases]

## 3. Success Criteria

### Business Outcomes
| Outcome | Metric | Baseline | Target | Timeline |
|---------|--------|----------|--------|----------|
| [Outcome] | [Metric] | [Value] | [Value] | [Date] |
| [Outcome] | [Metric] | [Value] | [Value] | [Date] |

### Adoption Targets
| Metric | 30-Day Target | 60-Day Target | 90-Day Target |
|--------|---------------|---------------|---------------|
| Active users (% of invited) | | | |
| Submissions per month | | | |
| Feature breadth (modules) | | | |
| Study completion rate | | | |

## 4. Timeline

| Week | Activities | Milestones | Owner |
|------|-----------|------------|-------|
| Pre | Handoff, kickoff prep, survey | Kickoff scheduled | CSM |
| 1 | Kickoff, org setup, user import | Org configured, users invited | CSM + Customer Admin |
| 2 | Study creation, indicator setup, questionnaire design | First questionnaire created | Researcher + CSM |
| 3 | Training (all roles) | Training completed | Training Lead |
| 4 | Mobile deploy, test data, go-live | Go-live signed off | CSM + Customer PM |

## 5. Stakeholder Engagement Plan

| Stakeholder | Role | Engagement | Communication Method | Frequency |
|-------------|------|------------|---------------------|-----------|
| [Name] | Executive Sponsor | Approve, remove blockers | Email + Quarterly review | Monthly |
| [Name] | Project Manager | Day-to-day coordination | Weekly calls | Weekly |
| [Name] | Admin/IT Lead | Technical setup | Working sessions | Weekly |
| [Name] | Lead Researcher | Content design | Workshops | Weekly |
| [Name] | Enumerator Rep | Field testing | Training + feedback | As needed |

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner | Status |
|------|-----------|--------|------------|-------|--------|
| [Risk] | H/M/L | H/M/L | [Mitigation] | [Owner] | Open/Mitigated/Closed |

## 7. Training Plan

| Training Session | Audience | Duration | Format | Date |
|-----------------|----------|----------|--------|------|
| Admin Setup | Admin/IT | 90 min | Live virtual | [Date] |
| Study Design & Questionnaire | Researchers | 120 min | Live virtual | [Date] |
| Mobile Data Collection | Enumerators | 180 min | In-person | [Date] |
| Supervision & Quality | Supervisors | 90 min | Live virtual | [Date] |
| Dashboard & Reports | Managers | 60 min | Live virtual | [Date] |

## 8. Communication Plan

| Communication | Audience | Frequency | Channel | Owner |
|--------------|----------|-----------|---------|-------|
| Implementation status | Customer PM + CSM | Weekly | Email/Call | CSM |
| Milestone updates | All stakeholders | Per milestone | Email | Customer PM |
| Adoption metrics | Customer PM + Sponsor | Monthly | Dashboard | CSM |
| Training schedule | All users | Before training | Email | Training Lead |
| Go-live announcement | All users + Merline team | At go-live | Email + In-app | Customer PM |

## 9. Dependencies

| Dependency | Owner | Due Date | Status |
|------------|-------|----------|--------|
| [Dependency] | [Owner] | [Date] | Met/Pending/At Risk |

## 10. Approvals

- Customer Project Manager: [ ] Date:
- Merline CSM: [ ] Date:
- Merline Implementation Lead: [ ] Date:
`
`

---

## 3. Data Migration Approach

### Migration Scenarios

| Source | Migration Method | Complexity | Timeline |
|--------|-----------------|------------|----------|
| Excel/CSV (indicators) | Import via API or UI | Low | 1-2 days |
| Excel/CSV (submissions) | Import via API with mapping | Medium | 2-5 days |
| KoboToolbox | Export to XLS, convert, import | Medium | 3-7 days |
| ODK | Export to CSV/XML, convert, import | Medium | 3-7 days |
| SurveyCTO | Export format conversion | Medium | 3-7 days |
| DevResults | API-based export (if available) or CSV | High | 1-3 weeks |
| ActivityInfo | API-based export (if available) or CSV | High | 1-3 weeks |
| Paper forms | Manual data entry or OCR + validation | High | Per volume |

### Migration Process

`
Plan → Extract → Transform → Validate → Import → Verify
`

| Phase | Activities | Deliverables |
|-------|-----------|-------------|
| Plan | Identify data sources, assess quality, define mapping, estimate effort | Migration plan |
| Extract | Export data from source systems, export templates | Raw data files |
| Transform | Map fields, clean data, reformat to template, resolve inconsistencies | Cleaned data files |
| Validate | Verify mapping accuracy, check data types, test with subset | Validation report |
| Import | Import in batches, monitor for errors, log results | Import logs |
| Verify | Spot-check imported data, verify counts, user acceptance test | Verification sign-off |

### Migration Quality Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| Data completeness | > 99% of source records successfully imported | CSM + Customer |
| Data accuracy | Random sample of 5% of records verified correct | Customer |
| Indicator integrity | All indicator definitions, baselines, targets preserved | Customer |
| Media migration | All media (photos, audio) linked to correct records | CSM |
| Audit trail | Migration log shows record-level success/failure | CSM |

---

## 4. Integration Planning

### Integration Types

| Integration | Phase | Setup Effort | Maintenance |
|-------------|-------|-------------|-------------|
| REST API | Phase 2 | Low | Low |
| Webhooks | Phase 2 | Low | Low |
| DHIS2 Connector | Phase 2+ | High | Medium |
| Power BI / Tableau | Phase 2+ | Medium | Low |
| KoboToolbox Import | Phase 2+ | Medium | Low |
| SSO / SAML | Phase 2+ | Medium | Low |
| Zapier / Make.com | Phase 3+ | Low | Low |

### Integration Planning Template

`markdown
## Integration Plan — [Integration Name]

### Overview
- Integration type: [API/Webhook/Connector]
- Source system: [Name]
- Target system: [Name]
- Data flow direction: [Unidirectional / Bidirectional]
- Sync frequency: [Real-time / Batch (specify interval)]

### Requirements
- Authentication method: [API key / OAuth / SAML]
- Data volume: [Records per sync]
- Error handling strategy: [Retry / Log / Alert]
- Security considerations: [Data classification, encryption]

### Setup Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Testing Plan
- [Test case 1]
- [Test case 2]

### Rollback Plan
- [How to revert if integration fails]
`
`

---

## 5. Change Management Plan Template

### Change Management Methodology

Based on ADKAR model (Awareness, Desire, Knowledge, Ability, Reinforcement):

| ADKAR Element | Activities | Owner |
|---------------|-----------|-------|
| **Awareness** | Communicate why change is happening, what's changing, what's not changing | Executive Sponsor |
| **Desire** | Engage influencers, address concerns, share success stories | Champion + CSM |
| **Knowledge** | Deliver role-based training, provide reference materials | Training Lead |
| **Ability** | Hands-on practice, sandbox environment, post-training support | CSM + Support |
| **Reinforcement** | Celebrate wins, recognize champions, measure adoption, address gaps | CSM + Customer PM |

### Change Management Plan

`markdown
## Change Management Plan — [Customer Name]

### Change Description
What is changing: [Brief description of the new platform and what it replaces]
What is not changing: [Processes, relationships, etc. that remain the same]

### Stakeholder Impact Assessment

| Stakeholder Group | Current State | Future State | Impact Level | Key Concern |
|-------------------|--------------|--------------|--------------|-------------|
| Researchers | Manual study design in Word/Excel | Platform-based design with indicators | High | Learning curve |
| Enumerators | Paper-based or basic digital collection | Mobile app with offline capability | Medium | Device literacy |
| Supervisors | Manual progress tracking via calls | Real-time dashboard monitoring | Medium | Trust in data |
| Managers | Manual report compilation | One-click report generation | Low-Medium | Data accuracy |
| IT Admin | Managing multiple tools | Single platform administration | Low | Integration |

### Communication Plan

| Message | Audience | Channel | Timing | Sender |
|---------|----------|---------|--------|--------|
| Why we're adopting Merline | All staff | Email + All-hands | Pre-kickoff | Executive Sponsor |
| What to expect during implementation | Users | Email | Kickoff week | Project Manager |
| Training schedule | Trainees | Email + Calendar | Training week | Training Lead |
| Go-live announcement | All staff | Email + In-app | Go-live day | Executive Sponsor |
| Adoption progress | All staff | Newsletter | Monthly | Project Manager |

### Resistance Management

| Potential Resistance | Source | Mitigation Strategy |
|---------------------|--------|---------------------|
| "I prefer my current tool" | Power users with existing workflows | Show efficiency gains, address specific pain points, involve in beta testing |
| "This is too complex" | Low-literacy enumerators | Simplified training, quick-reference cards, peer support |
| "We don't have time for this" | Overloaded program managers | Emphasize time savings, phase implementation, provide white-glove support |
| "IT won't approve it" | IT security concerns | Provide security documentation, early IT engagement, compliance attestation |

### Success Metrics for Change Management

| Metric | Target | Measurement |
|--------|--------|-------------|
| Awareness | > 90% of staff aware of change | Pulse survey |
| Desire | > 70% of users positive about change | Pre/post survey |
| Knowledge | > 85% training completion rate | Training platform |
| Ability | > 80% of users can complete core workflow independently | Post-training assessment |
| Reinforcement | > 60% of users actively using platform at 60 days | Platform analytics |
`
`

---

## 6. Communication Plan Template

`markdown
## Implementation Communication Plan — [Customer Name]

### Communication Principles
1. Over-communicate: Assume key messages need 7 repetitions
2. Multi-channel: Email, in-app, meetings, posters
3. Executive-led: Sponsor opens and closes key communications
4. Two-way: All communications invite questions and feedback

### Pre-Implementation

| Communication | Audience | Content | Channel | Timing | Sender |
|--------------|----------|---------|---------|--------|--------|
| Implementation announcement | All users | Why Merline, timeline, what to expect | Email from exec sponsor | 2 weeks before kickoff | Executive Sponsor |
| Kickoff invitation | Project team | Agenda, attendees, prep work | Calendar | 1 week before kickoff | Project Manager |
| Pre-work instructions | All users | Account setup, survey link, training dates | Email | 1 week before kickoff | CSM |
| Kickoff meeting | Project team | Full agenda, success criteria, timeline | Live meeting | Day 1 | CSM + Customer PM |

### During Implementation

| Communication | Audience | Content | Channel | Timing | Sender |
|--------------|----------|---------|---------|--------|--------|
| Weekly status update | All stakeholders | Progress, milestones, next week | Email | Every Friday | CSM |
| Training schedule | Trainees | Dates, times, prep needed | Email + Calendar | Before each training | Training Lead |
| Tip of the week | All users | Quick workflow tip | Email + In-app | Weekly | CSM |
| Milestone celebration | All stakeholders | Milestone achieved, impact | Email | Per milestone | Executive Sponsor |

### Go-Live

| Communication | Audience | Content | Channel | Timing | Sender |
|--------------|----------|---------|---------|--------|--------|
| Go-live announcement | All users | Platform is live, how to get help | Email + In-app | Go-live day | Executive Sponsor |
| Quick start guide | All users | Role-specific first steps | Email + Printed | Go-live day | CSM |
| Support channels | All users | How to get help, SLA, hours | Email + In-app | Go-live day | Support Team |

### Post-Implementation

| Communication | Audience | Content | Channel | Timing | Sender |
|--------------|----------|---------|---------|--------|--------|
| First results | All users | First submissions, data collected | Email | 1 week post go-live | CSM |
| Adoption update | All users | How we're doing, what's working | Newsletter | Monthly | CSM + Customer PM |
| QBR invitation | Executive team | Quarterly review, results, roadmap | Email | Quarterly | CSM |
| Success story | All users + Leadership | Case study, testimonial | Email + Meeting | Milestone | Executive Sponsor |
`
`

---

## 7. Stakeholder Alignment Workshop Design

### Workshop Purpose

Align all key stakeholders on the implementation vision, approach, and their role in success.

### Duration

Half-day (3-4 hours) or full-day (6-7 hours) depending on complexity.

### Attendees

- Executive sponsor
- Project manager
- Department heads (research, M&E, programs, IT)
- User representatives (researcher, enumerator, supervisor)
- Merline CSM and Implementation Lead

### Workshop Agenda

`markdown
## Stakeholder Alignment Workshop

### Part 1: Why We're Here (45 min)
- Welcome and introductions
- Executive sponsor: Why we chose Merline, what success looks like
- Current state review: pain points, inefficiencies, costs
- Future state vision: what will be different in 6 months

### Part 2: The Implementation Journey (60 min)
- Implementation plan overview (timeline, scope, milestones)
- Roles and responsibilities (who does what)
- Training approach (how users will learn)
- Communication plan (how we stay informed)

### Part 3: Breakout Sessions (60 min)

**Track A: Leadership**
- Success criteria definition
- Adoption metrics and targets
- Governance and escalation
- Executive sponsor role

**Track B: Users**
- Workflow walkthrough (see it live)
- Hands-on sandbox time
- Concerns and questions
- Champion identification

### Part 4: Success Criteria Definition (45 min)
- Define 3-5 measurable success criteria
- Agree on baseline metrics
- Set adoption targets (30/60/90 day)
- Document and sign off

### Part 5: Risk and Resistance Discussion (30 min)
- Identify top 3 risks
- Identify potential resistance sources
- Mitigation strategies
- Owner assignment

### Part 6: Action Plan and Close (30 min)
- Immediate action items (next 2 weeks)
- Communication to broader team
- Workshop summary distributed
- Executive sponsor closing remarks

### Workshop Deliverables
- Workshop summary document
- Agreed success criteria
- Risk register (top 3 risks with mitigations)
- Action items with owners and dates
- Stakeholder commitment confirmation
`
`

---

## 8. Go-Live Checklist

### Pre-Go-Live (Week Before)

**Technical Readiness**
- [ ] Organization configured (branding, timezone, security)
- [ ] Users imported with correct roles
- [ ] Teams created (if applicable)
- [ ] First project created
- [ ] First study created with indicators
- [ ] Questionnaire designed, reviewed, approved, and versioned
- [ ] Mobile app tested on target devices
- [ ] Form deployed to mobile (downloadable)
- [ ] Test submission: web (passed)
- [ ] Test submission: mobile offline (passed)
- [ ] Test submission: mobile sync (passed)
- [ ] Dashboard showing test data correctly
- [ ] Report generation from test data (passed)
- [ ] Data export (CSV/Excel) verified
- [ ] API access tested (if applicable)

**Training Readiness**
- [ ] Admin training completed
- [ ] Researcher training completed
- [ ] Enumerator training completed
- [ ] Supervisor training completed
- [ ] Manager/executive training completed
- [ ] Training completion rate > 80% per role
- [ ] Quick-reference cards distributed
- [ ] Knowledge base access confirmed

**Organizational Readiness**
- [ ] Customer project manager confirmed
- [ ] Executive sponsor engaged
- [ ] Communication sent to all users
- [ ] Support channels established
- [ ] Escalation path documented
- [ ] Success criteria documented and agreed
- [ ] Go-live date communicated to all stakeholders

### Go-Live Day

- [ ] Production assignments pushed to enumerators
- [ ] Merline CSM available for live support (full day)
- [ ] Support team on standby
- [ ] Monitoring dashboard open (submissions, errors, sync)
- [ ] First real submission received
- [ ] First real submission synced
- [ ] Dashboard verified with real data
- [ ] Customer project manager confirms go-live
- [ ] Go-live sign-off obtained

### Post-Go-Live (First Week)

- [ ] Daily check-in with customer PM (first 3 days)
- [ ] Sync success rate monitored
- [ ] Data quality score reviewed
- [ ] Support tickets triaged within SLA
- [ ] First 100 submissions celebrated
- [ ] Week 1 health check completed
- [ ] Issues logged and tracked to resolution
- [ ] Go-live retrospective (internal CSM + Support)

---

## 9. Post-Launch Support Schedule

### Support Intensity by Phase

| Phase | Duration | Support Level | Customer Contact | Merline Commitment |
|-------|----------|--------------|-----------------|-------------------|
| Hypercare | Days 1-3 | Maximum | Daily check-in | CSM full-time + Support on standby |
| Stabilization | Days 4-14 | High | Every 2-3 days | CSM daily + Support same-day |
| Transition | Weeks 3-4 | Medium | Weekly | CSM weekly + Support per SLA |
| Steady State | Month 2+ | Standard | Bi-weekly/monthly | CSM per health score + Support per SLA |

### Hypercare (Days 1-3) Schedule

| Day | CSM Activities | Support Activities | Customer Activities |
|-----|---------------|-------------------|---------------------|
| Day 1 | Full-day availability, monitor submissions, immediate issue triage | Standby for escalations | First data collection, report issues |
| Day 2 | Check-in call, review sync/dashboard, address Day 1 issues | Resolve open tickets | Continue collection, test reports |
| Day 3 | Check-in call, quality review, plan for stabilization | Resolve remaining tickets | Provide feedback on first 3 days |

### Post-Launch Support Ramp-Down

`
Week 1: Daily check-in, full-time CSM, on-demand support
Week 2: Every-other-day check-in, CSM available, support per SLA
Week 3: Weekly check-in, CSM monitoring, support per SLA
Week 4: Weekly check-in, transition to steady state
Month 2+: Bi-weekly/monthly check-in, QBR scheduled
`

---

## 10. Lessons Learned Process

### Purpose

Every implementation generates knowledge. Lessons learned capture what worked, what didn't, and what to do differently next time — feeding back into the implementation playbook for continuous improvement.

### Process

`
Implementation Complete → Lessons Learned Session → Document Findings → Update Playbook → Share with Team
`

### Lessons Learned Session

**Timing:** Within 2 weeks of go-live sign-off
**Duration:** 60-90 minutes
**Attendees:** CSM, Implementation Lead, Support Engineer (optional), Customer PM (optional)
**Facilitator:** CSM Manager or neutral third party

### Session Agenda

`markdown
## Lessons Learned — [Customer Name]

### What Went Well
1. [Thing that worked well] — [Why it worked — How to replicate]
2. [Thing that worked well] — [Why it worked — How to replicate]
3. [Thing that worked well] — [Why it worked — How to replicate]

### What Could Have Gone Better
1. [Thing that could improve] — [Root cause — What to change]
2. [Thing that could improve] — [Root cause — What to change]
3. [Thing that could improve] — [Root cause — What to change]

### Surprises
1. [Unexpected positive] — [How to harness]
2. [Unexpected challenge] — [How to mitigate in future]

### Customer Feedback (if available)
- What did the customer say about the implementation experience?
- What would they change?
- Would they recommend us based on the implementation?

### Playbook Updates Required
| Finding | Playbook Change | Owner | Timeline |
|---------|----------------|-------|----------|
| [Finding] | [Change] | [Owner] | [Date] |

### Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action] | [Owner] | [Date] |
`
`

### Lessons Learned Repository

All lessons learned are documented in a central repository, tagged by:
- Customer segment (NGO, government, research, consultancy)
- Implementation complexity (simple, moderate, complex)
- Region (East Africa, West Africa, etc.)
- Module scope (core, with AI, with integration)
- Key themes (training, data migration, stakeholder resistance, etc.)

### Continuous Improvement Cycle

`
Implementation → Lessons Learned → Playbook Update → Next Implementation → Compare → Improve
`

- Quarterly review of all lessons learned
- Playbook updated quarterly based on aggregated learnings
- Implementation quality score tracked over time
- New CSMs trained using latest playbook version
