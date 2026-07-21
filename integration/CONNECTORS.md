# Merline Connector Specifications

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Connector Framework Overview

Every connector follows the unified framework defined in `ARCHITECTURE.md` section 4. All connectors share:

- **Authentication**: Centralized credential management via vault (HashiCorp Vault / AWS Secrets Manager)
- **Sync engine**: Common delta sync protocol with conflict detection and resolution
- **Mapping**: Declarative JSON-based mapping rules between Merline domain model and external system model
- **Error handling**: Consistent retry, backoff, dead-letter, and alerting patterns
- **Observability**: Unified metrics, logging, and health checks via Prometheus + Grafana

### Connector Priority Matrix

| Connector | Priority | Market Demand | Technical Complexity | Timeline |
|-----------|----------|---------------|---------------------|----------|
| DHIS2 | P1 | Critical | High | Phase 4 (Month 12) |
| KoboToolbox | P1 | Critical | Medium | Phase 4 (Month 13) |
| ODK Central | P1 | High | Medium | Phase 4 (Month 13) |
| REDCap | P1 | High | Medium | Phase 4 (Month 14) |
| Power BI / Tableau | P1 | Critical | Low | Phase 4 (Month 12) |
| Slack / Teams | P2 | High | Low | Phase 4 (Month 14) |
| WhatsApp / Twilio | P2 | High | Medium | Phase 4 (Month 14) |
| Google Workspace | P2 | Medium | Medium | Phase 4+ |
| Microsoft 365 | P2 | Medium | Medium | Phase 4+ |
| ArcGIS / QGIS | P2 | Medium | Medium | Phase 4+ |
| Payment Providers | P3 | Medium | Medium | Phase 5 |
| Government APIs | P3 | High | Very High | Phase 5 |

---

## 2. DHIS2 Connector

### 2.1 Purpose
Bidirectional synchronization between Merline and DHIS2 (District Health Information System 2) instances. DHIS2 is the most widely used health management information system in low- and middle-income countries.

### 2.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Organisation Unit Sync | DHIS2 → Merline | Import org unit hierarchy (country → region → district → facility) | Scheduled (daily) + Manual |
| Data Element Sync | DHIS2 → Merline | Import DHIS2 data elements as Merline indicators | Scheduled (weekly) |
| Indicator Value Push | Merline → DHIS2 | Push indicator values as DHIS2 data values | Scheduled (daily) + Event-triggered |
| Data Value Pull | DHIS2 → Merline | Pull reported data values into Merline for analysis | Scheduled (daily) |
| Category Option Sync | DHIS2 → Merline | Import category combos (disaggregation dimensions) | On-demand |
| Program Sync | DHIS2 ↔ Merline | Map DHIS2 programs to Merline studies | Manual mapping |

### 2.3 Authentication

| Method | Details |
|--------|---------|
| Basic Auth | Username + password (hashed, stored in vault) |
| API Token | DHIS2 personal access token (v2.41+) |
| OAuth2 | For DHIS2 instances with OAuth enabled |

### 2.4 Data Flow

```
DHIS2 Instance                       Merline Integration Engine
     │                                        │
     │ 1. GET /api/organisationUnits          │
     │ 2. GET /api/dataElements               │
     │ 3. GET /api/categoryCombos             │
     │◀───────────────────────────────────────│
     │                                        │
     │  Initial sync (full pull)              │
     │                                        │
     │ 4. POST /api/dataValueSets             │
     │    (indicator values from Merline)     │──▶ Scheduled push
     │ 5. GET /api/dataValueSets              │
     │    (DHIS2 reported values to Merline)  │──▶ Scheduled pull
     │                                        │
     │ 6. POST /api/dataStore                 │
     │    (sync checkpoint state)             │──▶ Internal tracking
```

### 2.5 Mapping Requirements

