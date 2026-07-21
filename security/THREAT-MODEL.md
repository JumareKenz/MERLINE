# Merline Threat Model

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

## Methodology

- **Framework**: STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)
- **Risk Scoring**: Likelihood (1-5) × Impact (1-5) = Risk Score (1-25)
- **Review Cadence**: Quarterly threat model reviews; ad-hoc review for architecture changes
- **Scope**: All systems within Merline platform boundary including infrastructure, application, AI, mobile, and third-party integrations

---

## 1. Asset Inventory

### 1.1 Data Assets

| Asset ID | Data Asset | Classification | Location | Custodian |
|----------|-----------|---------------|----------|-----------|
| D-001 | User credentials (password hashes) | Restricted | PostgreSQL (public.users) | Identity Service |
| D-002 | PII (names, emails, phones) | Sensitive | PostgreSQL (encrypted columns) | Identity Service |
| D-003 | Survey responses | Confidential | PostgreSQL (tenant schema) | Data Collection Service |
| D-004 | GPS coordinates of respondents | Sensitive | PostgreSQL (PostGIS) | Data Collection Service |
| D-005 | Media files (photos, audio, video) | Sensitive | S3/MinIO object storage | Data Collection Service |
| D-006 | Consent records | Highly Sensitive | PostgreSQL (encrypted) | Data Collection Service |
| D-007 | Health/medical data | Highly Sensitive | PostgreSQL (encrypted) | Data Collection Service |
| D-008 | AI inference logs | Internal | PostgreSQL | AI Gateway |
| D-009 | Audit logs | Confidential | PostgreSQL (partitioned, append-only) | Identity Service |
| D-010 | API keys and tokens | Restricted | PostgreSQL (hashed) + Redis | Identity Service |
| D-011 | Encryption keys | Highly Sensitive | Secrets Manager / Vault | Platform Infrastructure |
| D-012 | Database connection strings | Restricted | Secrets Manager / Vault | Platform Infrastructure |
| D-013 | Session tokens | Restricted | Redis | Identity Service |
| D-014 | Indicator definitions | Internal | PostgreSQL | Study Service |
| D-015 | Study designs and methodologies | Internal | PostgreSQL | Study Service |
| D-016 | Vector embeddings | Internal | PostgreSQL (pgvector) | RAG Service |
| D-017 | Organization settings/configuration | Internal | PostgreSQL | Identity Service |
| D-018 | Qualitative transcripts | Sensitive | PostgreSQL (encrypted) | Data Collection Service |
| D-019 | Consent withdrawal data | Highly Sensitive | PostgreSQL (encrypted) | Data Collection Service |
| D-020 | Backup data (all of above) | Confidential | S3 (encrypted) | Platform Infrastructure |

### 1.2 System Assets

| Asset ID | System Asset | Description | Criticality |
|----------|-------------|-------------|-------------|
| S-001 | API Gateway | Entry point for all API requests | Critical |
| S-002 | Identity Service | Authentication, authorization, user management | Critical |
| S-003 | PostgreSQL Primary | Main OLTP database | Critical |
| S-004 | PostgreSQL Read Replicas | Analytics and read scaling | High |
| S-005 | Redis | Cache, session, queue, rate limiting | High |
| S-006 | AI Gateway | AI model routing and orchestration | High |
| S-007 | RAG Service | Embedding generation and vector search | Medium |
| S-008 | Object Storage (S3/MinIO) | Media, reports, documents | High |
| S-009 | Mobile App (Flutter) | Field data collection | High |
| S-010 | Web App (Next.js) | Researcher/manager interface | High |
| S-011 | Queue Workers (Laravel Horizon) | Async processing | High |
| S-012 | Kubernetes Cluster | Container orchestration | Critical |
| S-013 | CI/CD Pipeline (GitHub Actions) | Build and deploy | High |
| S-014 | DNS / CDN | Domain and content delivery | Medium |
| S-015 | Monitoring Stack | Observability | Medium |

### 1.3 Credential Assets

