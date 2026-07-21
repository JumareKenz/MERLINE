# Merline Data Interchange Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Data Interchange Overview

Merline supports a comprehensive set of export and import formats to ensure data portability across the MERL ecosystem. All export/import operations are processed asynchronously to handle large datasets.

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA INTERCHANGE ENGINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐    ┌────────────────────┐            │
│  │   Export Pipeline   │    │   Import Pipeline   │            │
│  │                     │    │                     │            │
│  │  Query → Transform  │    │  Parse → Validate   │            │
│  │  → Encode → Upload  │    │  → Map → Persist    │            │
│  └────────────────────┘    └────────────────────┘            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              Mapping & Transformation Engine         │     │
│  │  Schema Mapping │ Field Transform │ Validation      │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │           Async Job Queue (Laravel Horizon)          │     │
│  │  Export Job │ Import Job │ Transform Job │ Notify   │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Export Formats

### 2.1 Supported Export Formats

| Format | Extension | MIME Type | Use Case | Max Rows | PII Safe |
|--------|-----------|-----------|----------|----------|----------|
| **CSV** | `.csv` | `text/csv` | Universal spreadsheet, Excel import | 5,000,000 | Configurable |
| **Excel** | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Stakeholder-friendly, formatted | 1,000,000 | Configurable |
| **JSON** | `.json` | `application/json` | API consumers, programmatic use | Unlimited (streamed) | Configurable |
| **GeoJSON** | `.geojson` | `application/geo+json` | GIS tools (QGIS, ArcGIS) | 500,000 features | Configurable |
| **XML** | `.xml` | `application/xml` | Legacy system integration | 100,000 | Configurable |
| **Parquet** | `.parquet` | `application/parquet` | Data lake, analytics (columnar) | Unlimited | Configurable |
| **Avro** | `.avro` | `application/avro` | Streaming data, Kafka integration | Unlimited | Configurable |
| **SPSS** | `.sav` | `application/x-spss-sav` | Statistical analysis (SPSS) | 100,000 | Configurable |
| **Stata** | `.dta` | `application/x-stata-dta` | Statistical analysis (Stata) | 100,000 | Configurable |
| **SAS** | `.sas7bdat` | `application/x-sas-data` | Statistical analysis (SAS) | 100,000 | Configurable |
| **R** | `.RData` | `application/x-r-data` | Statistical analysis (R) | 100,000 | Configurable |
| **PDF** | `.pdf` | `application/pdf` | Report distribution, donor submission | N/A | Full masking |

### 2.2 Export API

```json
// POST /api/v1/exports
{
  "study_id": "uuid",
  "format": "csv",
  "resources": {
    "submissions": true,
    "indicators": true,
    "responses": true,
    "media_metadata": false
  },
  "filters": {
    "status": ["approved"],
    "date_from": "2026-01-01",
    "date_to": "2026-07-18"
  },
  "options": {
    "include_labels": true,
    "include_codes": true,
    "include_headers": true,
    "encoding": "UTF-8",
    "delimiter": ",",
    "date_format": "YYYY-MM-DD",
    "decimal_separator": ".",
    "pii_handling": "mask",     // 'mask', 'exclude', 'include_with_consent'
    "language": "en",
    "disaggregate": ["gender", "region"]
  },
  "notification": {
    "email": "user@example.com",
    "webhook_url": "https://hook.example.com/export-complete"
  }
}

// Response 202 Accepted
{
  "data": {
    "export_id": "uuid",
    "status": "queued",
    "format": "csv",
    "estimated_rows": 50000,
    "estimated_size_bytes": 15728640,
    "queued_at": "2026-07-18T14:30:00Z"
  }
}
```

### 2.3 Format-Specific Details

#### CSV Export
- Header row with question labels or codes (configurable)
- One row per submission
- Multi-select values: pipe-delimited (`value1|value2|value3`)
- Repeating groups: flattened with suffixed columns (`member_1_name`, `member_2_name`)
- GPS: separate columns for latitude, longitude, altitude, accuracy
- Media: URLs (not binary data)
- PII fields: masked or excluded based on user permissions