| Merline Entity | DHIS2 Entity | Notes |
|----------------|--------------|-------|
| `Organization` | Organisation unit hierarchy | Map to DHIS2 org unit; parent-child hierarchy preserved |
| `Indicator` | Data Element | Merline indicator.code → DHIS2 data element UID |
| `Indicator Value` | Data Value | Value + period + org unit + category combo |
| `Study` | Program (optional) | Study → DHIS2 program with stages |
| `Disaggregation` | Category Combo | Disaggregation dimension → category option combo |
| `Submission` | Event / Enrollment | Individual survey → DHIS2 event (if program tracked) |

### 2.6 Sync Configuration

```json
{
  "connector_type": "dhis2",
  "config": {
    "base_url": "https://dhis2.example.org",
    "api_version": "2.41",
    "auth_method": "basic",
    "sync_frequency": "daily",
    "sync_time": "02:00 UTC",
    "period_type": "Monthly",
    "default_org_unit": "root-org-unit-uid",
    "resources": {
      "organisationUnits": { "enabled": true, "cron": "0 3 * * *" },
      "dataElements": { "enabled": true, "cron": "0 4 * * 0" },
      "dataValues": { "enabled": true, "cron": "0 2 * * *" },
      "programs": { "enabled": false }
    }
  },
  "mapping_rules": [
    {
      "merline_entity": "indicator",
      "merline_field": "code",
      "dhis2_entity": "dataElement",
      "dhis2_field": "id",
      "transform": "lookup"
    },
    {
      "merline_entity": "indicator.value",
      "dhis2_entity": "dataValue",
      "field_mappings": [
        { "source": "value", "target": "value" },
        { "source": "period", "target": "period", "transform": "merline_to_dhis2_period" },
        { "source": "org_unit_id", "target": "orgUnit" },
        { "source": "category_id", "target": "categoryOptionCombo" }
      ]
    }
  ]
}
```

### 2.7 Error Handling

| Error | Handling | Notify |
|-------|----------|--------|
| DHIS2 unavailable (timeout) | Retry 3x with backoff | Admin alert after 3 failures |
| Authentication failure | Disable connector | Immediate admin alert |
| Invalid org unit reference | Skip record, log error | Admin digest (daily) |
| Data value rejected (validation) | Log rejection details | Admin digest (daily) |
| Rate limited (429) | Respect Retry-After header | Logged, no alert |

---

## 3. KoboToolbox Connector

### 3.1 Purpose
Import forms and submissions from KoboToolbox into Merline. Enable migration from Kobo to Merline and cross-platform data consolidation.

### 3.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Form Import | Kobo → Merline | Import XLSForm/XForm as Merline questionnaire | Manual + Scheduled |
| Submission Sync | Kobo → Merline | Pull submissions from Kobo into Merline as responses | Scheduled (hourly) |
| Media Sync | Kobo → Merline | Transfer attached media files | On-demand after submission sync |
| Metadata Sync | Kobo → Merline | Import project metadata, user assignments | Scheduled (daily) |

### 3.3 Authentication

| Method | Details |
|--------|---------|
| API Token | KoboToolbox personal token from `/api/v2/token/` |
| OAuth2 | Kobo OAuth2 flow for server-to-server |

### 3.4 Data Flow

```
KoboToolbox                        Merline Integration Engine
     │                                        │
     │ 1. GET /api/v2/assets                  │── List all projects/assets
     │ 2. GET /api/v2/assets/{uid}            │── Get form definition (XLSForm)
     │ 3. POST /import/xlsform                │── Import into Merline questionnaire
     │                                        │
     │ 4. GET /api/v2/assets/{uid}/data       │── Pull submissions (paginated)
     │ 5. POST /api/v2/assets/{uid}/data.json │── Map submissions to Merline responses
     │                                        │
     │ 6. Attachment download                  │── Pull media files to S3
```

### 3.5 Mapping Requirements

