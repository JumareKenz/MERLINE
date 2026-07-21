# Security Testing Plan — Phase 1 (MVP)

## Testing Approach

Security testing is integrated into the development lifecycle, not a separate phase:

1. **Static Analysis (SAST)**: Run on every PR (PHPStan, ESLint security plugins)
2. **Dependency Scanning**: Dependabot + `npm audit` + `composer audit`
3. **Dynamic Analysis (DAST)**: OWASP ZAP on staging
4. **Container Scanning**: Trivy on all Docker images
5. **Manual Penetration Testing**: Quarterly engagement

## 1. Authentication Testing

### Test Cases

| Scenario | Test | Expected |
|----------|------|----------|
| Brute force | 100 rapid login attempts | Rate limited after 5 failures; account locked after 10 |
| Token expiration | Use token after expiry | 401 response |
| Token tampering | Modify JWT payload | Signature invalid; 401 response |
| Refresh token reuse | Use refresh token twice | Second use invalidates both tokens |
| Session fixation | Pre-set session cookie | Server generates new session on login |
| MFA bypass | Use password-only flow when MFA enabled | 403 response |
| Password strength | Test all password rules | Min 8 chars, 1 upper, 1 digit, 1 special |
| Email enumeration | Login with known vs unknown email | Same error message for both |
| Registration | Create account with org invite token | Org-scoped token required |
| Logout | POST /auth/logout | Token revoked; cannot reuse |

```php
public function test_brute_force_protection(): void
{
    for ($i = 0; $i < 10; $i++) {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'user@org.com',
            'password' => 'wrong_password_' . $i,
        ]);
    }

    // 11th attempt should be rate limited
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'user@org.com',
        'password' => 'wrong_password_11',
    ]);

    $response->assertStatus(429);
}

public function test_jwt_tampering_rejected(): void
{
    $token = $this->authenticate();
    $tampered = $token . 'tampered';

    $response = $this->withHeader('Authorization', "Bearer {$tampered}")
        ->getJson('/api/v1/studies');

    $response->assertStatus(401);
}
```

## 2. Authorization Testing

### Test Cases

| Scenario | Test | Expected |
|----------|------|----------|
| Cross-tenant access | Org A user accesses Org B resources | 403 |
| Role escalation | Enumerator tries admin endpoint | 403 |
| IDOR | User modifies URL parameter to access other user's data | 403 |
| Horizontal privilege | Enumerator views other enumerator's submissions | 403 |
| Vertical privilege | Researcher creates org-level settings | 403 |
| Deleted user | Deleted user accesses API | 401 |
| Suspended user | Suspended user attempts action | 403 |
| Guest access | Unauthenticated access to private endpoints | 401 |

```php
public function test_cross_tenant_isolation(): void
{
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();
    $user = User::factory()->create();
    $user->organizations()->attach($orgA, ['role' => 'admin']);

    $this->actingAs($user);

    // Try to access Org B's studies
    $studyB = Study::factory()->create(['organization_id' => $orgB->id]);
    $response = $this->getJson("/api/v1/studies/{$studyB->id}");

    $response->assertStatus(403);
}

public function test_idor_prevention(): void
{
    $study1 = Study::factory()->create();
    $study2 = Study::factory()->create();
    $user = User::factory()->create();
    $user->organizations()->attach($study1->organization, ['role' => 'researcher']);

    $this->actingAs($user);

    // Try to access study in different org
    $response = $this->getJson("/api/v1/studies/{$study2->id}");
    $response->assertStatus(403);
}
```

## 3. Injection Testing

### SQL Injection
- All Eloquent queries use parameterized queries (inherently safe)
- Audit all raw DB::select/statement calls
- Test raw queries with malicious input: `' OR 1=1 --`, `'; DROP TABLE users; --`

