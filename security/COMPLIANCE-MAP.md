# Merline Compliance Framework Mapping

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

---

## 1. Compliance Framework Coverage Overview

| Framework | Scope | Coverage Status | Assessment Frequency |
|-----------|-------|-----------------|---------------------|
| GDPR (EU) | All EU data subjects | Designed for compliance | Annual |
| SOC 2 (Type II) | Security, Availability, Confidentiality | Designed for compliance | Annual |
| NDPR (Nigeria) | Nigerian data subjects | Designed for compliance | Annual |
| HIPAA-inspired | Health data | Security safeguards aligned | Annual |
| IRB/Ethics | Human subjects research | Embedded in workflow | Per study |
| CCPA/CPRA | California residents | Supported (data rights) | Annual |
| USAID ADS 201 | US government-funded projects | Reporting requirements | Per project |
| EU General Data Protection | EU-funded projects | Requirements supported | Per project |
| ISO 27001 | Information security management | Alignment planned (Phase 2) | Annual (Phase 2+) |

---

## 2. GDPR Compliance Mapping

### 2.1 GDPR Principles

| GDPR Article | Principle | Merline Control | Evidence |
|--------------|-----------|-----------------|----------|
| Art 5(1)(a) | Lawfulness, fairness, transparency | Consent management, DPIA workflow, privacy notice in registration | Consent records, DPIAs |
| Art 5(1)(b) | Purpose limitation | Data purpose flagged at collection (study-level), no secondary use without consent | Questionnaire metadata |
| Art 5(1)(c) | Data minimization | PII flagging at question level, optional data fields, configurable collection | Question design audit |
| Art 5(1)(d) | Accuracy | Validation rules, data quality checks, audit trail for corrections | Validation logs, audit events |
| Art 5(1)(e) | Storage limitation | Configurable retention, automated purging, legal hold | Retention policy, purge logs |
| Art 5(1)(f) | Integrity and confidentiality | TLS 1.3, AES-256, field-level encryption, RLS, RBAC | Encryption config, access logs |
| Art 5(2) | Accountability | Audit logging, DPIA, DPA with processors, compliance documentation | All audit logs |

### 2.2 Data Subject Rights

| GDPR Right | Article | Implementation | SLA |
|------------|---------|----------------|-----|
| Right to be informed | Art 13-14 | Privacy notice at registration, consent form before data collection | Always displayed |
| Right of access | Art 15 | Account data export UI, personal data dashboard | 30 days |
| Right to rectification | Art 16 | Profile edit, data correction with audit | 30 days |
| Right to erasure | Art 17 | Self-service account deletion, erasure request workflow | 30 days |
| Right to restrict processing | Art 18 | Account suspension, data freeze before resolution | 30 days |
| Right to data portability | Art 20 | Machine-readable data export (JSON, CSV) | 30 days |
| Right to object | Art 21 | Consent withdrawal, objection form | Immediate |
| Automated decision-making | Art 22 | AI insights flagged as AI-generated, human review required | Always |

### 2.3 GDPR Technical Controls

| Control | Implementation | Article |
|---------|---------------|---------|
| Consent management | Consent record per data subject, withdrawal support | Art 7 |
| Data Processing Agreement | DPA with all sub-processors (cloud, AI, email) | Art 28 |
| Data Protection Officer | Designated DPO contact, published privacy policy | Art 37 |
| Breach notification | 72-hour notification procedure | Art 33 |
| DPIA | Integrated into study creation workflow | Art 35 |
| Pseudonymization | Anonymization on archive, separate PII storage | Art 4(5) |
| Encryption | AES-256-GCM field-level, TLS 1.3 transit | Art 32 |
| Access controls | RBAC, tenant isolation, field-level permissions | Art 32 |
| Audit logging | Immutable, checksum-verified, 7-year retention | Art 5(2) |
| Data retention | Configurable, automated enforcement | Art 5(1)(e) |
| Cross-border transfer | SCCs, DPF, adequacy decisions | Art 44-49 |

---

## 3. SOC 2 Trust Principles

### 3.1 Security