| Merline Entity | Kobo Entity | Notes |
|----------------|-------------|-------|
| `Questionnaire` | Asset (survey) | Kobo XLSForm → Merline questionnaire structure |
| `Question` | Survey question | Map by `name` field; preserve type, options, logic |
| `Section` | Group / repeat group | Nested groups become sections |
| `Submission` | Submission (data point) | Each Kobo submission → Merline submission |
| `Response Value` | Individual answer | Map by question `name` field |
| `Media` | Attachment | Download from Kobo attachment URL |
| `Skip Logic` | Skip logic rules | Map `relevant` field conditions |
| `Validation` | Validation criteria | Map `constraint` and `required` |

### 3.6 XLSForm Import Limitations

| Feature | Handling |
|---------|----------|
| Calculated fields (`calculate`) | Convert to Merline calculated question type |
| Regex validation | Map to pattern validation rule |
| Cascading selects | Convert to chained single-select questions |
| Multimedia questions | Preserve type mapping (photo, audio, video) |
| Repeated groups | Map to Merline repeating sections |
| `note` type questions | Map to Merline note type (no data) |

---

## 4. ODK Central Connector

### 4.1 Purpose
Import forms and submissions from ODK Central, the server component of the Open Data Kit ecosystem.

### 4.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Form Import | ODK → Merline | Import XForms as Merline questionnaires | Manual |
| Submission Sync | ODK → Merline | Pull submissions incrementally | Scheduled (hourly) |
| Attachment Sync | ODK → Merline | Transfer media attachments | On-demand |
| User Metadata | ODK → Merline | Import app user assignments | Scheduled (daily) |

### 4.3 Authentication

| Method | Details |
|--------|---------|
| Bearer Token | ODK Central API token |
| OAuth2 | Supported for ODK Central v2023+ |

### 4.4 Key Differences from Kobo Connector

| Aspect | KoboToolbox | ODK Central |
|--------|-------------|-------------|
| Form format | XLSForm (Excel) | XForm (XML) |
| API style | RESTful JSON | RESTful JSON |
| Submission format | JSON | XML (converted to JSON) |
| Pagination | Offset-based | Cursor-based (`$skip`, `$top`) |
| Media retrieval | Direct URL | Download endpoint per attachment |

---

## 5. CommCare Connector

### 5.1 Purpose
Bidirectional case data and form data synchronization with CommCare, a mobile data collection platform used by large-scale health programs.

### 5.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Case Data Sync | CommCare → Merline | Pull case data (beneficiary records) | Scheduled (hourly) |
| Form Data Sync | CommCare → Merline | Pull form submissions | Scheduled (hourly) |
| Indicator Push | Merline → CommCare | Push computed indicators as CommCare case properties | Scheduled (daily) |
| User Sync | CommCare → Merline | Import mobile worker assignments | Scheduled (daily) |

### 5.3 Authentication

| Method | Details |
|--------|---------|
| API Key | CommCare API key (project-level) |
| OAuth2 | CommCare OAuth (Dimagi SSO) |

### 5.4 Data Flow

```
CommCare                           Merline Integration Engine
     │                                        │
     │ 1. GET /a/{domain}/api/v0.5/case/     │── Pull cases (paginated)
     │ 2. GET /a/{domain}/api/v0.5/form/     │── Pull form submissions
     │ 3. GET /a/{domain}/api/v0.5/user/     │── Pull mobile workers
     │◀───────────────────────────────────────│
     │                                        │
     │ 4. POST /a/{domain}/api/v0.5/case/    │── Push case updates
     │                                        │
     │ 5. Case → Beneficiary mapping          │── Transform CommCare case to study
     │ 6. Form → Submission mapping           │── Transform form XML to response data
```

### 5.5 Mapping Considerations

- CommCare cases map to Merline respondent/beneficiary records
- CommCare form submissions require XML-to-JSON conversion
- Case properties can map to Merline indicator values
- Multi-language support in CommCare forms mapped to Merline translations
- CommCare's app workspace structure maps to Merline study hierarchy

---

## 6. REDCap Connector

### 6.1 Purpose
Bidirectional integration with REDCap (Research Electronic Data Capture), widely used in academic medical research.

