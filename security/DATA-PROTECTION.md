# Merline Data Protection Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

---

## 1. Data Classification Schema

### 1.1 Classification Levels

| Level | Tag | Definition | Examples | Encryption Required | Retention (Default) |
|-------|-----|------------|----------|---------------------|---------------------|
| **Public** | `PUB` | No restriction on access or distribution | Project names, aggregated statistics, published reports, indicator libraries | No | Indefinite |
| **Internal** | `INT` | Organization-internal, not for public disclosure | Study methodologies, sampling plans, dashboard layouts, organization settings | No | 10 years |
| **Confidential** | `CONF` | Access limited to authorized roles on need-to-know basis | Raw survey responses (non-PII), GPS coordinates, enumerator performance data | TLS + AES-256 (at rest) | 7 years |
| **Restricted** | `REST` | Significant harm if disclosed; strict access control | PII (names, emails, phones), respondent IDs, consent records, audit logs | Field-level encryption (AES-256-GCM) | 7-10 years |
| **Highly Sensitive** | `HS` | Severe harm if disclosed; highest protection | Health/medical data, biometrics, child data, transcripts, coercion evidence, AI training data | Field-level + separate key + access logging | Per regulation (10+ years) |

### 1.2 Data Classification by Entity

| Entity | Classification | Rationale |
|--------|---------------|-----------|
| Organization name, slug, type | Public | Organization directory information |
| Project name, code, donor | Internal | Project management context |
| Study title, methodology | Internal | Research design, not sensitive |
| Indicator definitions | Internal | Methodological intellectual property |
| Questionnaire structure | Internal | Survey design intellectual property |
| Submission response values (non-PII) | Confidential | Primary research data |
| Submission GPS coordinates | Restricted | Can identify respondent location |
| Respondent ID | Restricted | Direct identifier linking to person |
| Enumerator name and contact | Restricted | Personnel data |
| Consent records | Restricted | Legal/ethical documentation |
| Health data responses | Highly Sensitive | Protected health information |
| Qualitative transcripts | Highly Sensitive | Contains personal narratives |
| Media files with identifiable people | Restricted | Visual/audio PII |
| Password hashes | Restricted | Authentication secrets |
| API keys/tokens | Restricted | System access credentials |
| Encryption keys | Highly Sensitive | Key material |
| Audit logs | Confidential | Security/operational records |
| AI inference logs | Internal (CONF if contains data) | AI operations |
| Billing data | Restricted | Financial information |

---

## 2. Encryption Strategy

### 2.1 Encryption Layers

