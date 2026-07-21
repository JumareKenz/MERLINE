# Merline Incident Response Plan

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Draft |

---

## 1. Incident Classification

### 1.1 Severity Levels

| Level | Label | Definition | Examples | Response Time | Notification |
|-------|-------|------------|----------|---------------|--------------|
| **SEV-1** | Critical | Active data breach, service outage, or regulatory violation | Unauthorized data access, ransomware, PII exposure, complete service down | 15 min response, continuous | Executive + Legal + Regulators (72h) |
| **SEV-2** | High | Significant security event with limited impact | Account compromise (admin), partial data exposure, API key leak, AI prompt injection with data exfiltration | 30 min response | Security team + affected customers |
| **SEV-3** | Medium | Contained security event, suspicious activity | Brute force detected (mitigated), low-value account compromise, CSRF attempt, DDoS attempt (mitigated) | 2 hours response | Security team |
| **SEV-4** | Low | Minor event requiring documentation | Policy violation, configuration drift, failed backup, rate limit abuse | 24 hours | Team lead |

### 1.2 Incident Categories

| Category | Code | Description |
|----------|------|-------------|
| Data breach | INC-DB | Unauthorized access to or exfiltration of data |
| Account compromise | INC-AC | Unauthorized access to user or service accounts |
| Malware/Ransomware | INC-MR | Malicious software affecting systems |
| Denial of Service | INC-DS | Service availability attack |
| Insider threat | INC-IT | Malicious or negligent employee/contractor action |
| AI incident | INC-AI | Prompt injection, data leakage, model abuse |
| Third-party breach | INC-TP | Compromise of integrated service or vendor |
| Physical security | INC-PS | Unauthorized physical access to infrastructure |
| Policy violation | INC-PV | Violation of security policy |
| Compliance incident | INC-CP | Regulatory compliance violation |
| Configuration error | INC-CE | Misconfiguration leading to exposure |
| Supply chain | INC-SC | Compromised dependency or container |

---

## 2. Response Team Structure

### 2.1 Core Response Team

| Role | Responsibility | Primary | Secondary |
|------|----------------|---------|-----------|
| **Incident Commander (IC)** | Overall coordination, decision-making, communication | Security Architect | CTO |
| **Technical Lead** | Technical investigation, containment, eradication | DevOps Lead | Backend Lead |
| **Communications Lead** | Internal/external communications, regulatory notifications | CEO/COO | Security Architect |
| **Legal Counsel** | Legal guidance, regulatory obligations, privilege | External counsel (on retainer) | — |
| **SME (affected system)** | Domain expertise for affected system | Relevant Engineering Lead | Backend Lead |
| **Scribe** | Incident timeline, evidence preservation, documentation | QA Lead | Any engineer |

### 2.2 Extended Team (On-Call)

| Role | Activation | Responsibility |
|------|------------|----------------|
| Database Administrator | SEV-1/2 data incidents | Database forensics, recovery |
| AI/ML Engineer | SEV-1/2 AI incidents | Model investigation, prompt audit |
| Mobile Lead | Mobile-specific incidents | App forensics, remote wipe |
| Frontend Lead | Web-specific incidents | Client-side investigation |
| Customer Success | Customer-facing incidents | Customer communication |
| HR | Insider threat incidents | Personnel actions |

### 2.3 Contact Hierarchy

```
SEV-1:
  1. On-call engineer (15 min)
  2. Security Architect (15 min)
  3. CTO (30 min)
  4. CEO (60 min)
  5. Legal counsel (2 hours)

SEV-2:
  1. On-call engineer (30 min)
  2. Security Architect (1 hour)
  3. CTO (2 hours)

SEV-3:
  1. On-call engineer (2 hours)
  2. Security Architect (next business day)

SEV-4:
  1. Assigned team lead (24 hours)
```

---

## 3. Detection Mechanisms

### 3.1 Automated Detection

| Detection Source | What It Detects | Alert Channel | Severity |
|-----------------|-----------------|---------------|----------|
| WAF (Web Application Firewall) | SQLi, XSS, RFI, LFI, CSRF, API abuse | PagerDuty + Slack | SEV-2/3 |
| IDS/IPS (network) | Unusual traffic patterns, port scanning | PagerDuty + Slack | SEV-2/3 |
| SIEM (log analysis) | Correlated security events | PagerDuty + email | SEV-1/2 |
| Anomaly detection (auth) | Impossible travel, credential stuffing, brute force | PagerDuty + Slack | SEV-2/3 |
| Anomaly detection (AI) | Prompt injection, data leakage, cost anomaly | PagerDuty + Slack | SEV-1/2 |
| Vulnerability scanner | New CVEs in dependencies, containers | Slack + email | SEV-3/4 |
| Dependency scanner (Dependabot) | Vulnerable package versions | GitHub + email | SEV-3/4 |
| Backup health check | Failed backups, backup integrity failure | PagerDuty + Slack | SEV-3 |
| Monitoring (Prometheus) | Service health, resource exhaustion | PagerDuty | SEV-1/2 |
| Audit log correlation | Suspicious access patterns | SIEM alert | SEV-2/3 |
| Secret scanner | Secrets in code, GitHub, or CI logs | Slack + email | SEV-2 |
| File integrity monitoring | Unexpected file changes on servers | PagerDuty | SEV-2 |