### 6.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Instrument Import | REDCap → Merline | Import REDCap instruments as Merline questionnaires | Manual |
| Record Sync | REDCap ↔ Merline | Bidirectional record synchronization | Scheduled (daily) |
| Metadata Sync | REDCap → Merline | Import data dictionary, events, arms | On-demand |
| File Repository Sync | REDCap → Merline | Transfer uploaded documents | On-demand |

### 6.3 Authentication

| Method | Details |
|--------|---------|
| API Token | REDCap project-level API token |
| Super API Token | Multi-project access (REDCap admin) |

### 6.4 Data Flow

```
REDCap Instance                     Merline Integration Engine
     │                                        │
     │ 1. POST /api/ (exportInstrument)       │── Get instrument as JSON
     │ 2. POST /api/ (exportMetadata)         │── Get data dictionary
     │ 3. POST /api/ (exportRecords)          │── Pull records
     │ 4. POST /api/ (exportEvents)           │── Get longitudinal events
     │◀───────────────────────────────────────│
     │                                        │
     │ 5. POST /api/ (importRecords)          │── Push updated/created records
```

### 6.5 Mapping Requirements

| Merline Entity | REDCap Entity | Notes |
|----------------|---------------|-------|
| `Questionnaire` | Instrument | REDCap instrument → Merline questionnaire |
| `Question` | Field | Map by `field_name`; preserve field type, validation |
| `Section` | Instrument section / Form | REDCap forms → Merline sections |
| `Submission` | Record + Event (longitudinal) | REDCap record ID → submission; event_id → study visit |
| `Option List` | Multiple choice field options | Map REDCap choices to Merline question options |
| `Branching Logic` | Branching logic | Convert REDCap branching logic to Merline skip rules |
| `Calculation` | Calculated field | Map REDCap calculation to Merline calculated field |

### 6.6 REDCap-Specific Considerations

- REDCap's longitudinal (event-based) structure maps to Merline's visit/follow-up model
- REDCap repeating instruments map to Merline repeating sections
- REDCap's Data Access Groups (DAGs) map to Merline team/assignment scoping
- REDCap surveys vs data entry forms require different mapping approaches
- REDCap's checkbox (multiple choice with multiple answers) maps to Merline multi-select

---

## 7. Power BI / Tableau Connector

### 7.1 Purpose
Enable live data connectivity from Merline to external Business Intelligence tools for enterprise analytics and reporting.

### 7.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| OData Feed | Merline → BI | OData v4 endpoint for live data consumption | Real-time (live query) |
| Dataset Export | Merline → BI | Scheduled data export to Power BI dataset | Scheduled |
| Tableau Hyper Extract | Merline → Tableau | Generate .hyper file for Tableau | Scheduled |
| Custom SQL Query | Merline → BI | Read-replica PostgreSQL connection | Direct (enterprise) |

### 7.3 Authentication

| Method | Details |
|--------|---------|
| OAuth2 | OAuth2 client credentials for service-to-service |
| API Key | Read-only API key for data export |
| Username/Password | Direct DB connection to analytics read replica (enterprise only) |

### 7.4 OData Feed Design

```
GET /api/v1/odata/studies
GET /api/v1/odata/indicators
GET /api/v1/odata/submissions
GET /api/v1/odata/responses
GET /api/v1/odata/indicator-values

Response: OData JSON format with @odata.context, value[], @odata.nextLink
Supported: $filter, $select, $top, $skip, $orderby, $count
```

### 7.5 Mapping Considerations

- All PII fields are masked/aggregated in OData feeds (configurable per organization)
- OData feeds limited to approved/approved submissions only
- Direct DB connection provides raw data access to analytics schema
- Each tenant gets isolated OData feed (scoped to tenant schema)
- OData maximum page size: 1000 records

---

## 8. ArcGIS / QGIS Connector

### 8.1 Purpose
Export geospatial data from Merline to GIS platforms for spatial analysis and mapping.

