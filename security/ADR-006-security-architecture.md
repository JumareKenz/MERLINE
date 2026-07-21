# ADR-006: Security Architecture Decisions

## Status

Accepted

## Context

Merline requires a comprehensive security architecture that protects sensitive research data, supports multi-tenant isolation, enables global deployment across regulated regions, integrates AI features safely, and demonstrates compliance with GDPR, SOC 2, NDPR, HIPAA-inspired safeguards, and research ethics requirements.

Key security requirements:
- Multi-tenant isolation preventing cross-organization data leakage
- Field-level encryption for PII and sensitive data
- Authentication supporting MFA, SSO, and offline mobile
- Granular authorization across organization → project → study hierarchy
- Immutable audit trail with tamper detection
- AI safety including prompt injection prevention and data leakage protection
- Compliance with multiple regulatory frameworks
- Incident response capabilities
- Support for data subject rights (GDPR, CCPA, NDPR)

## Decision

### 1. Authentication Approach: JWT + Sanctum + OAuth 2.1

**Decision:** Use short-lived JWT access tokens (15 min) with longer-lived refresh tokens (7 days), issued via Laravel Sanctum for session-based auth and Passport for OAuth 2.1 flows.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Session-based (cookie) only** | Simpler but fails for mobile offline — mobile needs bearer tokens. |
| **OAuth 2.0 only** | Heavy for first-party web app. Adds unnecessary complexity. |
| **Auth0/Firebase Auth** | Third-party dependency for core auth. Vendor lock-in for customer identity. Higher cost at scale. GDPR data processing concerns. |
| **JWT + Sanctum** | Simple for first-party auth (Sanctum), OAuth 2.1 for third-party (Passport). Tokens work offline on mobile. Short-lived JWT limits blast radius. |

**Rationale:**
- JWT enables stateless auth validation at API Gateway without database round-trips
- Sanctum provides simple cookie-based SPA auth + token auth for mobile
- Passport provides enterprise OAuth 2.1 for SSO and API access
- Short-lived (15 min) access tokens minimize compromise impact
- Refresh token rotation detects token theft
- Tenant claim embedded in JWT enables request-scoped tenant resolution

**Key Trade-off:** JWT revocation requires a blacklist (Redis) since tokens are stateless. The blacklist check is fast (< 1ms) and acceptable given the security benefit.

### 2. Authorization Model: RBAC + Field-Level Permissions

**Decision:** Role-based access control (RBAC) as the primary authorization model with field-level access controls for PII/sensitive data. Tenant isolation via schema-per-tenant at database level plus Eloquent global scopes at application level.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Pure RBAC** | Simple but cannot handle field-level PII masking needed for research data. |
| **ABAC (attribute-based)** | Most flexible but complex to implement, maintain, and audit in Laravel. High cognitive load for permission assignment. |
| **ReBAC (relationship-based)** | Good for social/org chart patterns but over-engineered for MERL's org→project→study hierarchy. |
| **RBAC + field-level** | Balances simplicity (RBAC for 90% of cases) with precision (field-level for PII). |

**Rationale:**
- MERL domain has well-defined roles (researcher, enumerator, supervisor, etc.) that map naturally to RBAC
- Field-level masking handles the critical PII use case without ABAC complexity
- Schema-per-tenant provides database-level isolation; Eloquent scopes provide application-level enforcement
- Least privilege is enforced at every layer — API middleware, service layer, database scope

**Key Trade-off:** Field-level access control requires per-field mapping in API responses, adding development overhead for each new sensitive field. Mitigated by reusable masking rules.

### 3. Encryption Standards: AES-256-GCM Field-Level

**Decision:** Three-layer encryption — TLS 1.3 in transit, AES-256 at infrastructure rest, and AES-256-GCM with envelope encryption for field-level PII.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Infrastructure encryption only** | Fails to protect against insider database access or compromised application server. |
| **Database TDE only** | Protects storage but not application-level access. Same limitation. |
| **Application-level + infrastructure** | Defense in depth. Application-level encryption means even with DB access, PII remains encrypted. |

**Rationale:**
- Field-level encryption ensures PII is encrypted even if the database is compromised
- AES-256-GCM provides authenticated encryption (tamper detection)
- Envelope encryption (cloud KMS master key encrypts per-tenant data keys) enables key rotation without re-encrypting all data
- Per-tenant keys limit blast radius to one organization