```
┌────────────────────────────────────────────────────────┐
│  Layer 1: In Transit (TLS 1.3)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Layer 2: Infrastructure at Rest (AES-256)        │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │  Layer 3: Database Transparent Encryption   │   │  │
│  │  │  ┌──────────────────────────────────────┐   │   │  │
│  │  │  │  Layer 4: Field-Level Encryption     │   │   │  │
│  │  │  │  (AES-256-GCM, per-column keys)      │   │   │  │
│  │  │  └──────────────────────────────────────┘   │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 2.2 Encryption in Transit

| Component | Protocol | Ciphers | Certificate Source |
|-----------|----------|---------|-------------------|
| Client → API Gateway | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Let's Encrypt / cert-manager |
| API Gateway → Services | TLS 1.3 (mTLS Phase 2) | TLS_AES_256_GCM_SHA384 | Internal CA |
| Services → PostgreSQL | TLS 1.3 | TLS_AES_256_GCM_SHA384 | RDS CA / self-signed |
| Services → Redis | TLS (Redis 7+) | TLS_AES_256_GCM_SHA384 | Internal CA |
| Services → S3/MinIO | HTTPS | TLS_AES_256_GCM_SHA384 | Cloud provider / internal |
| Mobile → API | TLS 1.3 | TLS_AES_256_GCM_SHA384 | Public CA + pinning |
| Service → AI Provider | HTTPS | TLS 1.3 | Public CA |
| WebSocket | WSS (TLS 1.3) | TLS_AES_256_GCM_SHA384 | Same as API Gateway |

### 2.3 Encryption at Rest

| Storage Layer | Method | Key Management |
|---------------|--------|----------------|
| PostgreSQL data | AES-256 (RDS/cloud encryption) + TDE | Cloud KMS, auto-rotated |
| PostgreSQL backups | AES-256 (pg_dump encryption + S3 SSE) | Cloud KMS + backup key |
| Redis | AUTH + encrypted in-flight (no persistent data) | N/A (ephemeral) |
| S3/MinIO objects | SSE-S3 or SSE-KMS AES-256 | Cloud KMS with key rotation |
| EBS volumes | AES-256 (cloud provider) | Cloud KMS |
| Mobile local DB | SQLCipher / Isar encryption | Device-derived key + biometric |
| Mobile media cache | File-level AES-256 | Key in OS keychain |
| Backups (S3/Glacier) | AES-256 + client-side encryption | KMS + envelope encryption |
| Secrets | Encrypted at rest by provider | Vault / AWS Secrets Manager |

### 2.4 Field-Level Encryption

**Implementation Strategy:**

| Element | Detail |
|---------|--------|
| Algorithm | AES-256-GCM (authenticated encryption) |
| Key per tenant | One key per organization, stored in Secrets Manager |
| Key rotation | 90-day rotation with 7-day overlap (old key still decrypts) |
| Envelope encryption | Data key encrypted with master key, stored alongside ciphertext |
| Implementation | Laravel custom cast (`EncryptedCast`) |
| Scope | Columns flagged with `is_personal_data = true` |

**Encryption Flow:**

```
Write:
1. Application identifies PII column (is_personal_data = true)
2. Fetches tenant encryption key from Secrets Manager (cached locally, TTL 1 hour)
3. Generates random 12-byte IV (nonce)
4. Encrypts: AES-256-GCM(plaintext, key, iv) → ciphertext + auth tag
5. Stores: base64(iv + ciphertext + auth_tag)
6. Logs: PII write audit event

Read:
1. Application identifies PII column
2. Fetches tenant encryption key (cached)
3. Reads stored value: base64_decode → iv + ciphertext + auth_tag
4. Decrypts: AES-256-GCM(ciphertext, key, iv) → plaintext or fail
5. Logs: PII read audit event (for restricted data)
```

**Encrypted Columns:**

```php
class User extends Model
{
    protected $casts = [
        'email' => EncryptedCast::class . ':string',
        'phone' => EncryptedCast::class . ':string',
        'first_name' => EncryptedCast::class . ':string',
        'last_name' => EncryptedCast::class . ':string',
    ];
}

class ResponseValue extends Model
{
    protected $casts = [
        'value' => EncryptedCast::class . ':json',
    ];

    public function shouldEncrypt(): bool
    {
        return $this->question?->is_personal_data ?? false;
    }
}
```

### 2.5 Key Management

| Key Type | Storage | Rotation | Access |
|----------|---------|----------|--------|
| Master Encryption Key (MEK) | Cloud KMS (HSM-backed) | Annual | Key Admins only |
| Tenant Data Encryption Key (DEK) | Secrets Manager + envelope | 90 days | Identity Service only |
| JWT Signing Key | Secrets Manager | 30 days | API Gateway only |
| Database Password | Secrets Manager + IAM | 90 days | Applications via IAM |
| AI Provider API Keys | Secrets Manager | 90 days | AI Gateway only |
| OAuth Client Secrets | Secrets Manager | Per client | Identity Service |
| TLS Private Keys | cert-manager (K8s Secrets) | 90 days | Ingress controller |
| Mobile DB Key | OS Keychain + Biometric | Per device | Mobile app only |
| Object Storage Keys | IAM roles (preferred) or Secrets Manager | 90 days | Applications via IAM |

**Key Hierarchy:**

```
Cloud KMS (HSM) — Master Key
  └── Tenant MEK-1 ──── envelope ──── Tenant DEK-1 (encrypted with MEK-1)
  └── Tenant MEK-2 ──── envelope ──── Tenant DEK-2
  └── JWT Signing Key (encrypted with MEK-root)
  └── Database Credentials (encrypted with MEK-root)
