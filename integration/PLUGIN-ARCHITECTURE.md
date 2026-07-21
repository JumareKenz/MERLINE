# Merline Plugin Architecture

## Document Control

| Version | Date | Author | Status |
|---------|------|--------|--------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Final |

---

## 1. Plugin System Overview

Merline's plugin system allows third-party developers to extend platform functionality without modifying core code. Plugins are self-contained packages that hook into defined extension points.

```
┌───────────────────────────────────────────────────────────────┐
│                     MERLINE CORE PLATFORM                       │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Extension   │  │ Lifecycle   │  │ Plugin API            │  │
│  │ Point       │  │ Manager     │  │ (Sandboxed)           │  │
│  │ Registry    │  │             │  │                       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                │                     │              │
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                      PLUGIN SANDBOX                             │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Plugin A    │  │ Plugin B    │  │ Plugin C              │  │
│  │ (Dashboard  │  │ (Export     │  │ (AI Model Provider)   │  │
│  │  Widget)    │  │  Format)    │  │                       │  │
│  └─────────────┘  └─────────────┘  └──────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Extension Points

### 2.1 Available Extension Points

| Extension Point | Hook Method | Description | Plugin Type |
|----------------|-------------|-------------|-------------|
| **Dashboard Widget** | `registerDashboardWidgets()` | Custom React/Vue widgets rendered in dashboard grid | Widget |
| **Report Section** | `registerReportSections()` | Custom content generators for report sections | Report |
| **Export Format** | `registerExportFormats()` | Custom serialization for data export | Data |
| **Import Handler** | `registerImportHandlers()` | Custom format parsers for data import | Data |
| **Validation Rule** | `registerValidationRules()` | Custom PHP/Laravel validation rules | Workflow |
| **Notification Channel** | `registerNotificationChannels()` | Custom delivery backends for notifications | Communication |
| **AI Model Provider** | `registerAiModels()` | Custom AI model connector (self-hosted, proprietary) | AI |
| **Data Transformation** | `registerTransformations()` | Custom data mapping/transform functions | Data |
| **Webhook Action** | `registerWebhookActions()` | Custom actions triggered by webhook events | Integration |
| **Authentication Method** | `registerAuthMethods()` | Custom IdP/protocol support | Security |
| **Field Type** | `registerFieldTypes()` | Custom question/field types for survey builder | Questionnaire |
| **Chart Type** | `registerChartTypes()` | Custom visualization types for dashboards | Visualization |
| **Sync Transport** | `registerSyncTransports()` | Custom sync protocols for offline data | Sync |
| **Storage Backend** | `registerStorageBackends()` | Custom object storage or database drivers | Infrastructure |

### 2.2 Extension Point Interface

```php
interface ExtensionPointInterface
{
    public function id(): string;
    public function name(): string;
    public function description(): string;
    public function version(): string;
    public function register(): void;
    public function unregister(): void;
}
```

### 2.3 Dashboard Widget Extension Point

```php
// Plugins register widget components

class MyDashboardPlugin extends PluginBase
{
    public function registerDashboardWidgets(): array
    {
        return [
            new DashboardWidget(
                id: 'my-custom-widget',
                name: 'Custom KPI Widget',
                description: 'Displays custom KPIs from external system',
                component: 'MyCustomWidget',       // React component name
                configSchema: [
                    'kpi_type' => ['type' => 'string', 'required' => true],
                    'refresh_interval' => ['type' => 'integer', 'default' => 300],
                ],
                defaultSize: ['w' => 3, 'h' => 2],
                permissions: ['dashboard:widget:my-custom-widget']
            )
        ];
    }
}
```

### 2.4 Export Format Extension Point

```php
class SPSSExportPlugin extends PluginBase
{
    public function registerExportFormats(): array
    {
        return [
            new ExportFormat(
                id: 'spss',
                name: 'SPSS (.sav)',
                mimeType: 'application/x-spss-sav',
                extension: '.sav',
                handler: SPSSExportHandler::class,
                maxRows: 1000000
            )
        ];
    }
}
```

---

## 3. Plugin Lifecycle

### 3.1 Lifecycle States

```
Discovered → Installed → Activated → Deactivated → Uninstalled
                │                        │
                ▼                        ▼
            InstallFailed            DeactivateFailed