**Key Trade-off:** Field-level encryption prevents database-side queries on encrypted fields. PII search requires decryption at application layer. Mitigated: Most PII searches are by user identity (email, name) which is indexed for exact match on the encrypted field via deterministic encryption, or by full-text search on non-PII fields.

### 4. Audit Architecture: Append-Only with SHA-256 Checksums

**Decision:** Immutable audit log implemented as an append-only partitioned PostgreSQL table. Every audit event includes a SHA-256 checksum computed over the row content. Periodic integrity verification detects tampering.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **File-based audit logs** | Difficult to query, not scalable, no relational context. |
| **Kafka event log** | Excellent for event streaming but adds operational complexity. Overkill for Phase 1. Deferred to Phase 2+. |
| **Append-only DB table + checksums** | Simple, queryable, tamper-evident. PostgreSQL partitioning handles retention. |
| **Blockchain/distributed ledger** | Over-engineered for this use case. No business requirement for distributed trust. |

**Rationale:**
- Append-only tables (trigger-enforced) prevent modification or deletion of audit records
- SHA-256 checksums enable independent verification of audit integrity
- PostgreSQL partitioning enables efficient retention management (drop old partitions)
- Monthly partitions align with retention policies (hot/warm/cold)
- Application-level + database-level audit triggers provide defense in depth

**Key Trade-off:** Checksum computation adds ~5ms per audit write. Acceptable for write-heavy tables. Mitigated: Async audit queue decouples audit writes from request lifecycle.

### 5. Compliance Framework Approach: Design-for-Compliance

**Decision:** Design the architecture to meet the strictest requirements across all target frameworks (GDPR, SOC 2, NDPR, HIPAA-inspired) from day one. Pursue formal SOC 2 Type II certification in Phase 2.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Build now, comply later** | Retrofit is significantly more expensive. May require architectural changes. Risk of non-compliance during early customer acquisition. |
| **Start with one framework** | GDPR chosen as baseline (strictest) — compliance with GDPR provides 80% coverage for other frameworks. Additional per-framework requirements mapped in compliance matrix. |
| **Certify from day one** | Too early — processes not mature enough for audit. Design for certification, pursue in Phase 2. |

**Rationale:**
- GDPR is the most comprehensive and strictest framework relevant to Merline's target markets
- Designing for GDPR compliance covers majority of SOC 2, NDPR, and HIPAA requirements
- Mapping all frameworks upfront prevents rework when certification is sought
- SOC 2 Type II certification targeted for Phase 2 when processes have matured

**Key Trade-off:** Building for compliance from day one increases initial development cost by approximately 15-20%. This is accepted as essential for a platform handling sensitive research data.

### 6. AI Safety Approach: Multi-Layer Defense