```

---

## 3. PII Identification and Handling

### 3.1 PII Detection Points

| Detection Point | Method | Trigger |
|----------------|--------|---------|
| Question design | Manual flag (`is_personal_data = true`) | Researcher marks question as PII |
| AI-assisted detection | NLP analysis of question text | On question save, AI suggests PII flag |
| Import validation | Schema mapping identifies PII fields | During data import |
| Export filtering | Field-level permission check | On data export |

### 3.2 PII Handling Workflow

```
Question Design
  │
  ├── Researcher marks question as PII
  │     │
  │     ├── Automatic field-level encryption enabled
  │     ├── PII access audit logging activated
  │     ├── Export masking rules applied
  │     ├── Retention timer started
  │     └── Consent requirement checked
  │
  └── AI auto-detects potential PII
        │
        ├── Flagged for researcher review
        └── Researcher confirms/rejects PII classification

Data Collection
  │
  ├── PII values encrypted at write time
  ├── Media with identifiable content tagged
  └── Consent verified before PII collection

Data Access
  │
  ├── Role-based field masking applied
  ├── PII read logged in audit
  └── Bulk export of PII requires approval

Data Lifecycle
  │
  ├── PII retention timer enforced
  ├── Anonymization/pseudonymization on archive
  └── Secure deletion on retention expiry
```

### 3.3 PII Data Inventory

| Category | Data Elements | Location | Encryption | Retention |
|----------|--------------|----------|------------|-----------|
| Identity | Name, email, phone, photo | users table | AES-256-GCM | 5 years after last activity |
| Contact | Address, phone, email | users, submissions | AES-256-GCM | 5 years after study close |
| Demographic | Age, gender, ethnicity, income | response_values | Conditional (per question) | 7 years after study close |
| Biometric | Photo, voice recording, signature | media files (S3) | AES-256 + field-level | 7 years after study close |
| Health | Medical conditions, treatments, outcomes | response_values | AES-256-GCM | 10 years minimum |
| Location | GPS coordinates, geofence data | submissions | AES-256 (coordinate precision limited) | 7 years after study close |
| Behavioral | Survey responses, opinions, attitudes | response_values | Conditional | 7 years after study close |
| Identification | National ID, passport, respondent code | response_values | AES-256-GCM | 7 years after study close |
| Consent | Consent form, signature, date | consent_records | AES-256-GCM | 10 years |
| Device | Device ID, IP address, user agent | audit_events, submissions | Not stored in plaintext | 1 year |

### 3.4 PII Access Control Rules

| Role | View PII | Export PII | Modify PII | Delete PII | Notes |
|------|----------|------------|------------|------------|-------|
| SystemAdmin | Full | Full | Full | Full | Audited |
| OrgAdmin | Full | With approval | Through app only | With approval | Audited |
| ProjectManager | Full | With approval | Through app only | — | Audited |
| Researcher | Full | With approval | Through app only | — | Audited |
| DataManager | Full | With approval | — | — | Audited |
| ResearchAssociate | Masked | — | — | — | |
| FieldSupervisor | Masked | — | — | — | |
| Enumerator | Own collection only | — | Draft only | — | |
| QualityAssurance | Full | — | — | — | Read-only |
| EthicsOfficer | Full | — | — | — | Read-only |
| DonorViewer | Aggregated only | — | — | — | |
| Guest | Aggregated only | — | — | — | |

---

## 4. Data Retention and Purging

### 4.1 Retention Schedule by Data Class

| Data Class | Active Retention | Warm Storage | Cold Storage | Hard Delete | Legal Hold Override |
|------------|------------------|--------------|--------------|-------------|---------------------|
| Public | Indefinite | N/A | N/A | Never | N/A |
| Internal | Active period + archive | 3 years in DB | 7 years in S3 (compressed) | After 10 years | Yes |
| Confidential | Study + 1 year | 3 years in DB | 4 years in S3 (Parquet, encrypted) | After 7 years | Yes |
| Restricted | Study + 1 year | 3 years in DB (encrypted) | 4 years in S3 (Parquet, encrypted) | After 7 years | Yes |
| Highly Sensitive | Study + 2 years | 5 years in DB (encrypted) | 5 years in S3 (Parquet, encrypted) | After 10 years | Yes |

### 4.2 Entity-Level Retention

| Entity | Active Life | Archive | Delete | Legal Basis |
|--------|-------------|---------|--------|-------------|
| User accounts | Active + 24 mo inactivity | Anonymized after deactivation | 5 years post-deactivation | GDPR Art 5(1)(e) |
| Organizations | Active | Suspended → Archived | 7 years post-closure | Contractual |
| Projects | Active + 12 mo | Closed → Archived (S3) | 7 years post-closure | Donor requirement (USAID 7yr) |
| Studies | Active + 12 mo | Closed → Archived (S3) | 7 years post-closure | Research ethics |
| Questionnaires | Active + 12 mo | Archived version + indicator links | 7 years post-closure | Research reproducibility |
| Submissions | Study + 12 mo | Compressed + stored in S3 | 7 years post-closure | Data integrity |
| Response values | Study + 12 mo | Compressed + stored in S3 | 7 years post-closure | Data integrity |
| PII responses | Study + 12 mo | Anonymized in S3 | 7 years post-closure | GDPR minimization |
| Consent records | Study + 12 mo | Backup (encrypted) | 10 years | Research ethics, HIPAA |
| Media files | Study + 12 mo | Glacier after 3yr | 7 years | Research documentation |
| Audit logs | 3 mo hot / 12 mo warm | S3 Glacier after 12 mo | 7 years | Compliance (SOC 2, GDPR) |
| AI inference logs | 90 days | N/A | 90 days | Operational |
| Sessions/tokens | Until expiry | N/A | On expiry | Security |
| Vector embeddings | Active + 90d after deprecation | N/A | 90 days after source deleted | Operational |

### 4.3 Data Purging Implementation

**Archive → Purge Pipeline:**

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  Daily    │───▶│   Archive     │───▶│   Compress   │───▶│   S3     │
│  Check    │    │   Eligible   │    │   & Encrypt  │    │ Glacier  │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                                    │
                                                    ▼
                                             ┌──────────┐
                                             │  Delete   │
                                             │  from DB  │
                                             └──────────┘
```

