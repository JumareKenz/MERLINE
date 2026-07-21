# Merline Identity & Access Management Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Security Architect | Final |

---

## 1. Authentication Architecture

### 1.1 Authentication Flow Diagram

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Client   │     │  API Gateway  │     │  Identity   │     │   External   │
│ (Web/Mob) │     │  (Laravel)    │     │  Service    │     │   IdP (SSO)  │
└─────┬─────┘     └──────┬───────┘     └──────┬──────┘     └──────┬───────┘
      │                  │                     │                   │
      │  1. POST /login  │                     │                   │
      │─────────────────►│                     │                   │
      │                  │  2. Validate creds  │                   │
      │                  │────────────────────►│                   │
      │                  │                     │                   │
      │                  │  3. Check MFA       │                   │
      │                  │◄────────────────────│                   │
      │                  │                     │                   │
      │ 4. MFA Required  │                     │                   │
      │◄─────────────────│                     │                   │
      │                  │                     │                   │
      │ 5. Submit MFA    │                     │                   │
      │─────────────────►│                     │                   │
      │                  │  6. Verify MFA      │                   │
      │                  │────────────────────►│                   │
      │                  │                     │                   │
      │                  │  7. Issue tokens    │                   │
      │                  │◄────────────────────│                   │
      │                  │                     │                   │
      │ 8. Access+Refresh│                     │                   │
      │◄─────────────────│                     │                   │
      │                  │                     │                   │
      │ 9. SSO Redirect  │                     │                   │
      │───────────────────────────────────────────────────────────►│
      │                  │                     │                   │
      │ 10. AuthZ Code   │◄────────────────────────────────────────│
      │                  │                     │                   │
      │ 11. Exchange     │                     │                   │
      │─────────────────►│                     │                   │
