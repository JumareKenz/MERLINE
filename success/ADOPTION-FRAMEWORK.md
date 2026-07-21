# Merline Adoption Framework

## Adoption Philosophy

Adoption is the bridge between deployment and value. Software deployed but not used delivers zero return. This framework provides a systematic approach to measuring, monitoring, and improving adoption across all user personas.

**Core principle:** Adoption is not about login frequency — it is about workflow integration. A user who logs in daily but only uses one feature is less valuable than a user who logs in weekly but completes end-to-end workflows.

---

## Adoption Metrics by Persona

### Researcher / Evaluator

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Study creation rate | Studies created per month per researcher | > 2/month | Monthly |
| Study completion rate | % of started studies reaching Complete status | > 60% | Monthly |
| Questionnaire design time | Time to design a 50-question form | < 30 min | Weekly |
| Indicator utilization | % of studies with linked indicators | > 80% | Monthly |
| Questionnaire approval time | Days from submit to approval | < 3 days | Weekly |
| Report generation frequency | Reports generated per completed study | > 2 | Monthly |
| Feature usage breadth | Distinct modules used per week | > 3 | Weekly |
| AI acceptance rate (Phase 2) | % of AI suggestions accepted | > 60% | Monthly |
| Dashboard views per week | Average dashboard sessions | > 2 | Weekly |

### Enumerator

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Submissions per day | Average completed forms per field day | > 10 | Daily |
| Sync compliance | % of submissions synced within 24 hours | > 95% | Daily |
| Offline success rate | % of submissions completed offline without error | > 98% | Weekly |
| GPS capture rate | % of submissions with valid GPS | > 95% | Weekly |
| Media capture rate | % of submissions with required media | > 90% | Weekly |
| Validation pass rate | % of submissions passing all validation rules | > 95% | Weekly |
| App sessions per week | Days with app activity | > 4 | Weekly |
| Resubmission rate | % of submissions rejected and resubmitted | < 5% | Monthly |

### Supervisor

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Review turnaround time | Hours from submission to review | < 4 hours | Daily |
| Review completion rate | % of flagged submissions reviewed within 24h | > 90% | Daily |
| Quality flag response rate | % of quality flags actioned within 48h | > 85% | Weekly |
| Enumerator communication frequency | Messages sent to team per week | > 3 | Weekly |
| Assignment management | Assignments created/modified per week | > 2 | Weekly |
| Dashboard views per day | Supervisor dashboard sessions | > 1 | Daily |
| Progress report generation | Reports generated per week | > 1 | Weekly |

### Program Manager

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Dashboard views per week | Executive/study dashboard sessions | > 3 | Weekly |
| Report generation frequency | Reports generated per month | > 4 | Monthly |
| Indicator tracking reviews | RAG status reviews per week | > 2 | Weekly |
| Scheduled report adoption | % of reports on auto-schedule | > 50% | Monthly |
| Share actions | Dashboards/reports shared with stakeholders | > 2/month | Monthly |
| Drill-down depth | Average filter/drill-down actions per session | > 3 | Weekly |

### Executive / Country Director

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Executive dashboard views per month | Portfolio-level dashboard sessions | > 4 | Monthly |
| Report access | Reports accessed per month | > 2 | Monthly |
| AI brief views (Phase 2) | AI-generated executive briefs viewed | > 4 | Monthly |
| Share actions | Reports shared with board/donors | > 1/quarter | Quarterly |

### Administrator

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| User management activity | User invites, role changes, suspensions per week | As needed | Weekly |
| Configuration changes | Org settings, security policy updates | As needed | Monthly |
| Audit log reviews | Audit log accesses per month | > 1 | Monthly |
| Support ticket resolution | Tickets resolved without escalation | > 80% | Monthly |
| Training material access | Knowledge base / guide accesses | > 2/month | Monthly |

### Donor

| Metric | Definition | Target | Frequency |
|--------|-----------|--------|-----------|
| Portfolio dashboard views per month | Cross-grantee dashboard sessions | > 2 | Monthly |
| Grantee data access | Data views across grantees | > 1/quarter | Quarterly |
| Report downloads | Donor briefs downloaded | > 1/quarter | Quarterly |

---

## Customer Health Score Model

### Score Components & Weighting