**Implementation:**

```php
class DataRetentionService
{
    public function processRetention(): void
    {
        // Phase 1: Archive completed studies
        DB::table('studies')
            ->where('status', 'closed')
            ->where('updated_at', '<', now()->subMonths(12))
            ->chunk(100, fn($studies) => $this->archiveStudies($studies));

        // Phase 2: Anonymize PII beyond retention
        DB::table('response_values')
            ->join('questions', 'response_values.question_id', '=', 'questions.id')
            ->where('questions.is_personal_data', true)
            ->where('response_values.created_at', '<', now()->subYears(7))
            ->chunk(100, fn($values) => $this->anonymizeValues($values));

        // Phase 3: Hard delete past retention
        $this->purgeRecords('submissions', 7);
        $this->purgeRecords('audit_events', 7);
        $this->purgeRecords('consent_records', 10);

        // Phase 4: Cleanup AI logs
        DB::table('ai_messages')
            ->where('created_at', '<', now()->subDays(91))
            ->delete();
    }

    private function anonymizeValues($values): void
    {
        foreach ($values as $value) {
            // Replace with anonymized marker
            DB::table('response_values')
                ->where('id', $value->id)
                ->update([
                    'value' => json_encode(['anonymized' => true, 'original_type' => 'pii']),
                    'flagged' => true,
                    'flag_reason' => 'Anonymized by retention policy',
                ]);
        }
    }

    private function purgeRecords(string $table, int $years): void
    {
        $query = DB::table($table)
            ->where('deleted_at', '<', now()->subYears($years));

        $count = $query->count();
        if ($count === 0) return;

        Log::info("Purging {$count} records from {$table}");

        // Archive to S3 before deletion
        $query->chunk(1000, fn($records) => $this->archiveToS3($table, $records));

        // Hard delete
        $query->delete();
    }
}
```

### 4.4 Legal Hold

