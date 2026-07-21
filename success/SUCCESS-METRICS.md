# Merline Customer Success Metrics Framework

## Measurement Philosophy

Customer success metrics measure outcomes, not activity. Login frequency matters only if it leads to completed studies. Support tickets matter only in context of customer satisfaction. This framework defines what we measure, how we measure it, and how we use data to drive customer outcomes.

**Core principle:** Every metric has a target, a measurement method, and an action trigger. Metrics without action are noise.

---

## Time to Value (TTV)

### Definition

TTV measures the time from a customer's first interaction with the platform (registration or kickoff) to the moment they experience tangible value — defined as their first successful, meaningful workflow completion.

### TTV Stages

| Stage | Definition | Measurement |
|-------|-----------|-------------|
| TTV-1: Account Setup | Time from registration to organization configured | Platform: org profile complete + first user invited |
| TTV-2: First Study | Time from registration to first study created | Platform: first study with status > Draft |
| TTV-3: First Submission | Time from registration to first data submission received | Platform: first submission with status = Synced |
| TTV-4: First Dashboard View | Time from registration to first dashboard view with data | Platform: first dashboard load with > 0 submissions |
| TTV-5: First Report | Time from registration to first report generated | Platform: first report in Final or Draft status |

### Targets

| Customer Segment | TTV-1 | TTV-2 | TTV-3 | TTV-4 | TTV-5 |
|-----------------|-------|-------|-------|-------|-------|
| Small NGO / Consultancy | < 1 day | < 2 days | < 3 days | < 4 days | < 14 days |
| Mid-size NGO | < 2 days | < 3 days | < 7 days | < 7 days | < 21 days |
| Large NGO | < 3 days | < 5 days | < 10 days | < 10 days | < 30 days |
| Government | < 5 days | < 10 days | < 21 days | < 21 days | < 45 days |

### TTV Optimization Levers

| Lever | Impact | Method |
|-------|--------|--------|
| Guided onboarding wizard | TTV-2 reduction | Step-by-step study creation guide |
| Template library | TTV-2 reduction | Pre-built study and form templates |
| White-glove data import | TTV-3 reduction | CSM imports first data manually |
| Auto-generated dashboards | TTV-4 reduction | Dashboard created automatically with first submission |
| Default report templates | TTV-5 reduction | Pre-configured report templates |

---

## Time to Adoption (TTA) per Feature/Module

### Definition

TTA measures the time from a feature's activation (customer has access to the feature) to the point where the feature is used regularly by the target user group.

### Feature Adoption Stages

| Stage | Definition | Measurement |
|-------|-----------|-------------|
| Activation | Feature is available to the customer | Platform: feature flag enabled |
| First Use | At least one user uses the feature | Platform: first feature-related event |
| Initial Adoption | > 20% of target users use the feature in 30 days | Platform: user activity per feature |
| Regular Use | > 60% of target users use the feature weekly | Platform: weekly active users per feature |
| Habit Formation | Feature used consistently for 90+ days | Platform: 90-day retention per feature |

### TTA Targets by Module

| Module | Target Users | Activation to First Use | First Use to Regular Use |
|--------|-------------|------------------------|-------------------------|
| Project Management | All users | < 1 day | < 7 days |
| Indicator Library | Researchers | < 3 days | < 14 days |
| Questionnaire Builder | Researchers | < 3 days | < 14 days |
| Mobile Data Collection | Enumerators | < 3 days | < 7 days |
| Supervisor Dashboard | Supervisors | < 3 days | < 14 days |
| Executive Dashboard | Managers | < 3 days | < 14 days |
| Report Generation | Managers | < 7 days | < 30 days |
| Data Quality Monitoring | Supervisors | < 7 days | < 30 days |
| Knowledge Management (P2) | All users | < 14 days | < 60 days |
| AI Design Assistant (P2) | Researchers | < 7 days | < 30 days |
| AI Data Quality (P2) | Supervisors | < 7 days | < 30 days |
| AI Report Writer (P2) | Managers | < 7 days | < 30 days |

### TTA Tracking Dashboard

For each customer, a module-by-module adoption heatmap shows:
- Module availability status
- Days since activation
- % of target users who have tried the feature
- % of target users who use weekly
- Days to reach Regular Use status
- RAG status (Green/Yellow/Red vs target TTA)

---

## Customer Health Score

### Components & Weighting

| Component | Weight | Sub-Components | Data Source |
|-----------|--------|---------------|-------------|
| Product Usage | 30% | Active users (10%), Submission trend (8%), Feature breadth (7%), Study completion (5%) | Platform analytics |
| Support Health | 20% | Ticket volume (6%), Severity (5%), FCR (5%), CSAT (4%) | Support system |
| Satisfaction | 20% | NPS (8%), CSAT (6%), Sentiment (6%) | Survey + Support |
| Training & Readiness | 15% | Training completion (8%), Certification rate (4%), Knowledge base usage (3%) | Training platform |
| Business Outcomes | 15% | Studies completed (5%), Reports generated (4%), Value realization (3%), Sponsor engagement (3%) | Platform + QBR |