```

| State | Description |
|-------|-------------|
| **Discovered** | Plugin detected in filesystem or marketplace |
| **Installed** | Plugin code deployed, dependencies verified |
| **Activated** | Plugin extension points registered, running in production |
| **Deactivated** | Plugin extension points unregistered, data preserved |
| **Uninstalled** | Plugin fully removed, data cleaned up per policy |
| **InstallFailed** | Installation blocked (validation, dependency, security) |
| **DeactivateFailed** | Deactivation blocked (active dependencies) |

### 3.2 Lifecycle Methods

```php
abstract class PluginBase implements PluginInterface
{
    // Required
    abstract public function manifest(): PluginManifest;
    
    // Lifecycle hooks
    public function onInstall(): void {}     // Setup: create tables, register routes
    public function onActivate(): void {}    // Enable: register extension points
    public function onDeactivate(): void {}  // Disable: unregister extension points
    public function onUninstall(): void {}   // Cleanup: remove data
    public function onUpdate(string $fromVersion, string $toVersion): void {}  // Migration
    
    // Health check
    public function health(): PluginHealth;
    
    // Configuration
    public function configSchema(): array;
    public function defaultConfig(): array;
}
```

### 3.3 Installation Flow

```
1. Plugin submitted → validation checks:
   - Manifest validity (name, version, author, extension points)
   - Dependency graph check (required core version, other plugins)
   - Security scan (static analysis, known vulnerability check)
   - Capability declaration review
   
2. If validation passes → staged installation:
   - Plugin code deployed to sandbox directory
   - Database migrations run (if any)
   - Configuration defaults written
   
3. Plugin set to Installed state → admin must activate:
   - Review capabilities/permissions requested
   - Configure plugin settings
   - Explicit activate action
   
4. On activation:
   - Extension points registered
   - Routes mounted (if applicable)
   - Listeners attached to event bus
```

---

## 4. Plugin Sandboxing & Security

### 4.1 Security Layers

| Layer | Protection | Implementation |
|-------|------------|----------------|
| **Execution isolation** | PHP process isolation | Plugins run in separate process space via Laravel queue workers with separate Horizon configuration |
| **File system isolation** | Read-only access to plugin directory | Plugin can only write to its designated `storage/plugin-{id}/` directory |
| **Database isolation** | Scoped database access | Plugin gets dedicated schema (`plugin_{id}`) or prefixed tables |
| **Network isolation** | Egress control | Plugin HTTP requests must go through Merline's HTTP client with allowlisted domains |
| **Extension point sandbox** | Input/output validation | All data passed through extension points validated against declared schemas |
| **Resource limits** | CPU, memory, execution time | Queue worker per plugin with configured limits (max_execution_time, memory_limit) |
| **Event isolation** | Scoped event subscription | Plugins can only subscribe to events they've declared |
| **Capability declaration** | Explicit permissions | Plugin manifest declares required capabilities; user approves on activation |

### 4.2 Plugin Manifest Requirements

```json
{
  "id": "my-analytics-plugin",
  "name": "Custom Analytics",
  "version": "1.2.0",
  "author": {
    "name": "Developer Name",
    "email": "dev@example.com",
    "url": "https://example.com"
  },
  "requires": {
    "core": ">=2.5.0",
    "php": ">=8.2",
    "extensions": ["json", "mbstring"],
    "plugins": []
  },
  "capabilities": [
    "extension-points:dashboard-widget",
    "extension-points:export-format",
    "network:http:outbound",
    "storage:read:plugin-data",
    "storage:write:plugin-data"
  ],
  "extensionPoints": {
    "dashboard-widgets": ["my-kpi-widget"],
    "export-formats": ["my-custom-format"]
  },
  "permissions": [
    "dashboard:widget:my-kpi-widget",
    "data:export:my-custom-format"
  ],
  "configSchema": { ... },
  "screenshots": ["screenshot-1.png"],
  "marketplace": {
    "category": "analytics",
    "pricing": "free",
    "supportUrl": "https://example.com/support"
  }
}
```

### 4.3 Capability Declaration

| Capability | Description | Risk Level |
|------------|-------------|------------|
| `network:http:outbound` | Make HTTP requests to external URLs | Medium |
| `network:webhook:receive` | Receive incoming webhooks | Low |
| `storage:read:core-data` | Read core platform data (studies, submissions) | High |
| `storage:write:core-data` | Write to core platform data | Critical |
| `storage:read:plugin-data` | Read own plugin storage | Low |
| `storage:write:plugin-data` | Write own plugin storage | Low |
| `ui:modify:dashboard` | Inject custom UI into dashboards | Medium |
| `ui:modify:report` | Inject custom content into reports | Medium |
| `event:subscribe` | Subscribe to platform events | Low |
| `event:publish` | Publish events to event bus | Low |
| `admin:settings` | Read/write admin configuration | Critical |

---

## 5. Plugin API Surface

### 5.1 Plugin-only API Endpoints

Plugins can register their own API endpoints, which are automatically prefixed and authenticated:

```
/api/v1/plugins/{plugin-id}/my-endpoint
```

### 5.2 Plugin Data Storage

Each plugin gets a key-value store and optional database tables:

```php
// Plugin key-value store
$this->storage()->get('my_setting', 'default');
$this->storage()->set('my_setting', 'value');
$this->storage()->delete('my_setting');

