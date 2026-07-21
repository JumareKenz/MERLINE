# Merline API Reference

## Version: 1.0.0 | Owner: Backend Engineering Lead | Status: Draft

---

## 1. API Overview

### 1.1 Base Information

| Property | Value |
|----------|-------|
| **Base URL** | `https://api.merline.app/api/v1` |
| **Protocol** | HTTPS only |
| **Format** | JSON |
| **Auth** | Bearer Token (Laravel Sanctum) / OAuth2 (Passport) |
| **Versioning** | URL-based (`/api/v1/`, `/api/v2/`) |

### 1.2 Authentication

All endpoints except public auth endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer {token}
```

**Getting a token:**

```bash
curl -X POST https://api.merline.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@org.com","password":"SecureP@ss1"}'
```

Response:
```json
{
  "data": {
    "user": { "id": "uuid", "email": "user@org.com" },
    "token": "1|sanctum_token_string",
    "expires_at": "2026-07-25T14:30:00Z"
  },
  "meta": { "request_id": "req_abc", "timestamp": "2026-07-18T14:30:00Z", "version": "1.0" }
}
```

### 1.3 Response Format

All responses follow a consistent envelope:

```json
{
  "data": {},
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-18T14:30:00Z",
    "version": "1.0"
  }
}
```

Collections include pagination:
```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 25,
    "total": 142,
    "last_page": 6,
    "has_more": true
  }
}
```

### 1.4 Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The given data was invalid.",
    "details": {
      "title": ["The title field is required."]
    },
    "request_id": "req_abc123"
  }
}
```

### 1.5 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | GET, PUT, PATCH |
| 201 | Created | POST |
| 204 | No Content | DELETE |
| 400 | Bad Request | Malformed input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | State conflict (sync) |
| 422 | Unprocessable | Business rule violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Unexpected server error |

---

## 2. Endpoints by Module

### 2.1 Authentication & Organization Management (18 endpoints)

#### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user + create org |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/logout` | Revoke current token |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/verify-email` | Verify email address |
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/me` | Update own profile |

**POST /auth/register**
```json
// Request
{
  "email": "user@example.com",
  "password": "SecureP@ss1",
  "first_name": "Jane",
  "last_name": "Researcher",
  "organization_name": "ACME NGO",
  "organization_type": "NGO",
  "country": "Kenya"
}

// Response 201
{
  "data": {
    "user": { "id": "uuid", "email": "...", "first_name": "...", "last_name": "..." },
    "organization": { "id": "uuid", "name": "...", "slug": "..." },
    "token": "sanctum_token_string"
  },
  "meta": { "request_id": "req_abc", "timestamp": "2026-07-18T14:30:00Z", "version": "1.0" }
}
```

#### Organization Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/organizations` | Any (own org) |
| PUT | `/organizations/{id}` | OrgAdmin |
| GET | `/organizations/{id}/members` | OrgAdmin/Manager |
| POST | `/organizations/{id}/members` | OrgAdmin |
| DELETE | `/organizations/{id}/members/{userId}` | OrgAdmin |
| PUT | `/organizations/{id}/members/{userId}/role` | OrgAdmin |

#### Team Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/organizations/{id}/teams` | Any |
| POST | `/organizations/{id}/teams` | OrgAdmin/Manager |
| GET | `/teams/{id}` | Team member |
| PUT | `/teams/{id}` | Team supervisor |
| DELETE | `/teams/{id}` | OrgAdmin |
| POST | `/teams/{id}/members` | Team supervisor |
| DELETE | `/teams/{id}/members/{userId}` | Team supervisor |

#### Session Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/sessions` | List active sessions |
| DELETE | `/auth/sessions/{id}` | Force logout session |