```

### 1.2 Authentication Methods

| Method | Supported | Priority | Details |
|--------|-----------|----------|---------|
| Email/Password | Yes | P0 | Argon2id hashing, configurable password policy |
| MFA (TOTP) | Yes | P1 | Time-based one-time passwords via authenticator app |
| MFA (SMS) | Yes | P1 | Fallback method, SMS OTP |
| MFA (Backup codes) | Yes | P1 | 10 single-use backup codes on enrollment |
| SSO (SAML 2.0) | Yes | P2 | Enterprise identity provider integration |
| SSO (OIDC) | Yes | P2 | OpenID Connect for modern IdPs |
| OAuth 2.1 | Yes | P2 | Authorization code flow with PKCE |
| API Tokens (PAT) | Yes | P1 | Personal access tokens for programmatic access |
| Service Accounts | Yes | P2 | Machine-to-machine auth with client credentials |
| Magic Link (email) | Yes | P2 | Passwordless login for low-risk roles (viewers) |
| WebAuthn/FIDO2 | Planned | P2 | Passkeys for passwordless high-security auth |

### 1.3 Multi-Factor Authentication (MFA)

**MFA Policy Levels:**

| Level | Enforcement | Applicable Roles | Description |
|-------|-------------|------------------|-------------|
| MFA-0 | Disabled | Enumerator | Mobile device serves as possession factor |
| MFA-1 | Optional | Viewer, Guest | Recommended but not required |
| MFA-2 | Required | Researcher, Supervisor | TOTP required |
| MFA-3 | Required | OrgAdmin, ProjectManager | TOTP + either SMS backup or hardware key |
| MFA-4 | Required | SystemAdmin | TOTP + hardware key (WebAuthn) |

**MFA Enrollment Flow:**
1. User completes first-time password login
2. Application checks role-based MFA policy
3. If MFA required: forced enrollment before further access
4. User scans QR code with authenticator app
5. User submits one-time code to verify setup
6. Backup codes generated and displayed (user must save)
7. SMS added as secondary method for recovery (optional)

**MFA Recovery:**
- Backup codes (10 codes, single-use, regenerated on use)
- Admin-assisted reset (verified through organization admin)
- Account recovery with identity verification (email + phone)
- Grace period: 7 days for lost device, max one grace period per 90 days

### 1.4 Password Policies

| Policy | Default | Configurable (per org) |
|--------|---------|----------------------|
| Minimum length | 12 characters | Yes (8-128) |
| Require uppercase | Yes | Yes |
| Require lowercase | Yes | Yes |
| Require numbers | Yes | Yes |
| Require special chars | Yes | Yes |
| Maximum age | 90 days | No |
| Password history | 5 passwords | Yes (0-24) |
| Account lockout | 5 failures / 15 min | Yes |
| Lockout duration | 15 min (auto) or admin unlock | Yes |
| Password expiry warning | 14 days | Yes |
| Common password check | Yes (HaveIBeenPwned API) | Yes |
| Disallow username in password | Yes | No |
| Minimum password age | 1 day | Yes |

### 1.5 Account Recovery

**Forgot Password Flow:**
1. User requests password reset via email
2. System sends time-limited reset link (15 min TTL)
3. User selects new password (checked against policy + history)
4. All active sessions invalidated (except current device)
5. Notification sent to email: "Your password was changed"
6. Audit event: `PASSWORD_RESET`

**Account Lockout Recovery:**
1. Automatic unlock after lockout duration
2. Admin unlock via OrgAdmin or SystemAdmin
3. Self-service unlock via verified email
4. Audit event: `ACCOUNT_UNLOCK`

**Lost MFA Device:**
1. User submits recovery request
2. Email verification + knowledge-based verification
3. Admin approves reset (OrgAdmin)
4. All backup codes regenerated
5. New MFA enrollment required before next login
6. Audit event: `MFA_RESET`

---

## 2. Session Management

### 2.1 Session Types

| Session Type | Storage | TTL | Refresh | Use Case |
|-------------|---------|-----|---------|----------|
| Web Session | Redis | 24 hours | Slide (renewed on activity) | Browser-based usage |
| Mobile Session | Redis | 7 days | Refresh token rotation | Flutter app (offline-capable) |
| API Token | Hashed in DB | Configurable (30-365 days) | Manual rotation | Programmatic access |
| Service Account | Redis + DB | 1 hour | Client credentials grant | M2M communication |
| OAuth Session | Redis | 15 min (auth code) | N/A | SSO authorization flow |

### 2.2 Token Management

**JWT Structure:**

```json
{
  "sub": "uuid-v7-user-id",
  "org": "uuid-v7-tenant-id",
  "role": "org_admin",
  "permissions": ["study.create", "submission.view", ...],
  "session_id": "uuid-v7-session-id",
  "iat": 1700000000,
  "exp": 1700000900,
  "type": "access",
  "iss": "merline.io",
  "aud": "merline-api"
}
```

**Token Lifetime:**

| Token | Lifetime | Renewal | Revocation |
|-------|----------|---------|------------|
| Access Token | 15 minutes | Via refresh token | Immediate on session end |
| Refresh Token | 7 days | Rotation (old revoked on use) | Immediate on logout |
| Mobile Refresh | 30 days | Rotation with sliding expiry | Immediate on remote session kill |
| API Token (PAT) | User-defined (max 1 year) | Re-issue | Immediate on revoke |
| Auth Code (OAuth) | 10 minutes | Single-use | N/A |

**Token Rotation:**
- Refresh tokens use rotation: every refresh invalidates the previous refresh token
- If a compromised refresh token is used after the legitimate one, all tokens for that session are revoked
- Token families tracked in database for rotation chain detection

**Token Revocation:**
- Instant revocation via Redis blacklist
- All sessions invalidated on password change
- Session management UI allows per-session revocation
- Admin can revoke all sessions for a user
- Admin can revoke all sessions for an organization (emergency)

### 2.3 Session Management Dashboard

```
┌───────────────────────────────────────────────────────────┐
│  Active Sessions                     [Revoke All]          │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│  Device  │  Last IP │  Started │  Expires │  Actions       │
├──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Chrome   │ 192.0.2.1│ 14:30   │ 14:45    │ [Revoke]       │
│ Windows  │          │          │          │               │
├──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Flutter  │ 203.0.113│ 12:00   │ 12:00+7  │ [Revoke]       │
│ Pixel 8  │ .5       │          │          │               │
├──────────┼──────────┼──────────┼──────────┼───────────────┤
│ Safari   │ 198.51.10│ 14:15   │ 14:30    │ [Revoke]       │
│ Mac      │ 0.1      │          │          │               │
└──────────┴──────────┴──────────┴──────────┴───────────────┘
```

### 2.4 Device Management

| Feature | Supported | Phase |
|---------|-----------|-------|
| Device registration | Basic (device_id header) | P0 |
| Device naming | Yes (user-defined) | P1 |
| Known device tracking | Yes (cookie/browser fingerprint) | P1 |
| MFA trust per device | Yes (90-day trust) | P1 |
| Device limit per user | Configurable (default 10) | P2 |
| Device attestation | Planned (Android SafetyNet/iOS DeviceCheck) | P2 |
| Remote device wipe | Yes (app data, not OS) | P1 |

---

## 3. Single Sign-On (SSO)

### 3.1 Supported Protocols

| Protocol | Support | Details |
|----------|---------|---------|
| SAML 2.0 | Provider + SP | Metadata exchange, signed assertions |
| OpenID Connect | Provider + RP | Authorization code flow with PKCE |
| OAuth 2.1 | Provider + Client | For API authorization, device flow for mobile |

### 3.2 SAML Configuration

| Parameter | Description |
|-----------|-------------|
| Identity Provider metadata URL | Auto-configured from XML metadata |
| Entity ID | Per-organization unique entity |
| Assertion Consumer Service (ACS) URL | `/auth/saml/callback` |
| Name ID format | `emailAddress` (preferred) or `persistent` |
| Attribute mapping | Map IdP attributes to Merline user fields |
| Just-in-time provisioning | Create user on first SSO login (optional) |
| Role mapping | Map IdP groups to Merline roles |
| Signing | SAML requests signed, assertions encrypted |
| Session lifetime | IdP session lifetime respected |

### 3.3 SSO Provisioning Models

| Model | Description | Use Case |
|-------|-------------|----------|
| JIT (Just-In-Time) | User created on first SSO login | Less admin overhead |
| SCIM | User provisioned via SCIM API | Enterprise with HRIS integration |
| Manual | Admin creates user, SSO enabled | Controlled access |
| Hybrid | JIT + admin attribute update | Balance of convenience and control |

### 3.4 SSO Logout

| Type | Support | Description |
|------|---------|-------------|
| SP-initiated logout | Yes | User logs out of Merline, IdP session continues |
| IdP-initiated logout (SLO) | Yes | Single logout across all SPs from IdP |
| Local logout only | Configurable | Merline session ends, IdP session continues (default) |

---

## 4. API Authentication

### 4.1 Personal Access Tokens (PAT)

| Feature | Description |
|---------|-------------|
| Token format | `mer_pat_{random_hex_32}` prefix for scannable format |
| Storage | bcrypt hash of token in database |
| Scopes | Granular permission scopes (e.g., `submissions:read`, `studies:write`) |
| Expiration | User-defined, max 365 days |
| Rate limits | Higher than session tokens, tracked per token |
| Audit | Every API call with PAT logged with token ID |
| Rotation | Manual revoke/re-issue, no auto-rotation |
| Limit | 100 active PATs per user |

### 4.2 Service Accounts

| Feature | Description |
|---------|-------------|
| Purpose | Machine-to-machine communication |
| Auth flow | OAuth 2.1 Client Credentials grant |
| Scopes | Predefined permission sets per integration |
| Secret | 64-byte random secret, stored in Secrets Manager |
| Rotation | 90-day mandatory rotation, 7-day overlap |
| Rate limits | Independent of user rate limits |
| Audit | Full audit trail for all service account actions |
| Approval | Requires OrgAdmin approval to create |

### 4.3 OAuth 2.1 Authorization

| Feature | Description |
|---------|-------------|
| Grant types | Authorization code (PKCE), Client Credentials, Device Code |
| Scopes | `openid`, `email`, `profile`, `offline_access` + custom API scopes |
| Consent UI | Standard OAuth consent screen with scope listing |
| Client types | Confidential (server-side) and Public (mobile/SPA) |
| PKCE | Required for public clients |
| Token endpoint auth | `client_secret_basic`, `client_secret_post`, `private_key_jwt` |

---

## 5. API Key Management

| Lifecycle Stage | Procedure |
|-----------------|-----------|
| Generation | CSPRNG (random_bytes), base64 encoded, prefixed for type identification |
| Storage | Hashed with bcrypt (cost 12) before storage |
| Display | Shown once at creation, never retrievable again |
| Rotation | 90-day max for service accounts, user-defined for PATs |
| Revocation | Immediate invalidation via database flag + cache flush |
| Deactivation | Disabled after 90 days of non-use |
| Limit | Configurable per user, default 100 PATs |
| Monitoring | Alerts on >10% of monthly API calls from single token |

---

## 6. Identity Provisioning & Deprovisioning

### 6.1 User Lifecycle

```
Registration
  │
  ├── Email Verification Required
  │      │
  │      └── Verified ──► Active
  │
  ├── Admin Provisioned
  │      │
  │      └── Invitation Email ──► Accept ──► Active
  │
  └── SSO Provisioned
         │
         └── JIT Provisioning ──► Active
         