| Control Area | Merline Implementation | Evidence |
|--------------|----------------------|----------|
| Logical access | RBAC, MFA, SSO, tenant isolation, API authentication | Access review logs |
| System monitoring | Prometheus, Grafana, Loki, audit events, anomaly detection | Monitoring dashboards |
| Change management | CI/CD with approvals, version control, automated testing | Deployment records |
| Risk management | Quarterly threat modeling, annual penetration testing | Threat model, pen test reports |
| Vulnerability management | Dependabot, SAST, dependency scanning, patch SLAs | Vulnerability reports |
| Incident response | IR plan, team structure, communication templates | IR plan, post-incident reviews |
| Encryption | TLS 1.3, AES-256 at rest, field-level encryption | Encryption configuration |

### 3.2 Availability

| Control Area | Merline Implementation | Evidence |
|--------------|----------------------|----------|
| Infrastructure | Kubernetes auto-scaling, multi-AZ deployment, load balancing | Uptime monitoring |
| Backup/Recovery | Daily backups, PITR, quarterly recovery drills | Backup logs, drill reports |
| Disaster recovery | Cross-region DR plan, RTO < 1hr, RPO < 5min | DR plan, test results |
| Monitoring | Health checks, synthetic monitoring, SLI/SLO tracking | Uptime reports |
| Capacity planning | Usage trends monitoring, auto-scaling triggers | Capacity reviews |

### 3.3 Confidentiality

| Control Area | Merline Implementation | Evidence |
|--------------|----------------------|----------|
| Data classification | 5-level classification applied to all data | Classification metadata |
| Access controls | RBAC + field-level permissions + tenant isolation | Permission matrix |
| Encryption | Data encrypted at rest and in transit | Encryption configuration |
| Data handling | Export masking, PII access logging, data minimization | Audit logs |
| Non-disclosure | Employee NDAs, vendor confidentiality agreements | HR records, DPAs |

### 3.4 Processing Integrity (Privacy)

| Control Area | Merline Implementation | Evidence |
|--------------|----------------------|----------|
| Data quality | Validation rules, quality checks, outlier detection | Quality reports |
| Processing accuracy | Audit trail for all data changes, immutable submissions | Audit logs |
| Error handling | Rejection with reason, resubmission workflow | Submission records |
| Timeliness | Collection timeline tracking, overdue alerts | Study dashboards |

---

## 4. NDPR (Nigeria) Compliance Mapping

### 4.1 NDPR Requirements

| NDPR Requirement | Merline Control | Status |
|------------------|-----------------|--------|
| Consent for data processing | Consent management module, withdrawal support | Implemented |
| Data minimization | PII-flagged questions, configurable collection | Implemented |
| Data retention restriction | Configurable retention, automated purge | Implemented |
| Data security (Art 4.1(6)) | Encryption, access controls, audit logging | Implemented |
| Data breach notification | 72-hour notification process | Implemented |
| Cross-border transfer | Consent + adequacy + SCC framework | Implemented |
| Data subject rights | Access, rectification, erasure, portability | Implemented |
| DPIA for high-risk processing | DPIA workflow in study creation | Implemented |
| Data Protection Officer | DPO designation, public contact | Implemented |
| Registration with NDPC | NDPC registration requirement noted | Organizational |
| Local data storage option | Nigeria hosting region option | Architecture |

### 4.2 NDPR Data Classification Alignment

| NDPR Classification | Merline Classification | Additional Controls |
|---------------------|----------------------|---------------------|
| Personal data | Restricted | Encryption, access logging |
| Sensitive personal data | Highly Sensitive | Encryption + separate key + logging |
| Anonymous data | Public | No additional controls |
| Pseudonymized data | Confidential | Minimal re-identification risk |

---

## 5. HIPAA-Inspired Safeguards

### 5.1 Administrative Safeguards

| HIPAA Standard | Merline Control |
|----------------|-----------------|
| Security management process | Risk management program, quarterly threat modeling |
| Assigned security responsibility | Security Architect role, CISO function |
| Workforce security | Background checks, role-based access, training |
| Information access management | RBAC, JIT access, access certification |
| Security awareness training | Annual security training for all staff |
| Security incident procedures | Incident Response Plan, team structure |
| Contingency plan | DR plan, backup strategy, BCP |
| Evaluation | Annual risk assessment, penetration testing |
| Business associate contracts | DPA with all sub-processors |
| Workforce clearance | Role-based privilege levels |