// Plugin database access (dedicated schema or prefixed)
$this->db()->table('plugin_analytics_events')->insert([...]);
```

### 5.3 Plugin Event Hooks

```php
// Subscribe to core events
$this->events()->listen('study.created', function ($event) {
    // React to study creation
});

// Access core services (scoped to plugin permissions)
$this->core()->studies()->find($studyId);
$this->core()->indicators()->list(['study_id' => $studyId]);

// Publish events
$this->events()->dispatch('plugin.my-event', $payload);
```

---

## 6. Plugin Marketplace Design

### 6.1 Marketplace Structure

```
marketplace.merline.app/
├── Browse
│   ├── Categories (Analytics, Data, Visualization, AI, Integration, Workflow)
│   ├── Featured
│   ├── Popular
│   └── New Releases
├── Search & Filter
│   ├── By category, price, rating, compatibility
│   └── By extension point type
├── Plugin Detail Page
│   ├── Description, screenshots, version history
│   ├── Rating & reviews
│   ├── Pricing (free, one-time, subscription)
│   ├── Permissions required (capability declaration)
│   └── Installation guide
├── Developer Dashboard
│   ├── Plugin management
│   ├── Analytics (installs, active users, ratings)
│   ├── Version management
│   └── Revenue reports
└── Admin Console
    ├── Plugin review queue
    ├── Plugin approval/ rejection
    ├── Security audit results
    └── Marketplace analytics