### 3.2 Manual Detection

| Source | What to Report | How to Report |
|--------|----------------|---------------|
| Employee observation | Suspicious behavior, policy violation | #security Slack channel or security@merline.io |
| Customer report | Data issue, suspicious activity, outage | Support ticket → Security team |
| Security researcher | Vulnerability disclosure | security@merline.io (PGP encrypted) |
| Regulatory body | Compliance inquiry | Legal counsel → Security team |
| Vendor notification | Third-party breach affecting Merline | #security Slack channel |
| Threat intelligence feed | Emerging threat relevant to stack | Security Architect review |

---

## 4. Response Procedures

### 4.1 SEV-1 / SEV-2 Response Flow

```
  Detection                                
     │                                     
     ▼                                     
  [TRIAGE] - 15 min                        
  ┌───────────────────────────────┐         
  │ Assess: Is this a real        │         
  │ security incident?            │         
  │ • Initial scope               │         
  │ • Affected systems            │         
  │ • Data at risk                │         
  │ • Severity classification     │         
  └───────────────┬───────────────┘         
                  │                         
          False (No) │ True (Yes)           
                  │   │                     
              ┌───┘   ▼                    
              │   [CONTAINMENT]             
              │   ┌─────────────────────┐   
              │   │ • Isolate affected  │   
              │   │   systems           │   
              │   │ • Block malicious   │   
              │   │   IPs/users         │   
              │   │ • Rotate exposed    │   
              │   │   credentials       │   
              │   │ • Preserve evidence │   
              │   └─────────┬───────────┘   
              │             │               
              │             ▼               
              │   [ERADICATION]             
              │   ┌─────────────────────┐   
              │   │ • Remove threat     │   
              │   │ • Patch             │   
              │   │   vulnerabilities   │   
              │   │ • System cleanup    │   
              │   │ • Verify removal    │   
              │   └─────────┬───────────┘   
              │             │               
              │             ▼               
              │   [RECOVERY]                
              │   ┌─────────────────────┐   
              │   │ • Restore from      │   
              │   │   clean backup      │   
              │   │ • Verify integrity  │   
              │   │ • Monitor for       │   
              │   │   recurrence        │   
              │   │ • Return to service │   
              │   └─────────┬───────────┘   
              │             │               
              │             ▼               
              │   [POST-INCIDENT]           
              │   ┌─────────────────────┐   
              │   │ • Root cause        │   
              │   │   analysis          │   
              │   │ • Lessons learned   │   
              │   │ • Remediation plan  │   
              │   │ • Report generation │   
              │   └─────────────────────┘   
              │                             
  Log incident│                             
  (tracking)  │                             
              │                             
              ◇ Close incident              
```

### 4.2 SEV-3 / SEV-4 Response Flow

1. **Triage** (within SLA): Assess validity and scope
2. **Investigation**: Determine root cause, affected systems
3. **Remediation**: Fix configuration, block activity, update rules
4. **Documentation**: Record in incident tracking system
5. **Review**: Include in weekly security review

### 4.3 Containment Procedures

| Incident Type | Containment Actions |
|---------------|---------------------|
| **Data breach** (external) | 1. Rotate all exposed credentials. 2. Block attacker IP ranges. 3. Revoke exposed API keys. 4. Enable enhanced logging. 5. Contact law enforcement if criminal activity. |
| **Data breach** (insider) | 1. Revoke user access immediately. 2. Enable remote wipe if mobile. 3. Preserve all user activity logs. 4. HR involvement. |
| **Account compromise** | 1. Force password reset. 2. Revoke all sessions. 3. Enable MFA if not enabled. 4. Review all recent account activity. 5. Notify user. |
| **Ransomware** | 1. Isolate affected system from network. 2. Do not pay ransom. 3. Restore from clean backup. 4. Preserve forensic evidence. 5. Contact law enforcement. |
| **DDoS** | 1. Enable WAF/DDoS protection. 2. Scale infrastructure. 3. Contact cloud provider DDoS team. 4. Consider CDN/scrubbing center. |
| **AI incident (injection)** | 1. Block affected model/feature. 2. Rotate system prompt if needed. 3. Review all recent AI interactions from user. 4. Evaluate if data was exfiltrated. |
| **AI incident (data leak)** | 1. Block AI feature. 2. Contact affected customers. 3. Review model provider's data handling. 4. Switch to local model for sensitive data. |
| **Supply chain** | 1. Isolate affected component. 2. Roll back to known-good version. 3. Scan for backdoors. 4. Audit all systems using affected component. |
| **API key leak** | 1. Revoke leaked key. 2. Generate new key. 3. Review API usage for unauthorized access. 4. Rotate if key had admin-level access. |