### 5.2 Physical Safeguards

| HIPAA Standard | Cloud Provider Responsibility |
|----------------|------------------------------|
| Facility access controls | SOC 2 Type II certified data centers |
| Workstation security | Cloud provider managed |
| Device and media controls | Encryption, secure disposal, data center security |

### 5.3 Technical Safeguards

| HIPAA Standard | Merline Implementation |
|----------------|----------------------|
| Access control | RBAC, unique user IDs, emergency access procedure |
| Audit controls | Immutable audit events with checksums |
| Integrity controls | SHA-256 checksums, append-only audit, submission immutability |
| Person/entity authentication | MFA, password policy, session management |
| Transmission security | TLS 1.3, encrypted API communication |
| Automatic logoff | Session timeout (30 min inactivity) |
| Encryption and decryption | AES-256-GCM field-level encryption |

### 5.4 Policies and Procedures

| Requirement | Implementation |
|-------------|----------------|
| Privacy policy | Published, covers all HIPAA-required elements |
| Breach notification | 60-day notification (HIPAA), 72-hour (GDPR) — 60-day followed |
| Minimum necessary | Field-level access controls enforce minimum necessary |
| Patient access | Data subject access request workflow |
| Accounting of disclosures | Audit log query for data disclosures |

---

## 6. IRB / Research Ethics Compliance

### 6.1 IRB Requirements

| Requirement | Merline Support |
|-------------|-----------------|
| Protocol submission | Study design exports as protocol document |
| Informed consent | Consent module with documentation |
| Consent forms | Generation, storage, withdrawal tracking |
| Risk/benefit assessment | DPIA integrated into study setup |
| Confidentiality assurances | Encryption, access controls documented |
| Data security plan | Security architecture documentation available |
| Vulnerable population protections | Ethics flag in study configuration |
| Continuing review | Study status workflow with review gates |
| Adverse event reporting | Incident response integrated into platform |
| Data monitoring | Quality checks, audit trails |

### 6.2 Consent Module Design

| Feature | Description |
|---------|-------------|
| Consent form builder | Create language-appropriate, literacy-appropriate consent forms |
| Multi-language | Consent in local language + official language |
| Witness signature | Support for verbal consent with witness |
| Media consent | Separate consent for photos/audio/video |
| Assent forms | Age-appropriate assent for child participants |
| Consent tracking | Record who, when, what version, how |
| Withdrawal management | Right to withdraw, data handling on withdrawal |
| Expiry management | Re-consent requirement on form changes |
| Audit trail | Complete consent lifecycle auditing |

---

## 7. Cross-Border Data Handling Framework

### 7.1 Data Flow Classification

| Flow Type | Description | Mechanism |
|-----------|-------------|-----------|
| EU → EU | Data stays within EU region | No transfer |
| EU → Adequacy country | Andorra, Argentina, Canada, Japan, NZ, Switzerland, UK, Uruguay, South Korea | Adequacy Decision |
| EU → US | DPF-certified organization | Data Privacy Framework |
| EU → Third country | No adequacy decision | Standard Contractual Clauses |
| Nigeria → Foreign | Data export from Nigeria | Consent + NDPR registration |
| Global intra-organization | Different regional deployments | BCRs or equivalent |

### 7.2 Data Processing Agreements

| Sub-Processor | Service | DPA Status |
|--------------|---------|------------|
| AWS / GCP / Azure | Cloud infrastructure | Signed DPA available |
| OpenAI | AI model provider | Signed DPA (commercial) |
| Anthropic | AI model provider | Signed DPA (commercial) |
| Google (Gemini) | AI model provider | Signed DPA (GCP) |
| Twilio / AT | SMS notifications | Signed DPA available |
| SendGrid / Mailgun | Email delivery | Signed DPA available |
| Sentry | Error monitoring | Signed DPA (EU hosting) |
| GitHub (Actions) | CI/CD | Signed DPA available |

