# Pricing Strategy & Business Model

## 1. Pricing Model Options Evaluated

| Model | Pros | Cons | Fit for Merline |
|-------|------|------|-----------------|
| Per-user SaaS | Simple, predictable revenue | Penalizes large orgs; low adoption in development sector | Moderate |
| Per-organization subscription | Aligns with org budgets, encourages adoption | Harder to price differentiated tiers | **High** |
| Tiered (features+usage) | Captures value at scale | Complexity in explaining tiers | **High** |
| Usage-based (submissions) | Aligns cost with value | Unpredictable bills for customers | Low |
| Open-core (free+enterprise) | Community growth, low CAC | Converting free users is slow | Moderate |
| Enterprise license | Large deals, high LTV | Long sales cycles, high CAC | Moderate (Phase 3+) |

---

## 2. Recommended Model: Hybrid Per-Organization + Tiered

### Rationale

The development sector does not price per-user because:
- Organizations have 10,000+ enumerators (field staff) who should not be individually charged
- Budget is typically per-project/program, not per-headcount
- Per-user pricing creates perverse incentive to limit data collectors

**Recommended: Tiered subscription based on organization type + feature access + usage limits**

### Pricing Tiers

| Tier | Target Segment | Monthly Price | Annual Price | Key Limits |
|-----|----------------|--------------|--------------|------------|
| **Free / Community** | Small NGOs, individual researchers, pilots | $0 | $0 | 1 project, 3 users, 1K submissions/mo, basic dashboards |
| **Professional** | Mid-size NGOs, consultancies, research groups | $500 | $5,400 ($450/mo) | 10 projects, 25 users, 25K submissions/mo, all features except AI and enterprise |
| **Enterprise** | Large NGOs, government, UN agencies, foundations | $2,000 | $21,600 ($1,800/mo) | Unlimited projects, 200 users, 200K submissions/mo, AI features, SSO, audit |
| **Government** | National ministries, statistical offices | Custom | Custom | Unlimited, data residency, dedicated support, SLA, custom integrations |
| **Donor/Foundation** | Funder monitoring portfolio | Custom | Custom | Multi-grantee view, standardized templates, portfolio dashboards |

---

## 3. Feature-to-Tier Mapping

| Feature | Free | Professional | Enterprise | Government |
|---------|------|-------------|------------|------------|
| Project & Study Management | ✓ (1 project) | ✓ (10 projects) | ✓ (unlimited) | ✓ (unlimited) |
| Indicator Library | ✓ | ✓ | ✓ | ✓ |
| Questionnaire Builder | ✓ | ✓ | ✓ | ✓ |
| Mobile Data Collection (offline) | ✓ (limited) | ✓ | ✓ | ✓ |
| Dashboard & Filtering | ✓ (basic) | ✓ (full) | ✓ (full) | ✓ (full) |
| Report Generation | ✓ (1 template) | ✓ (all templates) | ✓ + custom | ✓ + custom |
| Data Export (CSV/Excel) | ✓ | ✓ | ✓ | ✓ |
| Multi-language Forms | ✓ | ✓ | ✓ | ✓ |
| **AI Research Design Assistant** | ✗ | ✓ (50 queries/mo) | ✓ (unlimited) | ✓ (unlimited) |
| **AI Data Quality Engine** | ✗ | ✓ (basic) | ✓ (advanced) | ✓ (advanced) |
| **AI Report Writer** | ✗ | ✗ | ✓ | ✓ |
| **AI Insight Engine** | ✗ | ✗ | ✓ | ✓ |
| **AI Photo Analysis** | ✗ | ✗ | ✓ | ✓ |
| Knowledge Management | ✗ | ✓ (basic) | ✓ | ✓ |
| SAML/SSO | ✗ | ✗ | ✓ | ✓ |
| Audit Logs | ✗ | ✓ (30 day) | ✓ (7 year) | ✓ (7 year) |
| API Access | ✗ | ✓ (rate-limited) | ✓ (full) | ✓ (full) |
| Custom Branding | ✗ | ✗ | ✓ | ✓ |
| Data Residency | ✗ | ✗ | ✗ | ✓ |
| Dedicated Support | Community | Email (4h SLA) | Email+Phone (2h SLA) | Phone+Dedicated (1h SLA) |
| SLA (Uptime) | 99% | 99.5% | 99.9% | 99.95% |

---

## 4. Pricing Metrics & Limits

| Metric | Free | Professional | Enterprise | Government |
|--------|------|-------------|------------|------------|
| Active Projects | 1 | 10 | Unlimited | Unlimited |
| Team Members | 3 | 25 | 200 | Custom |
| Submissions/month | 1,000 | 25,000 | 200,000 | Custom |
| Storage | 500 MB | 10 GB | 100 GB | Custom |
| AI Queries/month | 0 | 50 | 2,000 | Custom |
| API Rate Limit | None | 1,000/day | 100,000/day | Custom |
| Report Templates | 1 | 5 | Unlimited | Custom |
| Studies | 3 | 50 | Unlimited | Unlimited |