| Component | Weight | Description | Data Source |
|-----------|--------|-------------|-------------|
| **Product Usage** | 30% | Login frequency, submission volume, feature adoption breadth | Platform analytics |
| **Support Health** | 20% | Ticket volume, severity, resolution time, satisfaction | Support system |
| **Satisfaction** | 20% | NPS, CSAT, sentiment analysis | Survey + Support |
| **Training Completion** | 15% | % of users trained, certification status | Training platform |
| **Business Outcomes** | 15% | Studies completed, reports generated, time saved | Platform analytics + QBR |

### Detailed Scoring Matrix

#### Product Usage (30 points)

| Metric | Weight | 0 Points | 5 Points | 10 Points |
|--------|--------|----------|----------|-----------|
| Active users (30-day MAU / total invited) | 30% | < 20% | 20-60% | > 60% |
| Submission volume trend (30-day vs previous) | 25% | Declining > 20% | Flat (±20%) | Growing > 20% |
| Feature breadth (modules used / available) | 25% | < 2 modules | 2-4 modules | > 4 modules |
| Study completion rate | 20% | < 30% | 30-60% | > 60% |

#### Support Health (20 points)

| Metric | Weight | 0 Points | 5 Points | 10 Points |
|--------|--------|----------|----------|-----------|
| Ticket volume (per 10 users/month) | 30% | > 10 | 3-10 | < 3 |
| Critical/high severity tickets (30 days) | 30% | > 2 | 1-2 | 0 |
| Ticket resolution satisfaction | 20% | < 3.0/5 | 3.0-4.0/5 | > 4.0/5 |
| First contact resolution rate | 20% | < 50% | 50-80% | > 80% |

#### Satisfaction (20 points)

| Metric | Weight | 0 Points | 5 Points | 10 Points |
|--------|--------|----------|----------|-----------|
| NPS (most recent survey) | 40% | < 0 | 0-40 | > 40 |
| CSAT (most recent survey) | 30% | < 3.0 | 3.0-4.0 | > 4.0 |
| Sentiment (support tickets, feedback, QBR) | 30% | Negative | Neutral | Positive |

#### Training Completion (15 points)

| Metric | Weight | 0 Points | 5 Points | 10 Points |
|--------|--------|----------|----------|-----------|
| Admin training completion | 25% | Not completed | Partial | Complete |
| Researcher training completion | 25% | < 50% | 50-80% | > 80% |
| Enumerator training completion | 25% | < 50% | 50-80% | > 80% |
| Certification rate | 25% | < 20% | 20-60% | > 60% |

#### Business Outcomes (15 points)

| Metric | Weight | 0 Points | 5 Points | 10 Points |
|--------|--------|----------|----------|-----------|
| Studies completed to date | 25% | 0 | 1-5 | > 5 |
| Reports generated to date | 25% | 0 | 1-10 | > 10 |
| Self-reported time saved | 25% | No improvement | Partial | Significant |
| Executive sponsor engagement | 25% | Disengaged | Neutral | Actively championing |

### Health Score Calculation

```
Health Score = (ProductUsage × 0.30) + (SupportHealth × 0.20) + (Satisfaction × 0.20) + (Training × 0.15) + (BusinessOutcomes × 0.15)
```

### Health Score Tiers

| Score | Status | Meaning | Action |
|-------|--------|---------|--------|
| 80-100 | Green (Healthy) | Customer achieving value, low churn risk | Maintain, expand, develop as advocate |
| 60-79 | Yellow (Attention) | Some risk factors present, needs proactive management | Increase engagement, targeted interventions |
| 40-59 | Orange (At Risk) | Multiple risk factors, potential churn threat | Intensive support, executive engagement |
| < 40 | Red (Critical) | High churn risk, significant issues | Executive escalation, retention intervention |

### Health Score Automation

- Calculated weekly (automated from platform analytics + support system)
- Updated in Customer Success dashboard
- Alert triggers when score changes tier
- Historical trend view (30/60/90 day)

---

## Adoption Benchmarks by Segment

### By Organization Type

| Segment | Active Users (% of invited) | Submissions/User/Month | Feature Breadth (modules) | Study Completion Rate |
|---------|---------------------------|----------------------|--------------------------|---------------------|
| Small NGO (< 50 staff) | > 70% | > 50 | > 4 | > 70% |
| Mid-size NGO (50-500) | > 60% | > 30 | > 3 | > 60% |
| Large NGO (> 500) | > 50% | > 20 | > 3 | > 50% |
| Government | > 40% | > 15 | > 2 | > 40% |
| Research/Academic | > 55% | > 25 | > 4 | > 65% |
| Consultancy | > 65% | > 40 | > 3 | > 60% |