#### Excel Export
- Multiple sheets: Data, Indicators, Codebook, Notes
- Data sheet: formatted columns with headers
- Codebook sheet: question codes, labels, types, option values
- Indicators sheet: indicator definitions and values
- Conditional formatting: quality flags highlighted
- Column widths auto-sized

#### SPSS/Stata Export
- Variable names: up to 8 chars (Stata) / 64 chars (SPSS)
- Value labels: from question options
- Variable labels: from question text (truncated)
- Missing values: configured per question type
- Variable types mapped appropriately (string, numeric, date)

#### Parquet/Avro Export
- Schema embedded in file (self-describing)
- Columnar format for analytics performance
- Compression: Snappy (Parquet), Deflate (Avro)
- Partitioned by study, date for efficient queries

---

## 3. Import Formats

### 3.1 Supported Import Formats

| Format | Extension | Use Case | Max Rows | Auto-Detect |
|--------|-----------|----------|----------|-------------|
| **CSV** | `.csv` | Spreadsheet data, legacy system export | 500,000 | Column headers, delimiter |
| **Excel** | `.xlsx` | Data from field teams, partners | 100,000 | Sheet detection |
| **JSON** | `.json` | API responses, structured data | 500,000 | Schema detection |
| **XML** | `.xml` | Legacy system data, DHIS2 export | 100,000 | XSD-based |
| **XLSForm** | `.xlsx` | Survey form import (Kobo, ODK) | N/A (form def) | XLSForm template detection |
| **XForm** | `.xml` | ODK form import | N/A (form def) | XForm schema detection |

### 3.2 Import API

```json
// POST /api/v1/imports
// Content-Type: multipart/form-data

{
  "file": (binary file),
  "study_id": "uuid",
  "type": "submissions",    // 'submissions', 'indicators', 'questionnaire'
  "format": "csv",          // auto-detected if omitted
  "options": {
    "mapping": {
      // Optional: column-to-field mapping override
      "submission_id": "A",
      "Q01": "B",
      "Q02": "C"
    },
    "validation": "strict",  // 'strict' | 'lenient' | 'skip'
    "conflict_resolution": "skip",  // 'skip' | 'overwrite' | 'create_new'
    "encoding": "UTF-8",
    "sheet_name": "Data",    // For Excel imports
    "has_headers": true,
    "date_format": "YYYY-MM-DD"
  }
}

// Response 202 Accepted
{
  "data": {
    "import_id": "uuid",
    "status": "validating",
    "total_rows": 50000,
    "progress_percentage": 0
  }
}
```

### 3.3 Import Validation

Each import goes through validation phases:

```
Phase 1: File Validation
├── File type check
├── File size check (max 500MB)
├── Encoding detection (UTF-8 preferred)
├── Virus scan
└── Structure validation (headers, required columns)

Phase 2: Schema Mapping
├── Column header matching
├── Data type inference
├── Required field check
├── Unmapped column detection
└── Mapping preview available

Phase 3: Data Validation
├── Type coercion check
├── Range/constraint validation
├── Required field completeness
├── Reference integrity (study, questionnaire existing)
├── Duplicate detection
└── Custom validation rules

Phase 4: Import Execution
├── Batch processing (1000 records per batch)
├── Progress tracking
├── Error accumulation (non-fatal errors)
├── Rollback on fatal errors
└── Completion notification
```

### 3.4 Import Status Response

```json
{
  "data": {
    "import_id": "uuid",
    "status": "completed",
    "summary": {
      "total_rows": 50000,
      "accepted": 48750,
      "rejected": 1250,
      "warnings": 340
    },
    "errors": [
      {
        "row": 42,
        "field": "Q05_age",
        "value": "invalid",
        "error": "INVALID_TYPE",
        "message": "Expected numeric value, got text"
      }
    ],
    "mapping": {
      "submission_id": { "source": "A", "target": "submission_id" },
      "Q01_consent": { "source": "B", "target": "Q01" },
      "Q02_age": { "source": "C", "target": "Q02" }
    },
    "download_url": "https://storage.merline.app/imports/uuid/errors.csv",
    "completed_at": "2026-07-18T14:35:00Z"
  }
}
```