---

## 5. Communication Templates

### 5.1 Internal Communication

**Initial Alert (Slack/PagerDuty):**
```
🚨 [SEV-{LEVEL}] {INCIDENT_TITLE}
─────────────────────────────────
Time: {UTC timestamp}
Detected by: {source}
Affected: {systems/users/data}
Status: {investigating/contained/resolved}
IC: {name}
Channel: #incident-{id}
Next update: {time}
```

**Status Update (every 60 min for SEV-1, 120 min for SEV-2):**
```
📋 Incident Update #{N} — {INCIDENT_ID}
─────────────────────────────────
Time: {UTC timestamp}
What we know: {summary of findings}
Actions taken: {list}
Next steps: {list}
Current status: {investigating/contained/eradicated/recovered}
```

**Incident Closure:**
```
✅ Incident Closed — {INCIDENT_ID}
─────────────────────────────────
Severity: SEV-{LEVEL}
Category: {CATEGORY}
Duration: {X hours Y minutes}
Root cause: {summary}
Impact: {affected users/data/systems}
Remediation: {list of actions taken}
Post-incident review scheduled: {date/time}
```

### 5.2 Customer Communication

**Breach Notification (SEV-1 data breach):**
```
Subject: Security Incident Notification — Merline Platform

Dear {Customer Contact},

We are writing to inform you of a security incident affecting Merline platform.

WHAT HAPPENED:
{Clear, factual description of the incident, what data was affected, and timeframe}

WHAT DATA WAS AFFECTED:
{Types of data involved, whether customer data or PII was affected, number of records}

WHAT WE HAVE DONE:
{Immediate actions taken — containment, investigation, enhanced monitoring}

WHAT YOU SHOULD DO:
{Recommended actions for customer — password reset, session review}

CONTACT:
If you have questions, please contact:
- Security team: security@merline.io
- DPO: dpo@merline.io
- Incident ID: {INCIDENT_ID}

We take the security of your data seriously and apologize for any concern this incident may cause.

Sincerely,
{CISO Name}
Chief Information Security Officer
Merline
```

**Regulatory Notification (72-hour GDPR):**
```
Subject: Personal Data Breach Notification — {INCIDENT_ID}

{DATA PROTECTION AUTHORITY NAME}

In accordance with Article 33 of the General Data Protection Regulation, we hereby notify you of a personal data breach.

INCIDENT DETAILS:
- Date and time of breach: {UTC timestamp}
- Date and time of discovery: {UTC timestamp}
- Nature of the breach: {description}
- Categories of data affected: {categories}
- Approximate number of data subjects: {number}
- Approximate number of records: {number}

LIKELY CONSEQUENCES:
{Description of consequences}

MEASURES TAKEN:
{Description of measures taken and proposed}

DATA PROTECTION OFFICER:
Name: {DPO Name}
Email: dpo@merline.io
Phone: {Phone}

We will provide further updates as the investigation progresses.

Sincerely,
{DPO Name}
Data Protection Officer
Merline
```

### 5.3 Press/Public Statement (if required)

```
STATEMENT FROM MERLINE REGARDING SECURITY INCIDENT

{Date}

Merline is aware of a security incident affecting our platform. Upon discovery, we immediately activated our incident response protocols and engaged our security team to investigate and contain the incident.

{1-2 paragraphs describing the incident at a high level without revealing security details}

We have notified affected customers and relevant regulatory authorities. We are committed to transparency and will provide updates as our investigation progresses.

For media inquiries: press@merline.io
```

---

## 6. Post-Incident Review

### 6.1 Review Process

| Step | Timeline | Responsibility |
|------|----------|----------------|
| Schedule PIR meeting | Within 5 business days of closure | IC |
| Gather evidence | Before PIR | Technical Lead |
| Timeline reconstruction | Before PIR | Scribe |
| Root cause analysis | PIR meeting | Team |
| Lessons identified | PIR meeting | Team |
| Remediation plan | PIR meeting + 2 days | IC |
| Remediation tracking | Quarterly review | Security Architect |

### 6.2 PIR Report Template