### 2.2 Project & Study Management (15 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/projects` | Any |
| POST | `/projects` | Researcher+ |
| GET | `/projects/{id}` | Any |
| PUT | `/projects/{id}` | Project PI+ |
| DELETE | `/projects/{id}` | OrgAdmin |
| POST | `/projects/{id}/archive` | Project PI+ |
| POST | `/projects/{id}/restore` | OrgAdmin |
| GET | `/projects/{projectId}/studies` | Any |
| POST | `/projects/{projectId}/studies` | Researcher+ |
| GET | `/studies/{id}` | Any |
| PUT | `/studies/{id}` | PI+ |
| DELETE | `/studies/{id}` | OrgAdmin |
| POST | `/studies/{id}/archive` | PI+ |
| POST | `/studies/{id}/restore` | OrgAdmin |
| POST | `/studies/{id}/clone` | Researcher+ |
| POST | `/studies/{id}/transitions` | PI+ |

**POST /projects**
```json
// Request
{
  "code": "PRJ-2026-001",
  "name": "Kenya Health Impact Evaluation",
  "description": "Evaluating the impact of community health worker program",
  "donor": "USAID",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "country": "Kenya",
  "sector": "Health"
}

// Response 201
{
  "data": {
    "id": "uuid",
    "code": "PRJ-2026-001",
    "name": "Kenya Health Impact Evaluation",
    "status": "draft",
    "created_at": "2026-07-18T14:30:00Z"
  }
}
```

**POST /studies/{id}/transitions**
```json
// Request
{
  "status": "approved",
  "reason": "Study design reviewed and approved by ethics committee"
}

// Response 200
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "allowed_transitions": ["pre_test", "field"],
    "transitioned_at": "2026-07-18T14:30:00Z"
  }
}
```

### 2.3 Indicators (8 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/indicators` | Any |
| POST | `/indicators` | Researcher+ |
| GET | `/indicators/{id}` | Any |
| PUT | `/indicators/{id}` | PI+ |
| POST | `/indicators/{id}/versions` | PI+ |
| GET | `/indicator-libraries` | Any |
| POST | `/indicator-libraries` | Researcher+ |
| GET | `/indicators/{id}/values` | Any |

### 2.4 Questionnaires (12 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/studies/{id}/questionnaires` | Any |
| POST | `/studies/{id}/questionnaires` | Researcher+ |
| GET | `/questionnaires/{id}` | Any |
| PUT | `/questionnaires/{id}` | Researcher+ |
| POST | `/questionnaires/{id}/publish` | PI+ |
| GET | `/questionnaires/{id}/questions` | Any |
| POST | `/questionnaires/{id}/questions` | Researcher+ |
| PUT | `/questions/{id}` | Researcher+ |
| DELETE | `/questions/{id}` | Researcher+ |
| GET | `/questionnaires/{id}/preview` | Any |
| POST | `/questionnaires/{id}/clone` | Researcher+ |
| GET | `/question-bank` | Any |

### 2.5 Data Collection (14 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/assignments` | Enumerator/Supervisor |
| POST | `/assignments` | Supervisor+ |
| GET | `/assignments/{id}` | Enumerator/Supervisor |
| PUT | `/assignments/{id}` | Supervisor+ |
| POST | `/submissions` | Enumerator |
| GET | `/submissions/{id}` | Researcher+ |
| PUT | `/submissions/{id}` | Researcher+ |
| POST | `/submissions/{id}/validate` | Researcher+ |
| GET | `/submissions` | Researcher+ |
| GET | `/devices/register` | Enumerator |
| POST | `/devices/{id}/heartbeat` | Enumerator |
| GET | `/enumerators/{id}/performance` | Supervisor+ |
| POST | `/sync/push` | Mobile |
| GET | `/sync/pull` | Mobile |

### 2.6 Analytics (10 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/studies/{id}/dashboard` | Any |
| GET | `/projects/{id}/dashboard` | Any |
| GET | `/dashboards/{id}` | Any |
| POST | `/dashboards` | Researcher+ |
| PUT | `/dashboards/{id}` | Researcher+ |
| DELETE | `/dashboards/{id}` | Researcher+ |
| GET | `/analytics/indicators` | Any |
| GET | `/analytics/cross-tab` | Researcher+ |
| GET | `/analytics/export` | Any |
| POST | `/analytics/filters` | Any |