Active ──► Suspended (by admin, inactivity, policy violation)
  │          │
  │          └── Reactivated (by admin)
  │
  └── Deactivated (deletion request, termination, 365 days suspended)
         │
         └── Anonymized (GDPR right to erasure)
```

### 6.2 Deprovisioning Flow

| Event | Action | Timing |
|-------|--------|--------|
| User termination | Revoke all sessions, invalidate tokens, set status=suspended | Immediate |
| User deletion request | Anonymize personal data, retain audit records | 30 days |
| Organization deactivation | Suspend all users, prevent login | Immediate |
| Device loss | Revoke mobile session, remote wipe pending data | Immediate |
| Role change | Update permissions, invalidate cached permissions | Immediate |

---

## 7. Security Event Monitoring

### 7.1 Authentication Events Logged

| Event | Log Detail | Alert |
|-------|-----------|-------|
| Login success | User, IP, device, timestamp, MFA method | No |
| Login failure | User (or attempt), IP, reason | After 3 failures in 5 min |
| MFA failure | User, IP, MFA method | After 2 failures in 5 min |
| Password change | User, IP, initiated_by (user/admin) | Yes |
| Password reset | User, IP, method (email/admin) | Yes |
| Account lockout | User, IP, duration | Yes |
| Session revoke | User, admin (if applicable), session device | Yes (admin revoke) |
| New device login | User, device fingerprint, IP | Yes |
| Impossible travel | User, previous IP, new IP, timestamps | Yes |
| API token created | User, token name, scopes | Yes |
| API token revoked | User, token name | No |
| MFA enrollment | User, MFA method | Yes |
| MFA disabled | User, admin (if applicable) | Yes |

### 7.2 Anomaly Detection Rules

| Rule | Description | Action |
|------|-------------|--------|
| Impossible travel | Login from locations within impossible timeframe | Flag, MFA challenge, notify user |
| Credential stuffing pattern | Multiple rapid failed logins from different IPs | Blocklist IPs, CAPTCHA |
| Brute force | Same user, many passwords, short time | Lockout account |
| New geo-location | First login from new country/region | Email notification |
| Off-hours access | Access outside normal working hours (learned) | Soft flag |
| Token reuse anomaly | Stale token used after rotation chain broken | Revoke all tokens, force password change |
| API key burst | >10x normal API call volume | Temporary rate limit, alert admin |

---

## 8. Authentication Implementation Requirements

| Requirement | Phase | Owner |
|-------------|-------|-------|
| Password login with Argon2id | P0 | Backend |
| Email verification | P0 | Backend |
| Session management with Redis | P0 | Backend |
| Refresh token rotation | P0 | Backend |
| MFA (TOTP) enrollment and verification | P1 | Backend |
| MFA backup codes | P1 | Backend |
| Session management UI | P1 | Frontend |
| Device tracking | P1 | Backend |
| PAT generation and management | P1 | Backend |
| SAML 2.0 SSO | P2 | Backend |
| OIDC SSO | P2 | Backend |
| OAuth 2.1 authorization server | P2 | Backend |
| Service accounts | P2 | Backend |
| WebAuthn/FIDO2 | P2 | Backend |
| SCIM provisioning | P2 | Backend |
| Anomaly detection engine | P2 | AI Systems |

---

## 9. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Password hashing | Argon2id | Memory-hard, resistant to GPU/ASIC attacks, current OWASP recommendation |
| Token format | JWT (not opaque) | Self-contained, tenant claim eliminates DB lookup on every request |
| Token lifetime | 15 min access, 7 day refresh | Balances security (short-lived) with UX (infrequent re-auth) |
| Session storage | Redis | Fast, shared across instances, TTL-native, instant revocation via blacklist |
| MFA method | TOTP (not SMS-only) | TOTP is phishing-resistant, SMS is vulnerable to SIM swap |
| SSO protocol | SAML 2.0 + OIDC | SAML for enterprise (government, legacy), OIDC for modern IdPs |
| API key format | Hashed (bcrypt) | Never store plaintext, compromised DB doesn't leak keys |
| Account lockout | 5 failures / 15 min | Prevents brute force while minimizing support requests |
| Passwordless | Not in MVP | Email/password + MFA provides sufficient security; passkeys added in Phase 2 |