```markdown
# Post-Incident Review Report

## Incident Summary
- **Incident ID**: INC-{YYYY}-{NNN}
- **Severity**: SEV-{LEVEL}
- **Category**: {CATEGORY}
- **Date**: {DATE}
- **Duration**: {X hours Y minutes}
- **IC**: {NAME}

## Timeline
| Time (UTC) | Event | Actor |
|-------------|-------|-------|
| | | |

## Root Cause
{Description of the root cause}

## Impact
- Affected users: {N}
- Affected organizations: {N}
- Data compromised: {description}
- Service downtime: {X minutes}
- Regulatory risk: {description}

## What Went Well
{List}

## What Went Wrong
{List}

## Lessons Learned
{List}

## Remediation Items
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | | | | |

## Sign-off
- IC: {NAME} — {DATE}
- CTO: {NAME} — {DATE}
- CEO: {NAME} — {DATE}
```

---

## 7. Tabletop Exercise Schedule

| Exercise | Frequency | Participants | Scenario Examples |
|----------|-----------|--------------|-------------------|
| Basic breach notification | Quarterly | Security + Engineering | Phishing leads to account compromise |
| Ransomware simulation | Semi-annual | Full IR team | Encrypted databases, ransom note |
| AI incident | Semi-annual | Security + AI team | Prompt injection exfiltrates PII |
| Insider threat | Annual | Security + HR + Legal | Disgruntled employee exports data |
| Cloud provider failure | Annual | DevOps + Security + Engineering | Regional outage, DR activation |
| Supply chain attack | Annual | DevOps + Security | Compromised dependency in CI/CD |
| Social engineering | Annual | All employees | Targeted phishing against staff |

---

## 8. Incident Response Tools

| Tool | Purpose | Access |
|------|---------|--------|
| PagerDuty/Opsgenie | On-call alerting, escalation | Security + Engineering |
| SIEM (Wazuh/Splunk Cloud) | Log aggregation, correlation, alerting | Security team |
| Slack (#security, #incident-*) | Communication, coordination | All staff (monitor) |
| Jira/Linear | Incident tracking, remediation items | All staff |
| Confluence/Notion | PIR documentation, runbooks | All staff |
| 1Password/Vault | Credential rotation, access | Security + DevOps |
| AWS CloudTrail / K8s audit | Cloud activity logging | Security + DevOps |
| Forensic tooling (Autopsy/The Sleuth Kit) | Deep forensic analysis | Security team |
| VirusTotal | File/IOC analysis | Security team |
| MITRE ATT&CK framework | TTP mapping | Security team |

---

## 9. Key Metrics and SLAs

| Metric | Target | Calculation |
|--------|--------|-------------|
| Time to detect (TTD) | < 15 min (SEV-1), < 1 hour (SEV-2) | Incident start to first alert |
| Time to respond (TTR) | < 15 min (SEV-1), < 30 min (SEV-2) | Alert to first responder action |
| Time to contain (TTC) | < 1 hour (SEV-1), < 4 hours (SEV-2) | Containment action complete |
| Time to resolve (TTRes) | < 8 hours (SEV-1), < 24 hours (SEV-2) | Full recovery |
| Regulatory notification | < 72 hours (GDPR Art 33) | Breach discovery to regulator |
| Customer notification | < 24 hours (SEV-1 with data impact) | Confirmation to customer |
| PIR completion | < 5 business days | Incident closure to PIR |
| Remediation completion | < 30 days (High), < 7 days (Critical) | PIR to fix deployed |

---

## 10. Training and Awareness

| Training | Audience | Frequency | Format |
|----------|----------|-----------|--------|
| Phishing awareness | All employees | Quarterly | Simulated phishing + training |
| Incident response training | Engineering + Security | Semi-annual | Workshop |
| Tabletop exercises | IR team | Quarterly (SEV-1 scenarios) | Facilitated exercise |
| Secure coding | Engineering | Annual | Training course |
| Privacy awareness | All employees | Annual | Online training |
| AI safety | Engineers working on AI | Onboarding + annual | Training course |
| New hire security orientation | All new employees | Onboarding | Session |
| Regulatory compliance update | Leadership + Security | Annual | Briefing |

---

## 11. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Incident Commander model | Single IC per incident | Clear ownership, avoids confusion |
| Notification timeline | 72-hour regulatory (GDPR), 24-hour customer | Meets strictest regulatory requirement |
| Communication channels | Slack for internal, email for external | Speed vs. formality balanced |
| Forensic preservation | Cloud-native tools + traditional forensics | Covers both cloud and traditional evidence |
| PIR timeline | Within 5 business days | Fresh context, prompt remediation |
| Tabletop frequency | Monthly for SEV-1 scenarios | Keeps muscle memory current |
| SIM swap/SMS risk | Considered in MFA guidance | Documented in Identity Architecture |