### Score Thresholds & Actions

| Score | Status | Meaning | Action Required |
|-------|--------|---------|-----------------|
| 80-100 | Green | Customer is healthy, achieving value | Maintain cadence, identify expansion opportunities |
| 60-79 | Yellow | Minor concerns, needs attention | Proactive outreach, targeted improvement plan |
| 40-59 | Orange | Significant risk factors | Intensive support, executive engagement, root cause analysis |
| < 40 | Red | Critical risk of churn | Executive escalation, retention intervention |

### Health Score Trend Tracking

Health score is tracked over time with the following views:
- Current score vs previous period (30/60/90 day)
- Component breakdown (which areas are driving the score)
- Trend line (improving, stable, declining)
- Peer benchmark (how this customer compares to similar orgs)
- Alert history (what triggered past intervention)

---

## Net Promoter Score (NPS)

### Survey Design

**Question:** How likely are you to recommend Merline to a colleague or peer organization? (0-10)

**Follow-up question:** What is the primary reason for your score? (open text)

**Segmentation follow-up** (for promoters 9-10): What do you value most about Merline?

**Segmentation follow-up** (for detractors 0-6): What would need to improve for you to recommend us?

### Survey Cadence

| Survey Type | Frequency | Audience | Method |
|-------------|-----------|----------|--------|
| Transactional NPS | 30 days after go-live | All new customers | Email + in-app |
| Quarterly NPS | Every quarter | All active organizations | Email |
| Annual NPS | Once per year | All organizations (ever) | Email |

### Segmentation

NPS is tracked and reported by:
- Customer tier (Free, Professional, Enterprise, Government)
- Organization type (NGO, government, research, consultancy)
- Region (East Africa, West Africa, South Asia, etc.)
- Time since go-live (0-3 months, 3-12 months, 12+ months)
- User role (admin, researcher, enumerator, manager)

### Targets

| Segment | Year 1 Target | Year 2 Target | Year 3 Target |
|---------|---------------|---------------|---------------|
| Overall | > 30 | > 40 | > 50 |
| Enterprise | > 35 | > 45 | > 55 |
| Government | > 30 | > 40 | > 50 |
| Professional | > 25 | > 35 | > 45 |
| Free | > 20 | > 30 | > 40 |

### Detractor Response Protocol

| Score | Response | Timeline |
|-------|----------|----------|
| 0-6 (Detractor) | Personal follow-up call from CSM | Within 48 hours |
| 7-8 (Passive) | Email from CSM thanking for feedback | Within 1 week |
| 9-10 (Promoter) | Thank you + invitation to advocacy program | Within 1 week |

---

## Customer Satisfaction (CSAT)

### Survey Design

**Question:** How satisfied are you with [interaction/feature/overall experience]? (1-5 stars)

**Follow-up:** What could we improve? (open text, optional)

### CSAT Touchpoints

| Touchpoint | Timing | Question |
|------------|--------|----------|
| Support ticket | After ticket resolved | How satisfied are you with the support you received? |
| Training session | After each training module | How satisfied are you with this training? |
| Onboarding completion | After go-live sign-off | How satisfied are you with the onboarding experience? |
| Feature use (first 3 times) | After 3rd use of feature | How satisfied are you with [feature name]? |
| QBR | After each QBR | How satisfied are you with the Merline partnership? |
| General (quarterly) | Quarterly | Overall, how satisfied are you with Merline? |

### CSAT Targets

| Touchpoint | Target |
|------------|--------|
| Support ticket | > 4.5/5 |
| Training session | > 4.5/5 |
| Onboarding | > 4.5/5 |
| Feature satisfaction | > 4.0/5 |
| QBR satisfaction | > 4.5/5 |
| Overall satisfaction (quarterly) | > 4.0/5 |

---

## Churn & Retention Tracking

### Definitions

| Metric | Definition |
|--------|-----------|
| Logo Churn | % of paying customers who cancel or do not renew in a period |
| Revenue Churn (Gross) | % of recurring revenue lost due to cancellation or downgrade |
| Revenue Churn (Net) | Gross churn minus expansion revenue from existing customers |
| Gross Revenue Retention (GRR) | % of recurring revenue retained from existing customers (excluding expansion) |
| Net Revenue Retention (NRR) | % of recurring revenue retained including expansion and contraction |

### Churn Segmentation

| Segment | Year 1 Target (GRR) | Year 3 Target (GRR) |
|---------|---------------------|---------------------|
| Overall | > 90% | > 95% |
| Professional | > 92% | > 95% |
| Enterprise | > 95% | > 97% |
| Government | > 97% | > 98% |

### Retention Playbook Activation Triggers