```

### 6.2 Marketplace Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Dashboard Widgets** | Custom visualizations for dashboards | GIS heatmap widget, Social network analysis |
| **Export Formats** | Custom data export formats | SPSS, Stata, SAS exporters |
| **Import Handlers** | Custom data import support | FHIR, HL7 message import |
| **AI Models** | Custom AI model connectors | Local LLM, domain-specific models |
| **Validation Rules** | Custom field validation | Phone number format, national ID checks |
| **Notification Channels** | Custom notification delivery | Telegram, Signal, custom webhook |
| **Connector Packs** | Custom third-party integrations | Custom API connector for bespoke systems |
| **Report Templates** | Custom report templates | WHO format, donor-specific templates |
| **Questionnaire Templates** | Custom survey templates | MICS, DHS survey modules |
| **Workflow Packages** | Custom automation workflows | Data approval chain, conditional notifications |

### 6.3 Pricing Models

| Model | Description | Platform Fee |
|-------|-------------|--------------|
| **Free** | No cost to install | 0% |
| **One-time purchase** | Single payment, permanent license | 20% |
| **Subscription** | Monthly/yearly recurring | 20% |
| **Usage-based** | Per API call, per data point, per user | 15% |
| **Custom** | Enterprise pricing, volume discounts | Negotiated |

---

## 7. Plugin Validation & Review Process

### 7.1 Automated Validation

| Check | Description | Gate |
|-------|-------------|------|
| Manifest validation | Required fields, format, version constraints | Reject if invalid |
| Dependency resolution | Core version, PHP extensions, plugin dependencies | Reject if unsatisfiable |
| Static analysis | PHPStan level 6, security linters | Warning / Reject |
| Vulnerability scan | Known CVEs in dependencies | Reject if critical |
| Capability consistency | Declared vs. actually used capabilities | Warning if mismatch |
| Test suite execution | Plugin unit tests must pass | Reject if failures |
| Schema validation | Database migrations checked for safety | Reject if destructive |

### 7.2 Manual Review

| Criteria | Reviewer | Description |
|----------|----------|-------------|
| Code quality | Merline engineer | Readability, architecture, error handling |
| Security | Security architect | Data handling, authentication, network use |
| Performance | DevOps engineer | Query patterns, resource usage, caching |
| UX & UI | Product designer | Consistency with Merline design system |
| Documentation | Technical writer | README, configuration guide, troubleshooting |
| Value proposition | Product manager | Does it solve a real problem? |

### 7.3 Review Tiers

| Tier | Turnaround | Requirements | Suitable For |
|------|------------|--------------|--------------|
| **Automated** | < 1 hour | Passes automated checks | Simple plugins, internal plugins |
| **Standard** | 1-3 business days | Automated + manual review | Most marketplace plugins |
| **Extended** | 5-10 business days | Automated + manual + security audit | High-risk plugins (core data access, network outbound) |

---

## 8. Plugin Versioning & Compatibility

### 8.1 Version Scheme

```
Semantic Versioning (MAJOR.MINOR.PATCH)
```

| Component | MAJOR | MINOR | PATCH |
|-----------|-------|-------|-------|
| **Core Platform** | Breaking API changes | New features, backward compatible | Bug fixes |
| **Plugin** | Breaking changes for users | New features, backward compatible | Bug fixes |
| **Extension Point** | Signature/behavior change | New extension points added | Bug fixes |

### 8.2 Compatibility Matrix

```json
{
  "plugin": "my-plugin",
  "pluginVersion": "1.2.0",
  "compatibleWith": {
    "core": ">=2.5.0 <3.0.0",
    "php": ">=8.2",
    "otherPlugins": {
      "base-plugin": "^1.0.0"
    }
  }
}
```

### 8.3 Update Flow

```
1. Developer publishes new plugin version to marketplace
2. Marketplace validates the update package
3. Existing installations notified via in-app notification
4. Admin reviews changes (new capabilities, breaking changes)
5. Admin schedules update (immediate or maintenance window)
6. Plugin.onUpdate() called with fromVersion and toVersion
7. Database migrations run (if any)
8. Extension points re-registered
9. Update logged in audit trail
10. Rollback available for 48 hours (previous version retained)
```

---

## 9. Plugin Development Guide

### 9.1 Getting Started for Plugin Authors

```
# 1. Install the Merline plugin scaffolding tool
composer create-project merline/plugin-skeleton my-plugin

# 2. Implement your plugin
class MyPlugin extends PluginBase
{
    public function manifest(): PluginManifest
    {
        return new PluginManifest(
            id: 'my-plugin',
            name: 'My Plugin',
            version: '1.0.0',
            // ...
        );
    }
    
    public function registerDashboardWidgets(): array { /* ... */ }
}

# 3. Test locally
vendor/bin/phpunit
./merline plugin:test my-plugin

# 4. Package for distribution
./merline plugin:package my-plugin

# 5. Submit to marketplace
# Upload the generated .merline-plugin file to developer.merline.app
```

### 9.2 Plugin File Structure

```
my-plugin/
├── manifest.json              # Required: Plugin manifest
├── composer.json              # PHP dependencies
├── src/
│   ├── MyPlugin.php           # Main plugin class
│   ├── Widgets/
│   │   └── MyWidget.php       # Widget extension
│   ├── Handlers/
│   │   └── MyExportHandler.php
│   └── Resources/
│       └── assets/
│           └── widget.jsx     # Frontend assets
├── resources/
│   ├── views/
│   └── lang/
├── tests/
│   ├── MyPluginTest.php
│   └── Handlers/
├── database/
│   └── migrations/
│       └── 2026_01_01_create_my_tables.php
├── screenshots/
│   └── widget-preview.png
└── README.md
```

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-18 | Enterprise Integration & Ecosystem Architect | Initial plugin architecture |