| Feature | Implementation |
|---------|---------------|
| Hold trigger | Legal request, investigation, audit |
| Scope | Specific data entities or entire organization |
| Duration | Until legal hold released |
| Enforcement | Flag in database prevents retention-based deletion |
| Notification | Legal hold applied notification to data owner |
| Audit | Legal hold events logged in audit |
| Release | Requires legal verification + approval |

---

## 5. Data Portability and Deletion

### 5.1 GDPR Right to Data Portability

| Requirement | Implementation |
|-------------|----------------|
| Format | JSON, CSV, Parquet (machine-readable) |
| Scope | Data provided by user + data generated from user activity |
| API endpoint | `GET /api/v1/account/export` |
| Request processing | Within 30 days (GDPR requires 30, target 7 days) |
| Authentication | Requires MFA re-verification |
| Delivery | Secure download link (expires 7 days) or direct S3 bucket |
| Audit | Export request and delivery logged |

### 5.2 GDPR Right to Erasure (Right to be Forgotten)

| Requirement | Implementation |
|-------------|----------------|
| Request channel | Self-service in account settings, support ticket, email |
| Verification | Identity verification before processing |
| Scope | Personal data only (not anoymized/aggregated data) |
| Exceptions | Legal obligation, public health, research archiving |
| Processing time | 30 days (extendable to 60 for complex requests) |
| Cascade | User → associated personal data → consent records |
| Anonymization | Option to anonymize instead of full deletion |
| Audit | Erasure request logged, confirmation sent to user |

**Erasure Flow:**

```
1. User submits erasure request
2. Identity verified (email + MFA or ID verification)
3. System identifies all personal data:
   - Direct: user table, profile, preferences
   - Related: submission PII, consent records, media
   - Derivative: audit logs (retained with user_id nulled)
4. Options presented:
   a) Full account deletion (all data)
   b) Anonymization (remove identifiers, keep contributions for research)
   c) Partial deletion (specific data categories)
5. User confirms choice
6. Processing:
   - Anonymize personal data in submissions (respondent_id → hash)
   - Nullify user references in audit logs
   - Soft-delete user account
   - Retain research data if anonymized
7. Confirmation sent to user
8. Hard deletion after retention period (7 years)
```

### 5.3 Data Portability Export Format

```json
{
  "export_metadata": {
    "user_id": "uuid",
    "requested_at": "2026-07-18T14:30:00Z",
    "format": "json",
    "version": "1.0"
  },
  "profile": {
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2025-01-15T08:00:00Z"
  },
  "studies": [
    {
      "study_id": "uuid",
      "title": "Baseline Survey 2025",
      "role": "researcher",
      "submissions_count": 0
    },
    {
      "study_id": "uuid",
      "title": "Endline KAP Survey",
      "role": "enumerator",
      "submissions": [
        {
          "submission_id": "uuid",
          "completed_at": "2026-03-15T10:30:00Z",
          "responses": [
            {"question_code": "Q01", "value": "42"},
            {"question_code": "Q02", "value": "Yes"}
          ]
        }
      ]
    }
  ],
  "consent_records": [...],
  "ai_conversations": [
    {
      "conversation_id": "uuid",
      "created_at": "2026-06-01T09:00:00Z",
      "messages": [
        {"role": "user", "content": "Draft a survey question for...", "created_at": "..."},
        {"role": "assistant", "content": "Here is a suggested question...", "created_at": "..."}
      ]
    }
  ]
}
```

---

## 6. Cross-Border Data Transfer

### 6.1 Data Residency Requirements

| Region | Requirement | Implementation |
|--------|-------------|----------------|
| EU/EEA | GDPR — data must stay in EU or Adequacy Decision country | EU hosting region, DPA with cloud provider |
| Nigeria | NDPR — data must be stored in Nigeria or adequacy jurisdiction | Nigeria hosting region or adequacy agreement |
| USA | No federal law, state laws (CCPA, etc.) | US hosting region, standard contractual clauses |
| Multi-region | Organization chooses data residency | Tenant-configurable region selection |

### 6.2 Transfer Mechanisms