### Overage Pricing
| Overage Type | Rate |
|-------------|------|
| Additional projects (Professional+) | $50/mo per 10 projects |
| Additional users (Professional+) | $15/user/mo |
| Additional submissions (Professional+) | $0.02/100 submissions |
| Additional storage | $0.10/GB/mo |
| AI queries over limit | $0.50/query |

---

## 5. Discount & Negotiation Framework

| Scenario | Discount | Conditions |
|----------|----------|------------|
| Annual prepayment | 10% off monthly | Pay upfront annually |
| Non-profit / academic | 15% off | Valid non-profit registration |
| Multi-year contract | 15-25% off | 2-3 year commitment |
| Pilot discount | 50% off for 3 months | Limited to 10 users, 3-month max |
| Volume (10+ org deployments) | 20% off | Enterprise tier |
| Introduction program | First month free | For referred organizations |
| Government / UN | 10-20% off | Standard procurement, no negotiation below cost |

### Minimum Deal Sizing
- Professional: $500/mo minimum ($450/mo annual)
- Enterprise: $2,000/mo minimum ($1,800/mo annual)
- Government: $20,000/yr minimum (justifies implementation support)

---

## 6. Competitive Pricing Comparison

| Competitor | Equivalent Tier | Annual Cost | Merline Annual | Savings |
|-----------|----------------|-------------|----------------|---------|
| DevResults (25 users) | Enterprise | $15-30K | $5,400-$21,600 | 28-64% |
| ActivityInfo (25 users) | Professional | $15-25K | $5,400 | 64-78% |
| KoboToolbox (paid) | Professional | $1,800 | $5,400 | More expensive (but more features) |
| SurveyCTO (25 collectors) | Professional | $12,500 | $5,400 | 57% |
| CommCare (25 users) | Professional | $15,000 | $5,400 | 64% |
| Encompass | Enterprise | $15-30K | $5,400-$21,600 | 28-64% |

**Merline positions at 40-60% below incumbents with more features (especially AI).**

---

## 7. Revenue Projections (TAM, SAM, SOM)

### 7.1 TAM (Total Addressable Market)
- Global MERL software: $2.8-3.5B
- Merline addressable segments: $2.0-2.5B

### 7.2 SAM (Serviceable Addressable Market)
- Segments Merline can reach in 3 years: $500-800M
- Geographic scope (Africa, South Asia, Southeast Asia, global donors)

### 7.3 SOM (Serviceable Obtainable Market)
| Year | Target | Deployments | Revenue | % of SAM |
|------|--------|-------------|---------|----------|
| Year 1 (2026-27) | 10 orgs | 10 pilots + 5 paid | $50-100K | <0.1% |
| Year 2 (2027-28) | 50 orgs | 5 free + 45 paid | $500K-1.2M | 0.2% |
| Year 3 (2028-29) | 250 orgs | 200 paid | $3-8M | 1% |
| Year 4 (2029-30) | 1,000 orgs | 800 paid | $12-25M | 3% |
| Year 5 (2030-31) | 5,000 orgs | 4,000 paid | $50-80M | 10% |

### 7.4 Revenue Mix (Year 3 Projection)
| Tier | % of Customers | Avg Revenue | Total Revenue |
|------|---------------|-------------|---------------|
| Free | 50% | $0 | $0 |
| Professional | 30% | $6,000/yr | $540,000 |
| Enterprise | 15% | $24,000/yr | $900,000 |
| Government | 5% | $60,000/yr | $750,000 |
| **Total** | **100%** | | **$2.19M** |

---

## 8. Go-to-Market Pricing Strategy

### Phase 1: Penetration (Months 0-12)
- **Free Community tier** — maximize adoption, collect feedback, build case studies
- **Professional tier at $300/mo** (introductory) — first 20 customers
- **Goal**: 10 active paid organizations by end of Year 1
- **Emphasis**: Value demonstration over revenue

### Phase 2: Optimization (Months 12-24)
- Raise Professional to $500/mo for new customers; grandfather existing
- Introduce Enterprise tier at $2,000/mo
- **Goal**: 45 paid organizations

### Phase 3: Scale (Months 24-36)
- Enterprise tier at $2,500/mo
- Government custom pricing with implementation fees
- Introduce overage revenue streams
- **Goal**: 200 paid organizations, $3M+ ARR

### Phase 4: Ecosystem (Months 36-60)
- Plugin marketplace revenue share (20% cut)
- Integration service fees
- API usage pricing for high-volume partners
- **Goal**: $50M ARR

---

## 9. Key Pricing Principles

1. **Never price per enumerator** — this would kill adoption in the field where Merline's volume is highest.
2. **Bundle AI into Professional+** — AI is the differentiation; make it accessible to drive adoption.
3. **Free tier must be genuinely useful** — not crippleware. A small NGO should be able to run a real study on free tier.
4. **Grandfather pricing** — never raise prices for existing customers without significant new value.
5. **Annual commitment discount** — incentivize yearly contracts to improve cash flow and reduce churn.
6. **Implementation services separate** — customization, training, data migration billed separately ($5-25K per deployment).