### By Geographic Region

| Region | Active Users | Submissions/User | Feature Breadth |
|--------|-------------|-----------------|-----------------|
| East Africa | > 55% | > 30 | > 3 |
| West Africa | > 50% | > 25 | > 3 |
| Southern Africa | > 60% | > 35 | > 3 |
| South Asia | > 55% | > 30 | > 3 |
| Southeast Asia | > 60% | > 35 | > 3 |
| North America/Europe | > 65% | > 20 | > 4 |

### By Tier

| Segment | Week 1 Activation | Month 1 Retention | Month 3 Adoption | Month 6 Expansion |
|---------|-------------------|-------------------|------------------|-------------------|
| Free/Community | > 40% | > 30% | > 20% | N/A |
| Professional | > 60% | > 50% | > 40% | > 20% |
| Enterprise | > 70% | > 60% | > 50% | > 30% |
| Government | > 50% | > 45% | > 40% | > 15% |

---

## Early Warning Indicators for Churn

### Leading Indicators

| Indicator | Warning Threshold | Critical Threshold | Lead Time |
|-----------|------------------|-------------------|-----------|
| Login frequency decline | < 50% of baseline for 2 weeks | < 25% for 4 weeks | 4-8 weeks |
| Submission volume decline | < 60% of baseline for 2 weeks | < 30% for 4 weeks | 4-8 weeks |
| Active user count decline | > 20% drop in 30 days | > 40% drop in 60 days | 4-12 weeks |
| Support ticket volume spike | > 2x normal for 2 weeks | > 5x normal | 2-4 weeks |
| Negative NPS response | Score drops below 20 | Score below 0 | 4-12 weeks |
| Executive sponsor disengagement | Missed QBR or 2+ declined meetings | No executive contact in 60 days | 8-16 weeks |
| Feature adoption stagnation | No new features used in 30 days | Feature breadth declining | 8-12 weeks |
| Competitor mention | Mentioned in support or QBR | RFP sent to competitor | 4-12 weeks |
| Payment issue | Invoice > 15 days overdue | Invoice > 45 days overdue | 4-8 weeks |
| Staff turnover (customer) | Key user leaves | Champion leaves | 4-16 weeks |
| Training gap | New users not trained in 30 days | No training activity in 90 days | 8-16 weeks |
| Study completion stall | No study completed in 60 days | No study completed in 120 days | 8-16 weeks |

### Churn Prediction Model

A composite risk score is calculated weekly:

```
Churn Risk = (LoginDecline × 0.25) + (SubmissionDrop × 0.20) + (TicketSpike × 0.15) + (SatisfactionDrop × 0.15) + (FeatureStagnation × 0.10) + (SponsorDisengagement × 0.10) + (PaymentIssue × 0.05)

Risk Levels:
- Low (0-25): Normal monitoring
- Medium (26-50): Proactive outreach
- High (51-75): Intensive intervention
- Critical (76-100): Executive escalation
```

---

## Intervention Playbooks

### Playbook 1: Low Adoption (Yellow/Orange Health)

**Triggers:**
- Login frequency below 50% of baseline for 2+ weeks
- Feature breadth < 2 modules
- Active users < 40% of invited

**Intervention Steps:**

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Diagnostic call with customer PM: What's blocking adoption? | CSM | Week 1 |
| 2 | Identify untrained or frustrated users | CSM | Week 1 |
| 3 | Schedule targeted training for low-adoption groups | Training | Week 2 |
| 4 | Executive check-in call with sponsor | CSM Manager | Week 2 |
| 5 | Implement quick wins: configure a dashboard, automate a report | CSM | Week 2-3 |
| 6 | Power user identification: find 1-2 engaged users to champion | CSM | Week 3 |
| 7 | Track improvement for 2 weeks; reassess health | CSM | Week 4 |
| 8 | If no improvement, escalate to executive intervention (Playbook 4) | CSM Manager | Week 4 |

**Success Criteria:** Health score improves to Green within 30 days.

### Playbook 2: Stalled Implementation

**Triggers:**
- No first submission within 7 days of go-live
- Less than 50% of planned users active after 14 days
- Implementation milestones missed by > 1 week