| Scenario | Mechanism | Documentation |
|----------|-----------|---------------|
| EU → EU | No transfer | Data stays in EU region |
| EU → Adequacy country | Adequacy Decision | European Commission adequacy finding |
| EU → Third country | Standard Contractual Clauses (SCCs) | Signed DPA + SCCs with processor |
| Nigeria → Foreign | Consent + NDPR compliance | Data export agreement, consent |
| Global → US | Data Privacy Framework (DPF) | DPF certification |
| Intra-company | Binding Corporate Rules (BCRs) | BCRs approved by lead supervisory authority |

### 6.3 Data Residency Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Merline Platform Deployment                   │
│                                                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  EU Region    │   │  US Region   │   │  Nigeria     │  │
│  │  (Frankfurt)  │   │  (Virginia)  │   │  (Lagos)     │  │
│  │               │   │              │   │              │  │
│  │  EU customers  │   │  US customers │   │ NG customers │  │
│  │  GDPR applies  │   │  CCPA applies │   │ NDPR applies │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                   │          │
│         └──────────────────┼───────────────────┘          │
│                            │                              │
│                    Global Control Plane                    │
│              (Tenant routing, SSO, management)             │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Backup Protection

### 7.1 Backup Encryption

| Backup Type | Encryption Method | Key Management | Access Control |
|-------------|-------------------|----------------|----------------|
| Full database (pg_dump) | GPG + AES-256 | Separate backup key ring | DevOps + Security |
| WAL archive | AES-256 (S3 SSE-KMS) | Cloud KMS | Limited IAM role |
| Tenant schema export | GPG + AES-256 | Per-tenant backup key | OrgAdmin + DevOps |
| S3 objects | SSE-S3 or SSE-KMS | Cloud KMS | Application IAM |
| Configuration | SOPS (encrypted with age/AWS KMS) | Cloud KMS | DevOps |

### 7.2 Backup Access Control

| Principal | Full Backup | Tenant Backup | WAL Archive | Point-in-Time | Restore |
|-----------|-------------|---------------|-------------|---------------|---------|
| Database Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| DevOps Engineer | ✓ | — | ✓ | — | — |
| OrgAdmin | — | Own tenant only | — | — | Own tenant |
| Security Auditor | ✓ (read) | ✓ (read) | ✓ (read) | — | — |

---

## 8. Data Protection Impact Assessment (DPIA)

### 8.1 DPIA Trigger Events

| Trigger | Description | Required By |
|---------|-------------|-------------|
| New study collecting PII | Study flagged as PII-collecting | Researcher |
| New AI feature processing personal data | AI model receives PII | Product + Security |
| Third-party data sharing | Integration with external system | Product Manager |
| Cross-border data transfer | Data stored/processed in new region | OrgAdmin |
| Significant processing change | New data use case | Product Manager |
| Sensitive data category | Health, biometric, child data | Researcher |

### 8.2 DPIA Checklist

| Question | Required For |
|----------|--------------|
| What personal data is collected? | All studies |
| What is the lawful basis for processing? | All studies |
| Is the data necessary and proportionate? | All studies |
| What is the data retention period? | All studies |
| Who has access to the data? | All studies |
| Is data transferred across borders? | Cross-border studies |
| What technical controls protect the data? | All studies |
| What are the risks to data subjects? | PII studies |
| Is a Data Processing Agreement needed? | Third-party processors |
| How will data subjects exercise their rights? | GDPR-scoped studies |

---

## 9. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Encryption standard | AES-256-GCM (authenticated) | Prevents tampering, NIST-approved, faster than CBC |
| Key management | Cloud KMS + envelope encryption | Separates responsibilities, limits blast radius |
| PII detection | Manual flag + AI-assisted | Researcher knows context best; AI reduces misses |
| Data retention | Configurable per tenant with defaults | Different donors/regulations require different periods |
| Anonymization | Replace with irreversible hash + remove direct IDs | Preserves research value while protecting privacy |
| Cross-border | Region-based deployment + SCCs | Meets regulatory requirements for all target markets |
| Backup encryption | Client-side GPG + server-side KMS | Defense in depth for backup data |