### 2.7 Reporting (8 endpoints)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/reports` | Any |
| POST | `/reports/generate` | Researcher+ |
| GET | `/reports/{id}` | Any |
| DELETE | `/reports/{id}` | PI+ |
| GET | `/report-templates` | Any |
| POST | `/report-templates` | Researcher+ |
| GET | `/reports/{id}/download` | Any |
| POST | `/reports/{id}/publish` | PI+ |

### 2.8 Sync API (Mobile)

**POST /sync/push** — Push local changes from device
```json
// Request
{
  "changes": {
    "responses": [
      {
        "submission_id": "client-generated-uuid",
        "questionnaire_id": "uuid",
        "responses": { "q1": "value1", "q2": "value2" },
        "completed_at": "2026-07-18T14:30:00Z",
        "checksum": "sha256"
      }
    ],
    "media": [
      { "id": "uuid", "file_hash": "sha256", "chunk_index": 0, "data": "base64" }
    ]
  },
  "last_synced_at": "2026-07-18T13:00:00Z"
}

// Response 200
{
  "data": {
    "accepted": ["submission-id-1"],
    "conflicts": ["submission-id-2"],
    "server_time": "2026-07-18T14:30:00Z"
  }
}
```

**GET /sync/pull** — Get changes since last sync
```
GET /sync/pull?since=2026-07-18T14:00:00Z&device_id=abc123
```

Response:
```json
{
  "data": {
    "changes": {
      "studies": [...],
      "questionnaires": [...],
      "assignments": [...]
    },
    "sync_token": "next-sync-token"
  }
}
```

---

## 3. Authentication Methods

### 3.1 Bearer Token (Sanctum)

Default for web frontend and mobile app. Tokens obtained via login.

```bash
curl -H "Authorization: Bearer 1|token" https://api.merline.app/api/v1/auth/me
```

### 3.2 OAuth2 (Passport)

For third-party integrations and API access.

```
Authorization: Bearer {oauth2_token}
```

**Grant types supported:**
- Authorization Code (web apps)
- Client Credentials (server-to-server)
- Refresh Token

### 3.3 API Keys

For machine-to-machine integrations. Keys created in Admin panel.

```bash
curl -H "X-API-Key: merlin_api_live_abc123" https://api.merline.app/api/v1/projects
```

---

## 4. SDK Usage Examples

### curl

```bash
# List projects
curl https://api.merline.app/api/v1/projects \
  -H "Authorization: Bearer 1|token" \
  -H "Content-Type: application/json"

# Create study
curl -X POST https://api.merline.app/api/v1/projects/{id}/studies \
  -H "Authorization: Bearer 1|token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Impact Evaluation","study_type":"baseline","start_date":"2026-08-01","end_date":"2026-12-31"}'
```

### JavaScript (fetch)

```javascript
const api = async (path, options = {}) => {
  const res = await fetch(`https://api.merline.app/api/v1${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

// List projects
const projects = await api('/projects?status=active');

// Create study
const study = await api(`/projects/${projectId}/studies`, {
  method: 'POST',
  body: JSON.stringify({
    title: 'Baseline Survey',
    study_type: 'baseline',
    start_date: '2026-08-01',
    end_date: '2026-12-31',
  }),
});
```

### Python

```python
import requests

class MerlineClient:
    def __init__(self, api_key: str, base_url: str = "https://api.merline.app/api/v1"):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })
        self.base_url = base_url

    def get_projects(self, status: str = None):
        params = {"status": status} if status else {}
        return self.session.get(f"{self.base_url}/projects", params=params).json()

    def create_study(self, project_id: str, data: dict):
        return self.session.post(
            f"{self.base_url}/projects/{project_id}/studies", json=data
        ).json()

client = MerlineClient("your-api-key")
projects = client.get_projects(status="active")
```

### PHP

```php
use Illuminate\Support\Facades\Http;