**Decision:** Implement a dedicated AI Guardrail service that provides input sanitization, prompt injection detection, output validation, and PII filtering. All AI traffic passes through guardrails before reaching external models.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **No guardrails (trust the model)** | Unacceptable for PII-handling platform. Model providers explicitly state prompts should not contain sensitive data (except OpenAI's zero-retention API). |
| **In-process guardrails** | Tightly coupled, hard to update independently, cannot scale independently. |
| **Third-party guardrail service** | Another vendor dependency. Data sent to guardrail provider may itself be sensitive. |
| **Dedicated sidecar/guardrail service** | Independent deployment, replaceable, auditable, scalable. Can use local models for sensitive data. |

**Rationale:**
- AI safety cannot be an afterthought — the platform handles health data, child data, and PII
- Guardrail service provides a clear security boundary: data is sanitized before leaving the platform
- Multi-layer approach (input, output, behavioral) covers different attack vectors
- Dedicated service enables independent team ownership and deployment
- Local models (Llama) provide a fallback for sensitive data that cannot be sent externally

**Key Trade-off:** Guardrail service adds latency (~100-500ms) to AI requests and 10-15% additional infrastructure cost. This is accepted as the cost of safe AI operations.

### 7. Multi-Tenancy Isolation: Schema-per-Tenant

**Decision:** PostgreSQL schema-per-tenant isolation with application-level row-level security via Eloquent global scopes.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Shared tables + tenant_id column** | Simple but higher risk of data leakage. Harder to backup/restore per tenant. Single table corruption affects all tenants. |
| **Database-per-tenant** | Best isolation but highest operational cost (connection pool per DB). Does not scale efficiently beyond ~50 tenants. |
| **Schema-per-tenant** | Best balance: strong isolation, single connection pool, easy per-tenant backup/restore, natural partition for data portability. |

**Rationale:**
- Schema-per-tenant provides database-level isolation preventing cross-tenant data access even in case of application bug
- Single database instance means efficient resource utilization and simplified operations
- Per-tenant backup/restore via pg_dump per schema
- Migration tooling (stancl/tenancy) automates schema creation and migration propagation

**Key Trade-off:** Schema-per-tenant means migrations must be applied across all tenant schemas (hundreds at scale). Mitigated: Automated migration propagation with locking protection and zero-downtime patterns.

### 8. Authentication for Mobile Offline: Cached Credentials + Refresh Token Rotation

**Decision:** Mobile authenticates once; encrypted credentials cached locally enable offline operation. Refresh token rotation with theft detection.

**Alternatives Considered:**

| Alternative | Evaluation |
|-------------|------------|
| **Online-only auth** | Breaks offline-first core requirement. Enumerators in remote areas cannot authenticate. |
| **Long-lived static tokens** | Compromised token has long window of abuse. No theft detection. |
| **Biometric-only offline** | Device-dependent. Not all field devices have biometric. Cannot handle device change. |
| **Cached refresh + rotation** | Short-lived access token (15 min) cached with encrypted refresh token. Rotation detects theft. |

**Rationale:**
- Offline authentication is non-negotiable for field operations
- Encrypted local storage (mobile device encryption + app-level encryption) protects cached credentials
- Refresh token rotation: each refresh invalidates previous refresh token — if stolen, the legitimate user's next refresh fails, triggering theft detection
- Access tokens are short-lived even offline (15 min from last online refresh)

**Key Trade-off:** If device is stolen and credentials are encrypted, attacker cannot authenticate. If device is unlocked and app is open, attacker has access until session expires. Mitigated: remote session revocation, remote wipe, device management.

## Consequences

### Positive
- **Defense in depth**: Multiple security layers protect against different attack vectors
- **Regulatory readiness**: Built for GDPR, SOC 2, NDPR from day one
- **Tenant confidence**: Schema-per-tenant + field-level encryption inspire trust
- **AI safety**: Multi-layer guardrails enable safe AI features
- **Auditable**: Everything is logged, integrity-checked, and reviewable
- **Portable**: Token-based auth works online and offline
- **Composable**: Security services are independently deployable and maintainable

### Negative
- **Development overhead**: Security-first design adds 15-20% to initial development cost
- **AI latency**: Guardrail service adds 100-500ms to AI requests
- **Operational complexity**: Multiple security services (guardrail, audit, PII filter) require operational attention
- **Key management burden**: Regular key rotation (30-90 days) requires automation and monitoring
- **Migration complexity**: Schema-per-tenant migrations require careful orchestration at scale

### Risks
- **Auth token theft detection false positives**: Token rotation chain breaks can occur from legitimate parallel requests (e.g., multiple browser tabs). Mitigation: 30-second grace window for token families.
- **Guardrail bypass**: Sophisticated prompt injection may evade detection. Mitigation: Continuous improvement based on red team findings, output validation as second line of defense.
- **Compliance scope creep**: Supporting all frameworks (GDPR + SOC 2 + NDPR + HIPAA + IRB) creates documentation burden. Mitigation: Aligned controls documentation, automated evidence collection.

## Affected Domains

Entire platform. All engineering teams, product management, operations, and executive leadership.

## Decision Owner

Security, Privacy & Compliance Architect (#12)

## Review Schedule

- Phase 1 delivery: Validate all security controls against implementation
- Phase 1 → Phase 2: AI guardrail effectiveness review, penetration test
- Phase 2: SOC 2 readiness assessment, access control effectiveness review
- Annual: Full security architecture review against evolving threats and compliance requirements
- Triggered: Review on any major architecture change, new third-party integration, or regulatory change

## References

- ADR-001: Technology Stack Selection
- ADR-002: System Architecture
- ADR-004: Data Architecture
- SECURITY-MODEL.md (Database Security)
- THREAT-MODEL.md
- IDENTITY-ARCHITECTURE.md
- PERMISSION-MATRIX.md
- DATA-PROTECTION.md
- COMPLIANCE-MAP.md
- AI-SECURITY.md
- INCIDENT-RESPONSE.md
