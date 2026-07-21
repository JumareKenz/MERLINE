# Merline System Administrator Guide

## Version: 1.0.0 | Owner: Security, Privacy & Compliance Architect | Status: Draft

---

## 1. Platform Overview

Merline is an AI-native MERL (Monitoring, Evaluation, Research, Learning) operating system. The platform serves organizations with:

- **Web Application** (Next.js): Research management, dashboards, administration
- **Mobile Application** (Flutter): Offline-first field data collection
- **Backend API** (Laravel/PostgreSQL): Core business logic
- **AI Services** (Python): Multi-model AI layer

### Key Architecture Decisions

| Aspect | Decision |
|--------|----------|
| **Multi-tenancy** | Schema-per-tenant (PostgreSQL) |
| **Authentication** | JWT (Sanctum) + OAuth2 (Passport) + SSO/SAML |
| **Authorization** | RBAC with 7 roles |
| **Data isolation** | Schema-level tenant isolation + RLS |
| **Encryption** | TLS 1.3 transit, AES-256 at rest, field-level PII encryption |
| **Audit** | Immutable, checksum-verified audit trail |

---

## 2. Organization Setup & Configuration

### 2.1 Creating an Organization

Organizations are created during user registration. As an admin, you can:

1. **Invite existing users** via `/organizations/{id}/members` endpoint
2. **Configure settings** at `/organizations/{id}/settings`:
   - Default language and timezone
   - Branding (logo, colors)
   - Feature flags
   - Data retention policies
   - AI model preferences

### 2.2 Organization Settings Reference

| Setting | Type | Description |
|---------|------|-------------|
| `locale` | string | Default language (ISO 639-1) |
| `timezone` | string | Default timezone (IANA) |
| `date_format` | string | Date display format |
| `retention_policy_days` | integer | Data retention in days |
| `ai_model_tier` | string | Default AI model tier |
| `feature_flags` | object | Per-org feature enable/disable |
| `sso_config` | object | SSO/SAML configuration |
| `branding` | object | Logo, primary color, favicon |

---

## 3. User Management & Roles

### 3.1 Role Hierarchy

| Role | Scope | Permissions |
|------|-------|-------------|
| **System Admin** | Global | All system operations, cross-tenant management |
| **Org Admin** | Organization | Full org control, user management, billing |
| **Program Manager** | Organization | Create projects, manage studies, view all data |
| **Researcher** | Organization | Design studies, create forms, analyze data |
| **Supervisor** | Study/Project | Manage field teams, review submissions |
| **Enumerator** | Assignment | Collect data via mobile app |
| **Donor Viewer** | Organization | Read-only access to dashboards and reports |

### 3.2 User Lifecycle

```
Invited → Active → Suspended → Deactivated
  │          │         │
  └──────────┴─────────┴──→ Deleted (after retention period)
```

### 3.3 Bulk User Operations

- **Invite**: CSV upload via Admin panel or API
- **Suspend**: Immediate loss of access, data preserved
- **Transfer**: Move user between organizations
- **Export**: User data export for compliance

---

## 4. Security Configuration

### 4.1 SSO/SAML Configuration

Supported providers: Azure AD, Okta, Google Workspace, OneLogin, Keycloak

**Setup steps:**
1. Navigate to Admin → Security → SSO
2. Select provider or "Custom SAML 2.0"
3. Enter:
   - Entity ID / Issuer URL
   - SSO URL (binding: HTTP-Redirect)
   - X.509 Certificate
   - Name ID format (default: emailAddress)
4. Map attributes: email, firstName, lastName
5. Test connection
6. Enable for organization

### 4.2 Multi-Factor Authentication (MFA)

| Method | Support | Notes |
|--------|---------|-------|
| TOTP (Authenticator app) | Yes | Google Authenticator, Authy, Microsoft Authenticator |
| SMS | Yes | Via Twilio/AT — carrier dependent |
| Email | Yes | Backup method |
| Hardware keys (WebAuthn) | Phase 2 | YubiKey, Titan |

**Enforcement:**
- Optional per role (recommended: all Admin+ roles)
- Mandatory for System Admin
- Configurable grace period (default: 7 days)

### 4.3 Audit Logs

All actions are logged immutably:

| Logged Events | Retention | Access |
|--------------|-----------|--------|
| All CRUD operations | 7 years | Org Admin, System Admin |
| Authentication events | 3 years | Security team |
| AI inferences | 90 days | Org Admin |
| Data exports | 3 years | Org Admin |
| Permission changes | 7 years | System Admin |

**Audit Log Query:**
```
GET /api/v1/admin/audit-logs?event_type=create&entity_type=study&from=2026-01-01&to=2026-07-18
```

### 4.4 Session Management

| Policy | Default |
|--------|---------|
| Session timeout | 30 minutes inactivity |
| Max concurrent sessions | 5 per user |
| Force logout all sessions | Supported |
| Device tracking | Yes (device name, last IP, last used) |

---

## 5. Data Management

### 5.1 Backup Strategy

| Backup Type | Frequency | Retention | Method |
|-------------|-----------|-----------|--------|
| Full database | Daily | 30 days | pg_dump (custom format) |
| WAL archiving | Continuous | 7 days | Point-in-time recovery |
| Schema backup | On request | On demand | pg_dump per tenant |
| Object storage | Daily | 30 days | S3 cross-region replication |

### 5.2 Restore Procedures