| Risk Level | Trigger | Playbook |
|------------|---------|----------|
| Low | Health score Green, NPS > 40 | Standard retention (QBR, expansion) |
| Medium | Health score Yellow, NPS 20-40 | Proactive retention (Playbook 1) |
| High | Health score Orange, NPS < 20 | Intensive retention (Playbook 3) |
| Critical | Health score Red, intent to cancel | Executive retention (Playbook 4) |

---

## Expansion Revenue Tracking

### Expansion Drivers

| Driver | Description | Typical Uplift |
|--------|-------------|----------------|
| User growth | Adding more researchers, supervisors, enumerators | 25-100% increase |
| Module adoption | Adding AI features, reporting, knowledge management | 20-50% increase |
| Project/Study growth | Expanding from 1 project to multi-project | 10-30% increase |
| Tier upgrade | Professional to Enterprise | 300% increase |
| Multi-country expansion | Adding country offices | 50-200% increase |
| Integration services | DHIS2, Power BI connectors | $5-25K one-time |

### Expansion Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Expansion rate | % of customers with > 20% revenue increase YoY | > 30% |
| Net Revenue Retention (NRR) | (Starting MRR - Churn - Contraction + Expansion) / Starting MRR | > 120% (Year 3) |
| Average Revenue Per Account (ARPA) | Total ARR / Total paid accounts | $6K (Y1) to $20K (Y3) |
| Module adoption rate | % of customers using 3+ modules | > 60% |
| Tier upgrade rate | % of customers moving to higher tier annually | > 15% |

---

## Customer ROI Measurement Framework

### ROI Dimensions

| Dimension | Metric | Measurement Method |
|-----------|--------|-------------------|
| Time Savings | Hours saved per study lifecycle | Before/after time tracking |
| Cost Savings | Reduction in M&E tool stack cost | Previous tool costs vs Merline subscription |
| Quality Improvement | Data quality score improvement | Platform analytics (before/after) |
| Coverage Improvement | Increase in submissions or geographic reach | Year-over-year comparison |
| Reporting Efficiency | Time to generate donor report | Before/after time tracking |
| Staff Efficiency | Studies per FTE per year | Platform analytics |
| Decision Impact | Decisions informed by Merline evidence | Self-reported in QBR |

### ROI Calculation Template

```markdown
# ROI CALCULATION - [CUSTOMER NAME]

## Time Savings
| Activity | Before Merline | After Merline | Time Saved |
|----------|---------------|---------------|------------|
| Report generation | [X] hrs/month | [Y] hrs/month | [X-Y] hrs/month |
| Data cleaning | [X] hrs/month | [Y] hrs/month | [X-Y] hrs/month |
| Study design | [X] hrs/study | [Y] hrs/study | [X-Y] hrs/study |

## Cost Savings
| Item | Previous Cost | Merline Cost | Annual Savings |
|------|--------------|-------------|----------------|
| Tool subscriptions | $[X]/yr | $[Y]/yr | $[X-Y]/yr |
| IT support time | $[X]/yr | $[Y]/yr | $[X-Y]/yr |

## Quality Improvement
| Metric | Baseline (Before) | Current (After) | Improvement |
|--------|------------------|-----------------|-------------|
| Data quality score | [X]% | [Y]% | [+Z]% |
| Validation pass rate | [X]% | [Y]% | [+Z]% |

## Total Annual Value
Total Time Savings: $[X] (at $[rate]/hr)
Total Cost Savings: $[X]
Total Quality Value: $[X] (estimated)
**Total Annual Value: $[X]**
**Annual Investment: $[X]**
**ROI: [X]%**
```

---

## Success Story / Case Study Template

```markdown
# [Customer Name] — [Title]

## Executive Summary
[Catchy headline summarizing the transformation achieved]

## Organization Profile
- **Organization**: [Name]
- **Sector**: [Health/Education/Agriculture/etc.]
- **Size**: [# employees / # field staff]
- **Geography**: [Countries/Regions]
- **Tier**: [Free/Professional/Enterprise]

## The Challenge
[Describe the pain points before Merline]
- Fragmented tools (list them)
- Time wasted on manual processes
- Data quality issues
- Reporting burden

## The Solution
[How Merline was implemented]
- Modules deployed
- Implementation approach
- Key integration

## The Results
[Quantified outcomes]
### Efficiency Gains
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Report generation time | [X] days | [Y] minutes | [Z]% faster |
| Study setup time | [X] days | [Y] hours | [Z]% faster |

### Quality Gains
- Data quality score: [X]% to [Y]%
- Field error rate: [X]% to [Y]%

### Impact
- Studies completed on platform: [X]
- Data points collected: [X]
- Reports generated: [X]
- Users trained: [X]

## Testimonial
> "[Quote from customer executive]"

## Lessons Learned
1. [Key lesson]
2. [Key lesson]

## About [Customer]
[Brief description of customer organization]
```