### 8.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Feature Service | Merline → ArcGIS | Create/update feature service layer | Scheduled |
| GeoJSON Export | Merline → GIS | Download GeoJSON for QGIS import | Manual |
| Shapefile Export | Merline → GIS | Generate zipped shapefile | Manual |
| GeoJSON Webhook | Merline → GIS | Push new submissions with GPS to GIS | Event-triggered |

### 8.3 Authentication

| Method | Details |
|--------|---------|
| API Key | ArcGIS API key |
| Token-based | ArcGIS token (generated from username/password) |
| OAuth2 | OAuth2 for ArcGIS Online |

### 8.4 Data Mapping

| Merline Entity | ArcGIS/QGIS Entity | Notes |
|----------------|--------------------|-------|
| Submission location | Point feature | GPS coordinates → feature geometry |
| Study area | Polygon feature | Study boundary → feature geometry |
| Submission attributes | Feature attributes | Response values → feature attributes |
| Indicator values | Join table | For thematic mapping |

---

## 9. Google Workspace Connector

### 9.1 Supported Operations

| Operation | Direction | Description |
|-----------|-----------|-------------|
| Google Drive Export | Merline → Drive | Export reports, datasets to Google Drive |
| Google Sheets Sync | Merline ↔ Sheets | Sync indicator values to spreadsheet |
| Google Calendar Integration | Merline → Calendar | Create study milestones, data collection events |
| Google Docs Report | Merline → Docs | Generate report as Google Doc |

### 9.2 Authentication

OAuth 2.0 with Google Workspace scopes. Service account for domain-wide delegation.

---

## 10. Microsoft 365 Connector

### 10.1 Supported Operations

| Operation | Direction | Description |
|-----------|-----------|-------------|
| SharePoint Document Sync | Merline ↔ SharePoint | Sync reports and datasets |
| Teams Notification | Merline → Teams | Send alerts, report links via webhook |
| Excel Online Sync | Merline ↔ Excel | Export data to Excel Online |
| Power Automate Integration | Merline → Flow | Trigger Power Automate flows |


### 10.2 Authentication

Microsoft identity platform (Azure AD) OAuth 2.0 with delegated permissions.

---

## 11. Slack / Teams Notification Connector

### 11.1 Purpose
Send real-time notifications, alerts, and scheduled reports to collaboration platforms.

### 11.2 Supported Operations

| Operation | Direction | Description | Sync Pattern |
|-----------|-----------|-------------|--------------|
| Alert Notification | Merline → Chat | Send data quality alerts, sync errors | Event-triggered |
| Scheduled Report | Merline → Chat | Post daily/weekly collection progress | Scheduled |
| Interactive Messages | Merline → Chat | Approve/reject submissions from chat | Webhook round-trip |
| Command Integration | Chat → Merline | Query status via slash commands | Real-time |

### 11.3 Authentication

| Platform | Method |
|----------|--------|
| Slack | Incoming webhook URL + Slack app (OAuth) |
| Teams | Office 365 connector webhook + Teams app |

---

## 12. WhatsApp / Twilio / SMS Connector

### 12.1 Purpose
Communicate with enumerators, supervisors, and respondents via SMS and WhatsApp for alerts, reminders, and data collection coordination.

### 12.2 Supported Operations

| Operation | Direction | Description |
|-----------|-----------|-------------|
| Enumerator Alerts | Merline → SMS/WhatsApp | Daily targets, sync reminders, quality flags |
| Supervisor Reports | Merline → SMS/WhatsApp | Daily progress summary |
| Respondent Reminders | Merline → SMS | Appointment reminders, follow-up |
| Two-Way Data Query | SMS → Merline | Simple data queries via SMS (e.g., "submissions today") |
| Broadcast | Merline → SMS/WhatsApp | Emergency alerts to all field staff |

### 12.3 Authentication

| Method | Details |
|--------|---------|
| API Key | Twilio API credentials (vault-stored) |
| WhatsApp Business API | Meta WhatsApp Business API token |

---

## 13. Payment Providers Connector

### 13.1 Purpose
Enable payment collection and disbursement for paid services, enumerator incentives, and premium features.