**Intervention Steps:**

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Root cause analysis: technical, training, or organizational barrier? | CSM + Support | 48 hours |
| 2 | Technical: check sync, mobile app, data pipeline | Support | 24 hours |
| 3 | Training: schedule emergency training session for stuck users | Training | 48 hours |
| 4 | Organizational: call executive sponsor to address resistance | CSM Manager | 48 hours |
| 5 | Simplify: reduce scope to 1 study, 1 form, 1 team — prove value first | CSM | Week 1 |
| 6 | Daily check-in calls until first submission achieved | CSM | Until milestone |
| 7 | Celebrate first submission with customer team | CSM | Milestone |
| 8 | Gradual expansion back to full scope | CSM | Week 2-3 |

**Success Criteria:** First submission achieved, adoption curve starts within 14 days.

### Playbook 3: User Frustration / Negative Sentiment

**Triggers:**
- CSAT score < 3.0
- NPS < 0 (detractor)
- Multiple negative support tickets or feedback
- Customer expresses intent to leave

**Intervention Steps:**

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Personal call from CSM within 24 hours of negative signal | CSM | 24 hours |
| 2 | Empathetic listening session: document all pain points | CSM | Week 1 |
| 3 | Create action plan with specific fixes and dates | CSM + Product | Week 1 |
| 4 | Executive call: CSM Manager + Customer Sponsor align | CSM Manager | Week 1 |
| 5 | Quick fix: resolve top 3 pain points within 1 week | Support + Eng | Week 1-2 |
| 6 | Product: log feature requests and share roadmap alignment | CSM | Week 2 |
| 7 | Share progress update with customer (we heard you, here's what we fixed) | CSM | Week 2 |
| 8 | Re-survey sentiment after 30 days | CSM | Week 4 |

**Success Criteria:** Sentiment improves to neutral or positive within 30 days. Customer willing to continue.

### Playbook 4: Executive Intervention (High Churn Risk)

**Triggers:**
- Customer has communicated intent to cancel
- Health score < 40 (Red) for 2+ consecutive weeks
- Executive sponsor has not engaged in 60+ days
- Critical service failure (data loss, extended outage)

**Intervention Steps:**

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | Immediate escalation to Merline executive (CEO or CPA) | CSM Manager | 24 hours |
| 2 | Executive-to-Executive call: acknowledge issue, demonstrate commitment | CEO/CPA | 48 hours |
| 3 | Joint root cause analysis with customer leadership | CSM + Customer Exec | Week 1 |
| 4 | Create executive-level remediation plan with milestones and owners | CEO/CPA | Week 1 |
| 5 | Allocate dedicated resources (engineer, support, CSM) | Engineering Lead | Week 1 |
| 6 | Weekly executive status calls until health improves | CEO/CPA | Ongoing |
| 7 | Consider commercial adjustment (discount, extended trial, service credits) | CEO/CPA | Week 2 |
| 8 | Track recovery for 60 days; reassess retention likelihood | CSM Manager | Day 60 |

**Success Criteria:** Customer retains, health score improves to Yellow+ within 60 days. If recovery not possible, manage graceful offboarding.

---

## Power User Cultivation Program

### Power User Definition

A power user exhibits:
- > 90th percentile in platform activity (submissions, logins, features used)
- Creates and shares templates, indicators, or best practices
- Actively participates in community (forum, feedback, user groups)
- Mentors other users within their organization

### Power User Benefits

| Benefit | Description |
|---------|-------------|
| Early access | Access to new features and beta programs |
| Direct product feedback channel | Quarterly calls with Product team |
| Community leader badge | Visible badge on profile and community |
| Invitation to Customer Advisory Board | Influence product roadmap |
| Featured in case studies | Organizational and personal recognition |
| Conference speaking opportunities | Platform at Merline events |
| Priority support | Fast-track support queue |
| Swag and recognition | Merline power user kit |

### Power User Identification Process

```
Usage Analytics → Identify Top 5% by Activity → Review for Quality Contributions → Invite to Program → Welcome Kit → Ongoing Engagement
```

### Power User Engagement Cadence

| Activity | Frequency | Description |
|----------|-----------|-------------|
| Power user newsletter | Monthly | Tips, roadmap previews, community highlights |
| Feedback session | Quarterly | Product feedback, feature prioritization, usability input |
| Community spotlight | Monthly | Featured power user story |
| Beta access | Per feature | Early access to new capabilities |
| User group leadership | Ongoing | Lead local/regional user groups |

---

## Champion Network Design

### Champion Roles

| Role | Description | Selection Criteria |
|------|-------------|-------------------|
| **Org Champion** | Primary advocate within customer organization | Executive sponsor or M&E Director |
| **Power User** | Expert-level platform user who helps others | High proficiency, willing to help |
| **Trainer** | Certified to deliver training internally | Completed Train-the-Trainer program |
| **Community Leader** | Active in Merline user community | Consistent community contributions |

### Champion Network Activities

| Activity | Frequency | Participants |
|----------|-----------|--------------|
| Champion onboarding call | Once per champion | New champions + CSM |
| Monthly champion newsletter | Monthly | All champions |
| Quarterly champion forum (virtual) | Quarterly | All champions |
| Annual champion summit (in-person) | Annually | Top champions |
| Product preview sessions | Per release | Champions |
| Reference calls | As needed | Champions willing to speak |

### Champion Rewards & Recognition

| Reward | Eligibility | Value |
|--------|-------------|-------|
| Public recognition in newsletter | All active champions | Recognition |
| Champion certificate | All active champions | Professional development |
| Exclusive swag | Active for 3+ months | Tangible |
| Free professional training pass | Active for 6+ months | $500+ value |
| VIP conference pass | Top 10% of champions | $1,000+ value |
| Paid speaking opportunity | Exceptional champions | Variable |

---

## Success Planning

### Quarterly Business Review (QBR) Structure

**Frequency:** Quarterly
**Duration:** 60 minutes
**Attendees:** Customer executive sponsor, PM, key users, Merline CSM, Merline executive (annually)

**Agenda:**

| Item | Time | Description |
|------|------|-------------|
| Adoption Review | 10 min | Key metrics: active users, submissions, feature adoption, health score |
| Business Value | 15 min | Studies completed, reports generated, time saved, quality improvement |
| Wins & Challenges | 10 min | What's working well, what's not working |
| Product Roadmap | 10 min | Recent releases, upcoming features relevant to customer |
| Improvement Plan | 10 min | Actions to address challenges, increase adoption, unlock value |
| Expansion Opportunities | 5 min | Additional modules, users, teams, integrations |

**QBR Deliverables:**
- QBR slide deck (standardized template)
- Adoption scorecard (current metrics vs targets)
- Action plan (agreed next steps with owners and dates)
- Customer health update

### Outcome Tracking

| Outcome Category | Metric Examples | Measurement |
|-----------------|-----------------|-------------|
| **Efficiency** | Time saved per report, per study setup, per data cleaning | User surveys + platform analytics |
| **Quality** | Data quality score improvement, error rate reduction | Platform analytics |
| **Coverage** | Studies completed, submissions collected, geographies reached | Platform analytics |
| **Capacity** | Users trained, certifications earned, self-sufficiency score | Training platform |
| **Impact** | Decisions informed by evidence, programs improved | User-reported (QBR) |
| **ROI** | Cost savings, FTE equivalent, donor reporting efficiency | Customer-calculated with CSM support |

### Success Plan Template

Each customer has a living Success Plan document updated quarterly:

```
Customer: [Name]
Tier: [Free/Professional/Enterprise]
CSM: [Name]
Start Date: [Date]

SUCCESS OBJECTIVES
1. [Objective] - [Metric] - [Target] - [Current]

ADOPTION TARGETS
- Active Users: [Target] (Current: [X])
- Submissions/Month: [Target] (Current: [X])
- Feature Breadth: [Target] (Current: [X])
- Study Completion Rate: [Target] (Current: [X])

MILESTONES
- [Date]: [Milestone]
- [Date]: [Milestone]

EXPANSION OPPORTUNITIES
- [Feature/Module] - [Timeline] - [Expected Revenue]

RISKS
- [Risk] - [Severity] - [Mitigation]

ACTION ITEMS
- [Action] - [Owner] - [Due Date]
```

### Success Plan Review Cadence

| Review Type | Frequency | Participants | Focus |
|-------------|-----------|-------------|-------|
| Health check | Weekly | CSM (internal) | Metrics, risks, actions |
| Customer check-in | Bi-weekly | CSM + Customer PM | Progress, blockers, wins |
| QBR | Quarterly | CSM + Customer team | Value, roadmap, expansion |
| Executive Business Review | Annually | Merline Exec + Customer Exec | Strategic partnership, long-term value |