---

## 4. Mapping & Transformation Engine

### 4.1 Mapping Types

| Mapping Type | Description | Example |
|-------------|-------------|---------|
| **Direct** | Source field → target field (1:1) | `Column A → Q01` |
| **Constant** | Fixed value applied | `"approved" → status` |
| **Lookup** | Value from reference table | `Country code → country name` |
| **Formula** | Computed from source fields | `Q01 + Q02 → total_score` |
| **Conditional** | Value depends on condition | `if Q01 > 18 → "adult" else "minor"` |
| **Concatenation** | Merge multiple fields | `Q01 + " " + Q02 → full_name` |
| **Split** | One field to multiple targets | `full_address → street, city, zip` |
| **Enum map** | Value translation | `"M" → "Male", "F" → "Female"` |
| **Date parse** | Date format conversion | `"01/15/2026" → "2026-01-15"` |

### 4.2 Mapping Configuration

```json
{
  "import_id": "uuid",
  "mappings": [
    {
      "source": "respondent_id",
      "target": "submission_id",
      "type": "direct"
    },
    {
      "source": "age_years",
      "target": "Q02",
      "type": "direct",
      "transform": {
        "type": "integer",
        "min": 0,
        "max": 120
      }
    },
    {
      "source": "gender",
      "target": "Q03",
      "type": "enum_map",
      "mapping": {
        "M": "male",
        "F": "female",
        "O": "other"
      }
    },
    {
      "source": "consent",
      "target": "Q01",
      "type": "conditional",
      "condition": {
        "operator": "equals",
        "value": "yes"
      },
      "true_value": "1",
      "false_value": "0"
    },
    {
      "source": null,
      "target": "status",
      "type": "constant",
      "value": "submitted"
    }
  ]
}
```

---

## 5. Large File Transfer

### 5.1 Async Transfer (Export)

| Export Size | Handling | Method |
|-------------|----------|--------|
| < 100 MB | Synchronous (inline) | Direct response |
| 100 MB – 5 GB | Asynchronous job | Job queue → S3 signed URL |
| > 5 GB | Chunked + compressed | Multi-part download (parallel) |

### 5.2 Chunked Upload (Import)

Designed for large data imports (see `OFFLINE-SYNC.md` for media chunked upload):

| Import Size | Method | Max Chunks |
|-------------|--------|------------|
| < 50 MB | Single upload | 1 |
| 50 MB – 500 MB | Chunked (10 MB chunks) | 50 |
| > 500 MB | Chunked (50 MB chunks) | Unlimited |

### 5.3 Resumable Upload

```
POST /api/v1/uploads/initiate
{
  "file_name": "survey_data_2026.csv",
  "file_size": 524288000,
  "mime_type": "text/csv"
}

→ Returns upload_id, chunk_size, upload_url

PUT /api/v1/uploads/{uploadId}/chunks/{chunkIndex}
Headers: Content-Range: bytes {start}-{end}/{total}

→ 200 OK (chunk received)
→ 308 Resume Incomplete (with Upload-Range header for resume)

GET /api/v1/uploads/{uploadId}
→ 200 OK { chunks_received: [...], missing_chunks: [...] }

POST /api/v1/uploads/{uploadId}/complete
{
  "file_hash": "sha256-of-entire-file"
}

→ 201 Created → import job queued
```

---

## 6. Schema Mapping & Validation

### 6.1 Schema Discovery

When importing data, the system auto-discovers the schema:

```
Column Name    → Matches question code?
Data Values    → Matches expected type?
Required Fields → All present?
Unknown Columns → Flag as unmapped
```

### 6.2 Validation Rules