### 13.2 Supported Providers

| Provider | Operations | Use Case |
|----------|------------|----------|
| Stripe | Payment collection, subscriptions, invoices | SaaS billing |
| PayPal | Payment collection | Global payments |
| M-Pesa | Mobile money payments | Kenya enumerator incentives |
| Flutterwave | Payment collection | African market payments |
| Paystack | Payment collection | Nigerian market payments |

---

## 14. Government APIs Connector

### 14.1 Purpose
Integrate with national government systems for identity verification, health information exchange, and regulatory reporting.

### 14.2 Supported Integrations

| Integration | Region | Description |
|-------------|--------|-------------|
| National ID (NIN) | Nigeria | Verify enumerator/respondent identity |
| National ID (Huduma Namba) | Kenya | Identity verification |
| Health Information Exchange | Various | HL7 FHIR integration |
| Civil Registration | Various | Vital statistics data sync |
| Tax Authority APIs | Various | Organization verification |

### 14.3 Authentication

| Method | Details |
|--------|---------|
| mTLS | Mutual TLS with government PKI certificates |
| OAuth2 | Government IdP (OIDC) |
| Signed Requests | HMAC or RSA-signed request payloads |
| IP Allowlisting | Static IP ranges for government integrations |

---

## 15. Connector Development Standards

### 15.1 Required Artifacts

Every connector must include:

1. **Manifest** (`manifest.json`): Name, version, author, capabilities, dependencies
2. **Connector Class**: Implements `ConnectorInterface` (authenticate, fetch, push, mapDirection, validate, handleError)
3. **Auth Handler**: Implements `AuthInterface` for the specific auth method
4. **Mappers**: One or more mapper classes for each entity mapping direction
5. **Tests**: Unit tests (60%+ coverage), integration test with mock server
6. **Documentation**: README with setup, configuration, mapping, troubleshooting

### 15.2 Connector Interface

```php
interface ConnectorInterface
{
    public function authenticate(): AuthResult;
    public function fetch(string $resource, array $params = []): FetchResult;
    public function push(string $resource, array $payload, array $options = []): PushResult;
    public function mapDirection(string $sourceEntity, string $targetEntity, array $data): array;
    public function validate(array $schema, array $data): ValidationResult;
    public function handleError(\Throwable $e, array $context = []): ErrorResult;
    public function getStatus(): ConnectorStatus;
    public function getMetrics(): array;
}
```

### 15.3 Connector Catalog

| # | Connector | Status | Version | Maintainer |
|---|-----------|--------|---------|------------|
| 1 | DHIS2 | Planned | 1.0.0 | Merline Core |
| 2 | KoboToolbox | Planned | 1.0.0 | Merline Core |
| 3 | ODK Central | Planned | 1.0.0 | Merline Core |
| 4 | CommCare | Planned | 1.0.0 | Merline Core |
| 5 | REDCap | Planned | 1.0.0 | Merline Core |
| 6 | Power BI (OData) | Planned | 1.0.0 | Merline Core |
| 7 | Tableau | Planned | 1.0.0 | Merline Core |
| 8 | ArcGIS | Planned | 1.0.0 | Merline Core |
| 9 | QGIS (GeoJSON) | Planned | 1.0.0 | Merline Core |
| 10 | Google Workspace | Planned | 1.0.0 | Merline Core |
| 11 | Microsoft 365 | Planned | 1.0.0 | Merline Core |
| 12 | Slack | Planned | 1.0.0 | Merline Core |
| 13 | Teams | Planned | 1.0.0 | Merline Core |
| 14 | WhatsApp (Twilio) | Planned | 1.0.0 | Merline Core |
| 15 | SMS (Twilio) | Planned | 1.0.0 | Merline Core |
| 16 | Stripe | Planned | 1.0.0 | Merline Core |
| 17 | M-Pesa | Planned | 1.0.0 | Merline Core |
| 18 | Flutterwave | Planned | 1.0.0 | Merline Core |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial connector specifications |