**Full database restore:**
```bash
# List available backups
aws s3 ls s3://merline-backups/production/db/

# Download and restore
aws s3 cp s3://merline-backups/production/db/merline-2026-07-18.dump .
pg_restore -d merline -U merline --clean --if-exists merline-2026-07-18.dump
```

**Point-in-time recovery:**
```bash
# Recover to specific timestamp
pg_restore --target-time "2026-07-18 14:30:00 UTC" \
  -d merline -U merline merline-backup.dump
```

**Per-tenant restore:**
```bash
pg_dump -n tenant_abc123 merline > tenant_abc123.dump
psql -d merline -c "DROP SCHEMA IF EXISTS tenant_abc123 CASCADE;"
psql -d merline < tenant_abc123.dump
```

### 5.3 Data Retention Policies

| Data Category | Active | Archived | Deleted |
|---------------|--------|----------|---------|
| Study responses | Study + 12 months | Compressed in S3 | After retention + 7 years |
| User data | Employment + 24 months | Anonymized | After 5 years |
| Audit logs | 12 months | S3 | After 7 years |
| Media files | Study + 12 months | Glacier | After 7 years |
| AI logs | 90 days | — | After 90 days |

### 5.4 Data Export for Compliance

- **DSAR (Data Subject Access Request)**: `/admin/export/user/{id}`
- **Full org data**: `/admin/export/organization/{id}`
- **Study data**: `/studies/{id}/export?format=csv`

---

## 6. Compliance Configuration

### 6.1 Supported Frameworks

| Framework | Status | Key Requirements |
|-----------|--------|-----------------|
| GDPR | Designed for compliance | Consent, DSAR, breach notification, DPO |
| SOC 2 Type II | Phase 2 target | Security, availability, confidentiality |
| NDPR (Nigeria) | Designed for compliance | Local data storage option |
| HIPAA (safeguards) | Aligned | Encryption, access controls, audit |
| IRB/Ethics | Embedded | Consent workflow, DPIA |

### 6.2 Compliance Checklist

- [ ] Data Processing Agreement (DPA) signed with sub-processors
- [ ] Data Protection Officer (DPO) designated
- [ ] Privacy notice published and accessible
- [ ] Consent management enabled on all studies
- [ ] Data retention policies configured per org
- [ ] Cross-border data transfer mechanism in place
- [ ] Breach notification procedure documented
- [ ] Security awareness training completed by all staff

### 6.3 Data Processing Agreements

Sub-processors requiring DPA:
- AWS / GCP / Azure (infrastructure)
- OpenAI / Anthropic / Google (AI models)
- Twilio / SendGrid (notifications)
- Sentry (error monitoring)

---

## 7. Monitoring & Alerting

### 7.1 Key Dashboards

| Dashboard | Metrics | Access |
|-----------|---------|--------|
| **Service Health** | Uptime, error rate, latency | Grafana |
| **Database** | Connections, query latency, replication lag | Grafana |
| **Queue** | Depth, processing time, failure rate | Laravel Horizon |
| **AI** | Token usage, cost, latency per model | LangFuse |
| **Sync** | Success rate, conflicts, device count | Custom dashboard |

### 7.2 Alert Thresholds

| Severity | Trigger | Channel |
|----------|---------|---------|
| **Critical** (Pager) | Service down, error rate > 5%, p99 latency > 2s | PagerDuty |
| **Warning** (Same day) | CPU > 80%, p95 latency > 1s, cert < 30 days | Slack |
| **Info** (Ticket) | Disk > 80%, old deployment | Jira |

### 7.3 Health Endpoints

```
GET /health              - Basic health (service up)
GET /health/db           - Database connectivity
GET /health/redis        - Redis connectivity
GET /health/queue        - Queue worker status
GET /health/ai           - AI model availability
GET /health/ready        - Readiness for traffic
```

---

## 8. Troubleshooting

| Issue | Likely Cause | Resolution |
|-------|-------------|------------|
| Users cannot login | SSO config changed | Check identity provider, verify SAML cert |
| Data sync failing | Network or queue backlog | Check sync queue depth in Horizon |
| Slow dashboard queries | Analytics replica lag | Verify CDC/lag, force view refresh |
| AI responses failing | Model API outage | Check fallback chain, verify API keys |
| Email not sending | SMTP config or rate limit | Check Mailgun/SendGrid logs |
| Reports not generating | Queue worker down | Restart Horizon workers |
| PDF export fails | Memory limit | Increase PHP memory in deployment config |

---

## 9. FAQ

**Q: How do I add a new organization?**
A: Organizations are created on registration. For manual creation, contact System Admin or use the API.

**Q: Can I customize the platform branding?**
A: Yes. Enterprise and Government tiers support custom logo, colors, and domain.

**Q: How do I run a compliance audit report?**
A: Navigate to Admin → Compliance → Generate Report. Covers GDPR, SOC 2, NDPR requirements.

**Q: What happens when storage limit is reached?**
A: Old media is archived to Glacier. Dashboard shows storage usage. Upgrade tier for more storage.

**Q: How do I handle a data breach?**
A: Follow the Incident Response Plan documented in `security/INCIDENT-RESPONSE.md`. Notify DPO within 72 hours (GDPR).

---

## 10. Related Documents

- [Documentation Architecture](ARCHITECTURE.md)
- [Compliance Map](../security/COMPLIANCE-MAP.md)
- [Security Architecture](../architecture/SYSTEM-ARCHITECTURE.md#6-security-architecture-summary)
- [DevOps Setup Guide](../devops/SETUP-GUIDE.md)
- [API Reference](API-REFERENCE.md)
- [Glossary](GLOSSARY.md)