$response = Http::withToken('sanctum-token')
    ->get('https://api.merline.app/api/v1/projects', [
        'status' => 'active',
        'per_page' => 25,
    ]);

$projects = $response->json('data');

$study = Http::withToken('sanctum-token')
    ->post("https://api.merline.app/api/v1/projects/{$projectId}/studies", [
        'title' => 'Baseline Survey',
        'study_type' => 'baseline',
        'start_date' => '2026-08-01',
        'end_date' => '2026-12-31',
    ])
    ->json('data');
```

### Dart (Flutter)

```dart
import 'package:dio/dio.dart';

class MerlineApi {
  final Dio _dio;

  MerlineApi(String token)
      : _dio = Dio(BaseOptions(
          baseUrl: 'https://api.merline.app/api/v1',
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ));

  Future<List<dynamic>> getProjects({String? status}) async {
    final response = await _dio.get('/projects', queryParameters: {
      if (status != null) 'status': status,
    });
    return response.data['data'];
  }

  Future<Map<String, dynamic>> createStudy(
    String projectId, Map<String, dynamic> data) async {
    final response = await _dio.post('/projects/$projectId/studies', data: data);
    return response.data['data'];
  }
}
```

---

## 5. Webhook Guide

### 5.1 Overview

Webhooks notify external systems when events occur in Merline. Configured per organization in Admin settings.

### 5.2 Supported Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `study.created` | Study object | New study created |
| `study.completed` | Study + summary | Study marked complete |
| `submission.received` | Submission + responses | Data synced from field |
| `submission.flagged` | Submission + flag details | Quality check triggered |
| `indicator.updated` | Indicator value | Indicator value changed |
| `report.generated` | Report download URL | Report generation complete |

### 5.3 Webhook Payload

```json
{
  "event": "submission.received",
  "id": "evt_abc123",
  "created_at": "2026-07-18T14:30:00Z",
  "data": {
    "submission_id": "uuid",
    "study_id": "uuid",
    "questionnaire_id": "uuid",
    "enumerator_id": "uuid",
    "completed_at": "2026-07-18T14:30:00Z",
    "response_count": 45
  },
  "organization_id": "uuid"
}
```

### 5.4 Delivery

- **Timeout**: 10 seconds per attempt
- **Retries**: 3 attempts with exponential backoff (10s, 60s, 300s)
- **Signature**: HMAC-SHA256 signature in `X-Merline-Signature` header
- **Verification**:
  ```python
  import hmac, hashlib
  signature = hmac.new(
      webhook_secret.encode(),
      body.encode(),
      hashlib.sha256
  ).hexdigest()
  assert request.headers['X-Merline-Signature'] == signature
  ```

---

## 6. Rate Limiting

| Client Type | Limit | Window |
|-------------|-------|--------|
| Authenticated web | 120 req/min | 1 min |
| Mobile (JWT) | 60 req/min | 1 min |
| Third-party (API key) | 30 req/min | 1 min |
| Unauthenticated | 10 req/min | 1 min |

**Headers**:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1721312400
Retry-After: 45
```

**Best Practices**:
- Implement exponential backoff on 429 responses
- Cache responses where possible
- Batch requests when feasible
- Sync endpoints have separate, higher limits

---

## 7. Changelog & Migration Guides

### v1.0 (MVP) — 2026-Q3

Initial API release with all MVP endpoints:
- Authentication & Organization Management (18)
- Project & Study Management (16)
- Indicators (8)
- Questionnaires (12)
- Data Collection (14)
- Analytics (10)
- Reporting (8)
- Sync (6)

**Total: 101 endpoints** (MVP subset of 117 planned)

### Migrating to v1.0

This is the initial release. No migration required.

---

## 8. Related Documents

- [NestJS API](../apps/backend-nestjs/src/) — 172 modules, 14 domains, 200+ endpoints
- [API Design (ADR-003)](../architecture/ADR-003-api-design.md)
- [Engineer Guide](ENGINEER-GUIDE.md)
- [Admin Guide](ADMIN-GUIDE.md)
- [Glossary](GLOSSARY.md)