### XSS (Cross-Site Scripting)
- Form inputs: Question text, report content, user profile fields
- Rich text editor outputs sanitized with DOMPurify
- All user content escaped in React (automatic with JSX)
- CSP headers: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`

```typescript
// Playwright XSS test
test('form title does not render unescaped HTML', async ({ page }) => {
  await page.goto('/questionnaires/new');
  await page.fill('[name="title"]', '<script>alert("XSS")</script>');
  await page.click('text=Save');
  await page.goto('/questionnaires/1/preview');
  await expect(page.locator('h1')).toHaveText('<script>alert("XSS")</script>');
  // Should NOT show an alert dialog
});
```

### CSRF
- Laravel automatically applies CSRF protection to web routes
- API routes use token-based auth (no CSRF needed)
- Verify `csrf_token()` mismatch returns 419

### SSRF (Server-Side Request Forgery)
- All outbound HTTP requests go through allow-listed domains
- Webhook URLs validated against allow list
- File download URLs restricted to trusted domains
- Metadata parsing does not follow redirects

## 4. API Security Testing

### Rate Limiting

| Endpoint | Limit | Window | Test |
|----------|-------|--------|------|
| /api/v1/auth/login | 5 attempts | 1 min | Exceed → 429 |
| /api/v1/sync/push | 100 requests | 1 min | Exceed → 429 |
| /api/v1/dashboards | 30 requests | 1 min | Exceed → 429 |
| /api/v1/submissions | 60 requests | 1 min | Exceed → 429 |
| /api/v1/* (default) | 120 requests | 1 min | Exceed → 429 |

```php
public function test_sync_endpoint_has_higher_rate_limit(): void
{
    // Sync push: 100 req/min
    for ($i = 0; $i < 101; $i++) {
        $response = $this->withToken($this->mobileToken)
            ->postJson('/api/v1/sync/push', ['changes' => []]);
    }
    $response->assertStatus(429);
}
```

### Input Validation
- Max payload size: 10MB for submissions, 50MB for media
- All string fields length-validated
- File upload type restricted to: `jpg`, `png`, `webp`, `mp4`, `wav`, `mp3`, `pdf`, `csv`, `xlsx`
- File upload size: 25MB per file max
- JSON payload depth max: 10 levels

## 5. File Upload Security Testing

| Test | Expected |
|------|----------|
| Upload executable (.exe, .sh, .php) | Rejected with 422 |
| Upload with double extension (.jpg.php) | Rejected |
| Upload oversized file (500MB) | Rejected with 413 |
| Upload with malicious SVG (XSS) | Sanitized or rejected |
| Upload with EXIF data | EXIF stripped on server |
| Upload path traversal (../../../etc/passwd) | Filename sanitized |
| Virus/malware upload | Scanned via ClamAV (Phase 2) |

## 6. Dependency Vulnerability Scanning

### Tooling
- **Dependabot**: Automated PRs for vulnerable dependencies
- **composer audit**: PHP package scanning in CI
- **npm audit**: JavaScript package scanning in CI
- **Trivy**: Container image scanning

### SLA
| Severity | Patch Deadline |
|----------|---------------|
| Critical | 24 hours |
| High | 72 hours |
| Medium | 7 days |
| Low | 30 days |

## 7. Container Security Scanning

### Scan Targets (Trivy)
- `merline-api` (Laravel + PHP-FPM)
- `merline-frontend` (Next.js)
- `merline-mobile-build` (Flutter build environment)
- `merline-nginx` (reverse proxy)
- `merline-redis` (configured)
- `merline-postgres` (configured)

### Checks
- OS package vulnerabilities
- Application dependency vulnerabilities
- Secrets in image layers
- Non-root user enforcement
- Read-only filesystem enforcement

## 8. Mobile App Security Testing

### Data Storage

| Test | Expected |
|------|----------|
| SQLite database encrypted at rest | Isar database encrypted |
| Media files stored in app-private directory | Not accessible to other apps |
| Cache cleared on app uninstall | All local data removed |
| No sensitive data in logs | Logs sanitized |
| Clipboard disabled for sensitive fields | PII fields block clipboard |

### Network

| Test | Expected |
|------|----------|
| TLS certificate validation | Invalid certs rejected |
| Certificate pinning | Pinned cert required (Phase 2) |
| No plaintext HTTP | All traffic over HTTPS |
| Proxy detection | Alert if proxy detected |

### Device Integrity

| Test | Expected |
|------|----------|
| Root detection (Android) | Alert on rooted device |
| Jailbreak detection (iOS) | Alert on jailbroken device |
| Emulator detection | Optional blocking |
| Debug mode detection | Warn if debugger attached |

### Authentication

| Test | Expected |
|------|----------|
| Token stored securely | Encrypted shared preferences |
| Biometric available | Option to use fingerprint/face |
| Auto-logout after inactivity | Configurable timeout (default 15 min) |
| Session wipe on token refresh failure | Force re-login |

## 9. Penetration Testing Scope

### Phase 1 (Quarterly)
- OWASP Top 10 coverage
- Authentication bypass attempts
- Authorization / IDOR testing
- SQL injection (all input vectors)
- XSS (stored, reflected, DOM)
- CSRF on remaining web routes
- API rate limit bypass
- File upload abuse
- Multi-tenant isolation breach

### Phase 2 (Bi-annual)
- All Phase 1 scope
- SSRF testing
- WebSocket security
- GraphQL injection
- AI prompt injection
- RAG data poisoning
- Model extraction attempts

## Security Severity Thresholds

| Severity | Definition | Release Impact |
|----------|------------|----------------|
| Critical | Remote code execution, data breach, auth bypass | Block release |
| High | Privilege escalation, data exposure, XSS with impact | Block release |
| Medium | Information disclosure, missing security headers | Fix within 7 days |
| Low | Security best practice violations, version disclosure | Fix within 30 days |