| Asset ID | Credential Asset | Storage | Rotation |
|----------|-----------------|---------|----------|
| C-001 | Database master password | Secrets Manager | 90 days |
| C-002 | Application encryption key | Secrets Manager | 90 days |
| C-003 | JWT signing secret | Secrets Manager + env | 30 days |
| C-004 | OAuth client secrets | Secrets Manager | Per client |
| C-005 | API keys (external services) | Secrets Manager | 90 days |
| C-006 | TLS certificates | cert-manager | 90 days (Let's Encrypt) |
| C-007 | AI model API keys | Secrets Manager | 90 days |
| C-008 | SMTP credentials | Secrets Manager | 90 days |
| C-009 | Object storage keys | Secrets Manager + IAM | 90 days |
| C-010 | CI/CD deployment keys | GitHub Secrets | 90 days |

### 1.4 AI Model Assets

| Asset ID | AI Asset | Type | Location |
|----------|----------|------|----------|
| A-001 | Prompt templates | Intellectual property | Prompt Registry |
| A-002 | RAG embeddings | Derivative data | pgvector |
| A-003 | AI fine-tuning datasets | Sensitive | S3 (ephemeral) |
| A-004 | Model evaluation datasets | Internal | S3 |
| A-005 | AI output cache | Internal | Redis |

### 1.5 Infrastructure Assets

| Asset ID | Infrastructure Asset | Provider | Criticality |
|----------|---------------------|----------|-------------|
| I-001 | Kubernetes control plane | Cloud provider | Critical |
| I-002 | Virtual network / VPC | Cloud provider | Critical |
| I-003 | Firewall / security groups | Cloud provider | Critical |
| I-004 | Load balancer | Cloud provider | High |
| I-005 | Container registry | Cloud provider | High |
| I-006 | Secrets backend | HashiCorp Vault / AWS SM | Critical |

---

## 2. Threat Agents

| Agent ID | Threat Agent | Motivation | Capability | Access |
|----------|-------------|------------|------------|--------|
| TA-01 | External Attacker (opportunistic) | Financial gain, data theft | Low-Medium | None |
| TA-02 | External Attacker (targeted) | Intelligence, competitive | High | None |
| TA-03 | Malicious Insider (employee) | Financial gain, revenge | Medium | Authorized |
| TA-04 | Malicious Insider (contractor) | Data theft | Low-Medium | Limited |
| TA-05 | Compromised User Account | Secondary attack | Varies | Compromised creds |
| TA-06 | Compromised Service Account | System-level access | High | API/token access |
| TA-07 | Nation-State Actor | Intelligence, disruption | Very High | Varies |
| TA-08 | Competitor Organization | Competitive intelligence | Medium | None |
| TA-09 | Ransomware Group | Financial extortion | High | None initially |
| TA-10 | AI Prompt Attacker | Model manipulation, data extraction | Medium | AI interface |
| TA-11 | Disgruntled Enumerator | Data manipulation, fraud | Low | Limited mobile |
| TA-12 | Third-Party Vendor | Supply chain attack | Medium | Integrated systems |

---

## 3. STRIDE Analysis by Component

### 3.1 API Gateway

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Attacker impersonates legitimate user via stolen JWT | 3×5=15 | Short-lived tokens (15min), refresh token rotation, MFA, token revocation |
| **Tampering** | Request modification in transit | 2×5=10 | TLS 1.3, request signing for webhooks, HMAC validation |
| **Repudiation** | User denies performing an action | 2×4=8 | Audit logging with checksums, IP/user-agent capture |
| **Information Disclosure** | API response leaks internal details | 3×4=12 | Structured error responses, no stack traces, response filtering |
| **Denial of Service** | API flooding from single source | 3×4=12 | Redis-based rate limiting (per user, per IP, per endpoint), WAF, auto-scaling |
| **Elevation of Privilege** | Horizontal/vertical privilege escalation | 4×5=20 | Policy enforcement per request, tenant isolation, resource ownership checks |

### 3.2 Identity Service

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Brute-force password guessing | 3×5=15 | Account lockout after 5 failures, rate limiting, Argon2id hashing, CAPTCHA |
| **Tampering** | Role/permission modification | 2×5=10 | Immutable audit, approval workflow for role changes, separation of duties |
| **Repudiation** | Admin denies granting access | 2×4=8 | Every permission change logged with before/after snapshot |
| **Information Disclosure** | User enumeration via registration/login | 3×3=9 | Generic error messages ("Invalid credentials"), rate-limited endpoints |
| **Denial of Service** | Mass account creation | 2×3=6 | Email verification required, rate limit per IP, captcha on registration |
| **Elevation of Privilege** | Role escalation via API manipulation | 3×5=15 | Server-side role validation, signed permission manifests, no client-trusted roles |

### 3.3 PostgreSQL Database

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Unauthorized database connection | 2×5=10 | Network-level ACLs, TLS client certs, IAM database auth |
| **Tampering** | Direct table modification bypassing app | 2×5=10 | RLS policies, limited DB roles, trigger-based audit |
| **Repudiation** | Data change without accountability | 2×5=10 | Database-level audit triggers, checksum verification |
| **Information Disclosure** | SQL injection via raw queries | 3×5=15 | Parameterized queries (Eloquent), SAST scanning, no raw SQL in production |
| **Denial of Service** | Resource exhaustion via expensive queries | 3×4=12 | Query timeouts (statement_timeout), connection pooling, monitoring |
| **Elevation of Privilege** | Schema cross-contamination | 2×5=10 | Schema-per-tenant isolation, search_path enforcement, separate DB roles |

### 3.4 Redis

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Unauthorized Redis access | 2×4=8 | Redis AUTH, network ACLs, TLS in transit |
| **Tampering** | Session data modification | 3×5=15 | Session signing, short TTL, server-side validation |
| **Repudiation** | Session misuse without trace | 1×3=3 | Session creation/termination logged in audit |
| **Information Disclosure** | Cache snooping for sensitive data | 3×4=12 | No PII cached unless encrypted, Redis ACL per application |
| **Denial of Service** | Cache flooding | 2×3=6 | Memory limits, eviction policies, monitoring |
| **Elevation of Privilege** | Cache poisoning for escalation | 2×4=8 | Signed cache entries, validate cached auth decisions |

### 3.5 AI Gateway

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Impersonating AI model provider | 2×4=8 | mTLS for model connections, API key per provider |
| **Tampering** | Prompt injection via user input | 4×5=20 | Input sanitization, output validation, guardrails, human review for critical actions |
| **Repudiation** | User denies sending AI prompt | 2×3=6 | All AI interactions logged with prompt, response, metadata |
| **Information Disclosure** | Training data extraction via prompt engineering | 3×5=15 | Rate limiting on AI calls, sensitive data filtering, no PII in prompts |
| **Denial of Service** | AI API cost exhaustion | 4×4=16 | Per-tenant usage limits, cost budgets, model fallback chain |
| **Elevation of Privilege** | AI system prompt override | 4×5=20 | Immutable system prompts, prompt version pinning, integrity checks |

### 3.6 Mobile App (Flutter)

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Device impersonation | 2×4=8 | Device registration, device attestation (future) |
| **Tampering** | Local data modification | 3×4=12 | Encrypted local DB (Isar encryption), integrity checks on sync |
| **Repudiation** | Offline submission dispute | 2×3=6 | Client-generated submission IDs, checksum verification at sync |
| **Information Disclosure** | Lost/stolen device data exposure | 4×5=20 | Encrypted local storage, remote wipe capability, auto-logout |
| **Denial of Service** | App crash during data collection | 3×4=12 | Partial save/resume, crash recovery, auto-save every question |
| **Elevation of Privilege** | Rooted/jailbroken device bypass | 3×4=12 | Root detection (optional per org), app integrity checks |

### 3.7 Web Application (Next.js)

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Session hijacking via XSS | 3×5=15 | CSP headers, HttpOnly cookies, XSS prevention (React), input sanitization |
| **Tampering** | DOM manipulation | 2×4=8 | React's virtual DOM, server-side validation, integrity checks |
| **Repudiation** | UI action without audit | 2×4=8 | Every state-changing API call audited server-side |
| **Information Disclosure** | Client-side data leakage | 3×4=12 | No PII in client bundle, data minimization in API responses, proper auth gates |
| **Denial of Service** | WebSocket connection exhaustion | 2×3=6 | Connection limits, reconnection backoff |
| **Elevation of Privilege** | Client-side permission bypass | 3×5=15 | Server-side authorization on every API call, never trust client-side checks |

### 3.8 Object Storage (S3/MinIO)

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Unauthorized bucket access | 2×5=10 | IAM roles, bucket policies, pre-signed URLs for time-limited access |
| **Tampering** | Media file modification | 2×4=8 | Server-side encryption, integrity checks (SHA-256), read-after-write consistency |
| **Repudiation** | File deletion without trace | 2×4=8 | S3 access logging, versioning enabled, MFA delete |
| **Information Disclosure** | Public bucket exposure | 3×5=15 | Block public access by default, S3 Block Public Access, monitoring for public ACLs |
| **Denial of Service** | Storage quota exhaustion | 2×3=6 | Per-tenant storage limits, lifecycle policies, notification at 80% |
| **Elevation of Privilege** | Cross-tenant file access | 2×5=10 | Tenant-prefixed paths, app-level authorization for all file access |

### 3.9 CI/CD Pipeline

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Fake commit/PR from unauthorized user | 2×4=8 | Branch protection, required PR reviews, signed commits |
| **Tampering** | Dependency injection via supply chain | 3×5=15 | Dependency lockfiles, Dependabot alerts, SBOM generation, vulnerability scanning |
| **Repudiation** | Unauthorized deployment | 2×3=6 | Deployment approvals, audit trail for all deploys |
| **Information Disclosure** | Secret leakage in CI logs | 3×4=12 | Secret masking in CI, no secrets in code, env-based secrets |
| **Denial of Service** | CI pipeline exhaustion | 1×2=2 | Self-hosted runners (controlled), concurrency limits |
| **Elevation of Privilege** | Pipeline privilege escalation to production | 3×5=15 | Separate deployment environments, no direct prod access from CI |

### 3.10 AI Model Provider (External)

| Threat Type | Threat Description | Risk (L×I) | Mitigation |
|-------------|-------------------|------------|------------|
| **Spoofing** | Fake AI model endpoint (DNS poisoning) | 2×5=10 | mTLS, certificate pinning, DNS security |
| **Tampering** | Model response manipulation | 3×5=15 | Response integrity validation, expected schema enforcement |
| **Repudiation** | Provider denies model output | 1×3=3 | Response logging, model version pinning |
| **Information Disclosure** | Data sent to AI model contains PII | 4×5=20 | PII filtering before model calls, data masking, DPA with provider |
| **Denial of Service** | AI provider outage | 3×4=12 | Multi-model fallback, local model (Llama) for critical paths |
| **Elevation of Privilege** | N/A | — | — |

---

## 4. Attack Trees

### 4.1 User Authentication Attack Tree

```
Goal: Compromise user account
├── 1.0 Credential Theft
│   ├── 1.1 Phishing attack
│   │   ├── 1.1.1 Email phishing for credentials
│   │   │   └── Mitigation: MFA, security awareness training, DMARC/SPF
│   │   └── 1.1.2 Clone of login page
│   │       └── Mitigation: WebAuthn/FIDO2, certificate pinning
│   ├── 1.2 Credential stuffing (breach reuse)
│   │   └── Mitigation: HaveIBeenPwned integration, MFA, rate limiting
│   ├── 1.3 Password guessing (targeted)
│   │   └── Mitigation: Account lockout, Argon2id, rate limiting
│   └── 1.4 Keylogger on device
│       └── Mitigation: MFA, device management, session anomaly detection
├── 2.0 Token Theft
│   ├── 2.1 XSS → session cookie theft
│   │   └── Mitigation: HttpOnly cookies, CSP, XSS prevention
│   ├── 2.2 Man-in-the-middle on unsecured network
│   │   └── Mitigation: TLS 1.3, HSTS, certificate pinning
│   └── 2.3 Mobile device compromise
│       └── Mitigation: Encrypted local storage, biometric unlock
├── 3.0 Session Hijacking
│   ├── 3.1 Session fixation
│   │   └── Mitigation: Regenerate session ID on login
│   └── 3.2 Session prediction
│       └── Mitigation: Cryptographically random tokens (Laravel)
└── 4.0 MFA Bypass
    ├── 4.1 SIM swap attack (SMS MFA)
    │   └── Mitigation: TOTP/authenticator app preferred over SMS
    ├── 4.2 MFA fatigue bombing
    │   └── Mitigation: Number matching, rate limiting on MFA requests
    └── 4.3 Backup code compromise
        └── Mitigation: Single-use codes, hashed storage
```

### 4.2 Data Submission Attack Tree

```
Goal: Submit fraudulent or manipulated data
├── 1.0 Submit fake responses
│   ├── 1.1 Bypass assignment controls
│   │   ├── 1.1.1 Modify assignment_id client-side
│   │   │   └── Mitigation: Server-side assignment verification
│   │   └── 1.1.2 Replay old submissions
│   │       └── Mitigation: Idempotency keys, timestamp validation
│   ├── 1.2 Automated submission script
│   │   └── Mitigation: API rate limiting, client behavior analysis, CAPTCHA
│   └── 1.3 GPS spoofing
│       └── Mitigation: GPS accuracy checks, geofence validation, consistency checks
├── 2.0 Manipulate existing data
│   ├── 2.1 Bypass immutability on submitted records
│   │   └── Mitigation: Database-level immutable enforcement, trigger-based blocking
│   └── 2.2 Submit data on behalf of another enumerator
│       └── Mitigation: Token-bound identity verification, session checks
├── 3.0 Extract data from offline storage
│   ├── 3.1 Physical device access
│   │   └── Mitigation: Encrypted local DB, app-level auth, remote wipe
│   └── 3.2 Backup extraction
│       └── Mitigation: Encrypted backups, limited backup scope on mobile
└── 4.0 Media manipulation
    ├── 4.1 Upload non-original photos
    │   └── Mitigation: Metadata analysis, checksum verification, AI authenticity checks
    └── 4.2 Replay media files
        └── Mitigation: Unique media identifiers, deduplication
```

### 4.3 AI Inference Attack Tree

```
Goal: Extract sensitive data via AI or manipulate AI output
├── 1.0 Prompt Injection
│   ├── 1.1 Direct injection in user input
│   │   ├── 1.1.1 System prompt override
│   │   │   └── Mitigation: Input sanitization, system prompt delimiter enforcement
│   │   └── 1.1.2 Instruction to reveal training data
│   │       └── Mitigation: Output filtering, rejection of meta-requests
│   ├── 1.2 Indirect injection via RAG context
│   │   └── Mitigation: Context sanitization, source trust scoring
│   └── 1.3 Multi-turn injection (gradual manipulation)
│       └── Mitigation: Conversation context analysis, anomaly detection
├── 2.0 Data Extraction
│   ├── 2.1 Prompt probing for PII in training data
│   │   └── Mitigation: No PII in training data, data minimization
│   ├── 2.2 Membership inference
│   │   └── Mitigation: Differential privacy techniques, limited model memory
│   └── 2.3 Context leakage across conversations
│       └── Mitigation: Tenant-isolated AI contexts, conversation boundaries
├── 3.0 Output Manipulation
│   ├── 3.1 Bias injection via system prompt
│   │   └── Mitigation: Prompt versioning, A/B testing, output evaluation
│   ├── 3.2 Hallucination exploitation
│   │   └── Mitigation: Fact-checking against knowledge base, confidence scoring
│   └── 3.3 Adversarial suffix attacks
│       └── Mitigation: Input/output filtering, guardrail models
└── 4.0 Denial of Wallet
    ├── 4.1 Cost exhaustion via massive AI queries
    │   └── Mitigation: Per-tenant budgets, rate limiting, cost alerts
    ├── 4.2 Expensive model selection
    │   └── Mitigation: Model routing based on request complexity, cost caps
    └── 4.3 Token waste via long contexts
        └── Mitigation: Context length limits, token budgeting
```

### 4.4 API Attack Tree

```
Goal: Unauthorized API access or data exfiltration
├── 1.0 Authentication Bypass
│   ├── 1.1 Missing auth on endpoint
│   │   └── Mitigation: Default-deny middleware, automated endpoint scanning
│   ├── 1.2 JWT manipulation
│   │   ├── 1.2.1 Algorithm confusion (none → HS256 → RS256)
│   │   │   └── Mitigation: Strict algorithm validation, key pinning
│   │   └── 1.2.2 Weak/leaked signing key
│   │       └── Mitigation: Key rotation, secrets management
│   └── 1.3 Token reuse across tenants
│       └── Mitigation: Tenant claim in JWT, validation on every request
├── 2.0 Authorization Bypass
│   ├── 2.1 IDOR (Insecure Direct Object Reference)
│   │   ├── 2.1.1 Access another organization's data
│   │   │   └── Mitigation: Tenant scope enforcement, organization_id validation
│   │   ├── 2.1.2 Access another study's data
│   │   │   └── Mitigation: Project/study membership checks
│   │   └── 2.1.3 Access another user's submissions
│   │       └── Mitigation: Resource ownership checks
│   ├── 2.2 Mass assignment
│   │   └── Mitigation: Laravel $fillable/$guarded, DTOs for complex writes
│   └── 2.3 Parameter tampering
│       └── Mitigation: Immutable fields server-side, validation
├── 3.0 Data Exfiltration
│   ├── 3.1 API response includes sensitive fields
│   │   └── Mitigation: API resources/transformers, field-level permissions
│   ├── 3.2 Pagination brute force
│   │   └── Mitigation: Rate limiting, max page size, pagination token
│   ├── 3.3 Export endpoint abuse
│   │   └── Mitigation: Export auditing, approval for large exports, rate limits
│   └── 3.4 GraphQL abuse (future)
│       └── Mitigation: Query depth limits, cost analysis, field restrictions
└── 4.0 SSRF
    └── Mitigation: Allowlist of outbound destinations, network segmentation
```

---

## 5. Risk Scoring Summary

### 5.1 High-Critical Risks (Score 15-25)

| Risk ID | Threat | Component | Score | Key Control |
|---------|--------|-----------|-------|-------------|
| R-001 | Prompt injection | AI Gateway | 20 | Input sanitization + output guardrails |
| R-002 | AI system prompt override | AI Gateway | 20 | Immutable prompts + integrity checks |
| R-003 | Privilege escalation (API) | API Gateway | 20 | Per-request authorization + tenant isolation |
| R-004 | Stolen device data exposure | Mobile App | 20 | Encrypted local storage + remote wipe |
| R-005 | AI cost exhaustion | AI Gateway | 16 | Per-tenant budgets + rate limiting |
| R-006 | PII sent to AI model | AI Gateway | 20 | PII filtering + data masking + DPA |
| R-007 | Credential theft (password) | Identity Service | 15 | MFA + Argon2id + rate limiting |
| R-008 | Supply chain dependency attack | CI/CD | 15 | SBOM + Dependabot + lockfiles |
| R-009 | SQL injection | PostgreSQL | 15 | Parameterized queries + SAST |
| R-010 | XSS → session theft | Web App | 15 | CSP + HttpOnly + React XSS prevention |
| R-011 | IDOR (cross-tenant data) | API Gateway | 15 | Tenant scope enforcement |
| R-012 | Session hijacking | API Gateway | 15 | Short-lived tokens + rotation |
| R-013 | Public bucket exposure | Object Storage | 15 | Block public access + monitoring |
| R-014 | Public bucket exposure | Object Storage | 15 | Block public access + monitoring |

### 5.2 Medium Risks (Score 8-14)

| Risk ID | Threat | Component | Score | Key Control |
|---------|--------|-----------|-------|-------------|
| R-015 | Cache poisoning | Redis | 12 | Signed cache entries |
| R-016 | API response data leakage | API Gateway | 12 | Response transformers |
| R-017 | Brute force enumeration | Identity Service | 9 | Generic error messages |
| R-018 | Request tampering | API Gateway | 10 | TLS + request signing |
| R-019 | Fake media uploads | Data Collection | 12 | File validation + metadata checks |
| R-020 | AI provider compromise | AI Gateway | 10 | mTLS + response validation |
| R-021 | Session data tampering | Redis | 15 | Session signing |
| R-022 | Audit log manipulation | PostgreSQL | 10 | Append-only + checksums |
| R-023 | Deployment pipeline abuse | CI/CD | 15 | Branch protection + approvals |
| R-024 | MFA bypass (SIM swap) | Identity Service | 12 | TOTP preferred over SMS |

### 5.3 Low Risks (Score 1-7)

| Risk ID | Threat | Component | Score | Key Control |
|---------|--------|-----------|-------|-------------|
| R-025 | CI pipeline exhaustion | CI/CD | 2 | Concurrency limits |
| R-026 | WebSocket flooding | Web App | 6 | Connection limits |
| R-027 | Redis DoS | Redis | 6 | Memory limits |
| R-028 | Backup location exposure | Infrastructure | 7 | Encrypted backups |
| R-029 | Service account misuse | Identity | 7 | Scoped tokens + audit |
| R-030 | DNS hijacking | Infrastructure | 7 | DNSSEC + monitoring |

---

## 6. Mitigation Mapping

### 6.1 Technical Controls

| Control ID | Control | Threat(s) | Implementation Priority |
|------------|---------|-----------|------------------------|
| TC-01 | Mutual TLS (mTLS) for service-to-service | Spoofing, tampering | P1 |
| TC-02 | WAF (Web Application Firewall) | SQLi, XSS, DDoS | P0 |
| TC-03 | Rate limiting (Redis token bucket) | DoS, brute force, enumeration | P0 |
| TC-04 | Input validation (Laravel FormRequest) | Injection, mass assignment | P0 |
| TC-05 | Output encoding / CSP | XSS | P0 |
| TC-06 | Parameterized queries (Eloquent) | SQL injection | P0 |
| TC-07 | Field-level encryption (Laravel casts) | PII disclosure | P0 |
| TC-08 | Schema-per-tenant isolation | Cross-tenant data access | P0 |
| TC-09 | Append-only audit with checksums | Repudiation, tampering | P0 |
| TC-10 | JWT with tenant claims | Authentication, tenant binding | P0 |
| TC-11 | Session signing and short TTL | Session hijacking | P0 |
| TC-12 | AI input sanitization/filtering | Prompt injection | P1 |
| TC-13 | AI output guardrails | Data leakage, harmful output | P1 |
| TC-14 | Encrypted mobile storage | Device compromise | P0 |
| TC-15 | Remote wipe capability | Lost device | P1 |
| TC-16 | MFA enforcement (configurable) | Credential theft | P1 |
| TC-17 | Secrets management (Vault/AWS SM) | Secret exposure | P0 |
| TC-18 | Container vulnerability scanning | Supply chain | P1 |
| TC-19 | Dependency scanning (Dependabot) | Supply chain | P0 |
| TC-20 | SAST (static analysis) | Code-level vulnerabilities | P0 |
| TC-21 | DAST (dynamic scanning) | Runtime vulnerabilities | P2 |
| TC-22 | Backup encryption | Backup compromise | P0 |
| TC-23 | Network segmentation (VPC/subnets) | Lateral movement | P0 |
| TC-24 | Geofence validation for GPS | GPS spoofing | P1 |
| TC-25 | AI cost budgets per tenant | Cost exhaustion | P1 |
| TC-26 | Prompt version pinning | System prompt override | P1 |
| TC-27 | API key hashing (bcrypt) | API key theft | P0 |
| TC-28 | Account lockout policy | Brute force | P0 |
| TC-29 | Session management dashboard | Session hijacking | P1 |
| TC-30 | Device management | Unauthorized devices | P2 |

### 6.2 Administrative Controls

| Control ID | Control | Threat(s) | Implementation Priority |
|------------|---------|-----------|------------------------|
| AC-01 | Security awareness training | Phishing, social engineering | P0 |
| AC-02 | Incident response plan | All | P0 |
| AC-03 | Vendor security assessment | Third-party compromise | P1 |
| AC-04 | Penetration testing (annual) | Unknown vulnerabilities | P1 |
| AC-05 | Threat modeling (quarterly) | Architecture flaws | P1 |
| AC-06 | Code review requirements | Code-level flaws | P0 |
| AC-07 | Separation of duties | Insider threat | P1 |
| AC-08 | Background checks (employees) | Insider threat | P2 |
| AC-09 | Access certification (quarterly) | Privilege creep | P2 |
| AC-10 | Data retention schedule | Legal/compliance | P0 |

### 6.3 Physical Controls

| Control ID | Control | Threat(s) | Implementation |
|------------|---------|-----------|----------------|
| PC-01 | Cloud provider SOC 2/ISO 27001 | Physical access | Cloud provider |
| PC-02 | MFA for cloud console | Cloud admin | Cloud provider |
| PC-03 | Audit logging for cloud API | Cloud activity | Cloud provider |
| PC-04 | Device management for employees | Endpoint security | Internal IT |

---

## 7. Residual Risks

| Risk | Rationale | Acceptance | Monitoring |
|------|-----------|------------|------------|
| AI model provider data retention | Cannot verify provider deletes prompts per our policy | Accepted with DPA requirement | Annual provider audit review |
| Zero-day in framework/language | Laravel/PHP zero-day could have broad impact | Accepted with compensating controls | Patch within 24 hours of CVE |
| Sophisticated nation-state attack | Cannot defend against all advanced persistent threats | Accepted with detection focus | Incident response, threat intel feed |
| Enumerator collusion/fraud | Social engineering between enumerators and respondents | Accepted with statistical detection | Anomaly detection algorithms |
| Cloud provider region failure | Multi-region not in Phase 1 | Accepted for MVP | Single-region with DR plan |

---

## 8. Threat Model Review Schedule

| Trigger | Action | Owner |
|---------|--------|-------|
| New feature or module | Threat model review | Security Architect + Feature Owner |
| New third-party integration | Security assessment + threat model | Security Architect |
| Major infrastructure change | Architecture review + threat model update | Security Architect + DevOps |
| Quarterly (scheduled) | Threat model refresh | Security Architect |
| After security incident | Post-incident threat model update | Security Architect |
| Annual | Full threat model reassessment | Security Architect + PSA |

---

## 9. Key Findings and Recommendations

### Critical Findings
1. **AI attack surface is the highest risk**: Prompt injection, data leakage, and cost exhaustion pose the greatest threats. AI safety controls (TC-12, TC-13, TC-25, TC-26) must be implemented before any AI features are enabled for users.
2. **Mobile device compromise is a credible, high-impact threat**: Offline data collection means sensitive data lives on devices. Encrypted storage (TC-14) and remote wipe (TC-15) are non-negotiable.
3. **Multi-tenancy demands rigorous isolation**: Schema-per-tenant is strong, but IDOR and tenant-scope validation (TC-10, R-011) must be verified at every API layer.
4. **Supply chain risk is elevated**: PHP/NPM/Dart dependencies, container images, and third-party model providers create multiple attack vectors. SBOM generation and automated scanning (TC-18, TC-19) are essential.

### Recommended Architectural Changes
1. **Add AI Guardrail Service**: A dedicated service (in-process or sidecar) that sanitizes inputs, validates outputs, and detects prompt injection before reaching AI models.
2. **Implement mTLS in Phase 1**: Service-to-service communication should use mTLS from the start — retrofitting is significantly harder.
3. **Add secretless database authentication**: Use IAM-based database auth (AWS RDS IAM) instead of static passwords to eliminate password rotation complexity.
4. **Introduce anomaly detection for authentication**: Deploy AI-powered anomaly detection for login patterns (new geolocation, impossible travel, credential stuffing indicators).
5. **Create a Data Protection Impact Assessment (DPIA) workflow**: Embed DPIA into the study creation process so researchers document data handling before collection starts.