### 7.3 Data Residency by Organization Type

| Organization Type | Default Region | Configurable |
|------------------|---------------|--------------|
| EU-based NGO | Frankfurt (EU) | Yes |
| US-based NGO | Virginia (US) | Yes |
| Nigerian government | Lagos (Nigeria) | Yes |
| UN Agency | Frankfurt + Virginia | Yes |
| Global organization | Multi-region per tenant setting | Yes |

---

## 8. Audit Evidence Collection

### 8.1 Evidence Types

| Evidence Type | Source | Retention | Format |
|---------------|--------|-----------|--------|
| Audit events | PostgreSQL (audit_events) | 7 years | Database query |
| Access logs | Redis + PostgreSQL | 1 year | Database query |
| Change management | GitHub | Life of repository | GitHub API |
| Deployment records | GitHub Actions | Life of repository | Workflow logs |
| Vulnerability scans | Dependabot, Snyk | 2 years | Report export |
| Penetration test reports | External vendor | 2 years | PDF |
| Risk assessments | Internal | 3 years | Document |
| Security training records | LMS | Duration of employment | HR system |
| Incident reports | Internal | 7 years | Document |
| DPIAs | Internal | 10 years | Document |
| Data processing register | Internal | Current + 3 years | Database |
| Consent records | PostgreSQL | 10 years | Database query |
| Backup verification logs | S3 + cron | 1 year | Log files |

### 8.2 Audit Evidence Collection Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Audit event integrity check | Daily | Automated |
| Access review | Quarterly | Security Architect |
| Vulnerability report generation | Weekly | DevOps |
| Penetration testing | Annual | External vendor |
| Risk assessment | Quarterly | Security Architect |
| DPIA review | Per study | Researcher + Security |
| SOC 2 readiness assessment | Annual | Security Architect |
| GDPR compliance check | Annual | DPO |
| NDPR compliance check | Annual | DPO / Local counsel |
| Incident response drill | Semi-annual | Security Architect |
| Backup recovery drill | Quarterly | DevOps |
| Vendor security review | Annual | Security Architect |

### 8.3 Compliance Documentation Repository

```
/compliance/
  /policies/
    - information-security-policy.md
    - data-protection-policy.md
    - acceptable-use-policy.md
    - incident-response-policy.md
    - business-continuity-policy.md
  /dpias/
    - DPIA-2025-001-baseline-survey.pdf
  /audits/
    - SOC2-readiness-2025-Q2.pdf
  /pen-tests/
    - pen-test-2025-annual.pdf
  /training/
    - security-awareness-training-2025.pdf
  /dpas/
    - dpa-aws-2025.pdf
    - dpa-openai-2025.pdf
  /risk/
    - risk-register-2025-Q2.pdf
```

---

## 9. Compliance Dashboard

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data retention compliance | 100% | Automated purge logs |
| Consent records complete | 100% | Submission vs consent match |
| PII fields encrypted | 100% | Column encryption scan |
| Audit event integrity | 100% | Checksum verification |
| Vulnerability SLA | Critical: 24h, High: 7d | Patch tracking |
| MFA adoption (admin+) | 100% | User MFA status |
| Penetration test findings | Critical: 0, High: 0 | Test report |
| Security training completion | 100% | Training records |
| Access certification completion | 100% | Quarterly certification |
| Recovery drill success | 100% | Drill reports |
| Incidents investigated | 100% | Incident records |
| DPIAs completed | 100% for trigger events | DPIA registry |

---

## 10. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compliance framework priority | GDPR > SOC 2 > NDPR > HIPAA | GDPR has strictest requirements; SOC 2 is most market-requested; NDPR for primary market |
| Certification timing | SOC 2 Type II in Phase 2 | Too early for certification in Phase 1; design for it from day one |
| Audit evidence | Automated collection | Manual evidence collection doesn't scale; automated reduces human error |
| Data residency | Per-tenant configurable region | Different customers have different legal requirements |
| Consent management | Built-in, not third-party | Consent is core to research ethics, cannot outsource |