| Rule | Description | Phase |
|------|-------------|-------|
| **Required field** | Field must have non-null value | Schema |
| **Type check** | Value matches expected type (integer, string, date) | Schema |
| **Range check** | Value within min/max bounds | Data |
| **Option check** | Value is valid option for select/multi-select | Data |
| **Format check** | Value matches regex pattern | Data |
| **Uniqueness** | Field values unique in dataset | Data |
| **Reference check** | Foreign key exists (study, questionnaire) | Data |
| **Consistency check** | Cross-field logic holds (e.g., end > start) | Data |

### 6.3 Validation Response

Errors are returned in a structured format with a downloadable error file:

```json
{
  "errors": [
    {
      "row": 142,
      "column": "Q05_age_years",
      "value": "thirty-five",
      "error_type": "TYPE_MISMATCH",
      "message": "Expected numeric value, received text"
    }
  ],
  "warnings": [
    {
      "row": 143,
      "column": "Q07_gps_latitude",
      "value": "500",
      "error_type": "RANGE_EXCEEDED",
      "message": "Latitude outside valid range (-90 to 90)"
    }
  ],
  "error_csv_url": "https://storage.merline.app/imports/uuid/errors.csv"
}
```

---

## 7. Encoding & Localization

### 7.1 Character Encoding

| Format | Encoding | Notes |
|--------|----------|-------|
| CSV | UTF-8 (with BOM for Excel compatibility) | BOM ensures Excel reads UTF-8 correctly |
| Excel | UTF-8 internally | Handles all Unicode characters |
| JSON | UTF-8 | Standard JSON encoding |
| XML | UTF-8 (declared in XML prolog) | Standard |
| SPSS | UTF-8 | SPSS 25+ supports UTF-8 |
| Stata | UTF-8 | Stata 14+ supports Unicode |
| SAS | UTF-8 | SAS 9.4+ supports UTF-8 |
| Parquet | UTF-8 | Columnar, efficient |

### 7.2 Right-to-Left (RTL) Support

- CSV exports include BOM for Excel RTL rendering
- Excel exports set worksheet direction to LTR/RTL based on language
- JSON/XML: content-order preserved; rendering handled by consuming application
- Form imports preserve RTL text direction markers

### 7.3 Date/Number Format Handling

| Locale | Date Format | Decimal Separator | Thousand Separator |
|--------|-------------|-------------------|---------------------|
| English (US) | YYYY-MM-DD | . (period) | , (comma) |
| English (UK) | DD/MM/YYYY | . (period) | , (comma) |
| French | DD/MM/YYYY | , (comma) | (space) |
| Spanish | DD/MM/YYYY | , (comma) | . (period) |
| Arabic | DD/MM/YYYY | . (period) | , (comma) |
| Portuguese | DD/MM/YYYY | , (comma) | . (period) |

### 7.4 Configurable Export Locale

Exports accept a `locale` parameter that controls date/number formatting:

```json
{
  "format": "csv",
  "locale": "fr_FR",
  "options": {
    "date_format": "DD/MM/YYYY",
    "decimal_separator": ",",
    "thousand_separator": " "
  }
}
```

---

## 8. Export File Naming Convention

```
{prefix}_{study_code}_{format}_{datetime}.{extension}

Examples:
merline_export_BSL-2026-001_csv_20260718_143000.csv
merline_export_BSL-2026-001_spss_20260718_143000.sav
merline_export_BSL-2026-001_geojson_20260718_143000.geojson
```

---

## 9. Storage & Retention

| Aspect | Detail |
|--------|--------|
| **Export storage** | S3-compatible object storage (`/exports/{org}/{export-id}/`) |
| **Import storage** | S3-compatible object storage (`/imports/{org}/{import-id}/`) |
| **Export retention** | 7 days (auto-deleted via lifecycle policy) |
| **Import retention** | 30 days (source files kept for traceability) |
| **Error files** | Same retention as parent import/export |
| **Encryption** | AES-256 server-side encryption (SSE-S3) |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial data interchange architecture |
