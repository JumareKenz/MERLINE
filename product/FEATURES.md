# Merline Feature Catalogue

## Priority Definitions

| Priority | Definition |
|----------|------------|
| **P0** | Required for MVP. Platform cannot function without this. |
| **P1** | Required for Phase 2. Critical for user adoption and retention. |
| **P2** | Required for Phase 3+. Important for enterprise readiness and ecosystem. |

---

## Module 1: Authentication & Organization Management

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 1.1 | Email/Password Registration & Login | Standard authentication with email verification, password reset, MFA | P0 | Allows users to access the platform securely | AI-powered anomaly detection on login patterns | None |
| 1.2 | Organization Registration | Multi-tenant organization creation with admin user | P0 | Enables organizational separation of data | AI-assisted organization classification and setup recommendations | 1.1 |
| 1.3 | Organization Profile | Org name, logo, branding, timezone, language defaults | P1 | Customizes platform for each organization | None | 1.2 |
| 1.4 | Team Management | Create teams/sub-teams within organizations; assign members | P0 | Enables structured collaboration | AI-suggested team structures based on organization type | 1.1, 1.2 |
| 1.5 | Role-Based Access Control (RBAC) | Predefined roles (Admin, Manager, Researcher, Enumerator, Viewer) with granular permissions | P0 | Ensures data security and appropriate access | AI-recommended permission adjustments based on usage patterns | 1.1, 1.2, 1.4 |
| 1.6 | SAML/SSO Integration | Enterprise single sign-on via SAML 2.0, OAuth, OIDC | P2 | Enables enterprise adoption; reduces password fatigue | None | 1.1 |
| 1.7 | Audit Logs | Complete audit trail of all user actions | P2 | Compliance, security, and accountability | AI anomaly detection on audit events | 1.1, 1.5 |
| 1.8 | Multi-factor Authentication | TOTP, SMS, or authenticator app based 2FA | P1 | Enhanced security for sensitive data | None | 1.1 |
| 1.9 | User Profile & Preferences | User profile, language preference, notification settings, timezone | P1 | Personalizes user experience | None | 1.1 |
| 1.10 | Session Management | View active sessions, force logout, device management | P1 | Security control for users | AI-powered session risk scoring | 1.1 |

---

## Module 2: Project & Study Management

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 2.1 | Project Creation | Create named projects with description, dates, status | P0 | Organizes work into logical containers | AI-suggested project templates based on organization type | 1.2 |
| 2.2 | Study Configuration | Configure study within project: type (baseline, midline, endline, cross-sectional), methodology (quant, qual, mixed), target population | P0 | Defines research parameters formally | AI-recommends study methodology based on project context | 2.1 |
| 2.3 | Project Dashboard | Project overview: status, progress, recent activity, key metrics | P1 | Provides at-a-glance project health | AI-generated project status summary and risk indicators | 2.1, 2.2 |
| 2.4 | Study Lifecycle Management | Status workflow: Draft → Approved → In Progress → Data Collection → Analysis → Complete → Archived | P0 | Guides studies through structured lifecycle | AI-predicts study timelines based on historical data | 2.2 |
| 2.5 | Study Cloning | Clone existing study as template for new study | P1 | Reduces重复 work for similar studies | AI-suggests modifications based on new study context | 2.2 |
| 2.6 | Project Calendar | Timeline view of studies, milestones, data collection periods | P2 | Visual project scheduling | AI-optimized scheduling based on resource constraints | 2.2, 2.4 |
| 2.7 | Study Archive & Restoration | Archive completed studies; restore if needed | P1 | Keeps workspace clean without data loss | None | 2.4 |
| 2.8 | Cross-Project Sharing | Share indicators, questionnaires, templates across projects | P2 | Promotes standardization and reuse | AI-recommends relevant assets from other projects | 2.1, 3.2 |

---

## Module 3: Research Design (Theory of Change, LogFrame, Indicators)

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 3.1 | Theory of Change Builder | Visual canvas to design ToC: inputs → activities → outputs → outcomes → impact with causal links | P1 | Formalizes program logic in a structured, visual way | AI-suggests ToC components based on sector and intervention type | 2.2 |
| 3.2 | Logical Framework Builder | Structured LogFrame matrix with goal, purpose, outputs, activities, indicators, means of verification, assumptions | P1 | Creates donor-ready logical framework | AI-generates LogFrame draft from ToC | 3.1 |
| 3.3 | Indicator Library | Reusable indicator definitions with name, description, type (quant/qual), unit, disaggregation, numerator, denominator, target, baseline | P0 | Standardizes measurement across studies | AI-suggests indicators based on ToC and LogFrame | 3.1, 3.2 |
| 3.4 | Indicator Versioning | Version control for indicator definitions; track changes over time | P1 | Prevents indicator drift; maintains data comparability | None | 3.3 |
| 3.5 | Indicator-to-Question Mapping | Link indicator to specific questionnaire questions that measure it | P0 | Creates traceability from indicator to data point | AI-automatically maps questions to indicators based on content analysis | 3.3, 4.6 |
| 3.6 | Sampling Framework | Define sampling strategy: random, stratified, cluster, purposive, snowball; calculate sample size | P2 | Ensures statistical validity of research | AI-calculates optimal sample size based on study parameters | 2.2 |
| 3.7 | Research Protocol Document Generator | Generate downloadable protocol document from study configuration | P2 | Produces formal research protocol for IRB/ethics approval | AI-writes protocol sections based on study configuration | 2.2, 3.2, 3.3 |

---

## Module 4: Questionnaire / Survey Builder

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 4.1 | Question Type Library | Text, number, date, select one, select multiple, Likert scale, ranking, matrix, GPS, photo, audio, video, barcode, signature, file upload | P0 | Covers all common data collection needs | AI-recommends optimal question types for data needed | 2.2 |
| 4.2 | Drag-and-Drop Form Builder | Visual builder with drag-and-drop question organization | P0 | Enables non-technical users to create surveys | None | 4.1 |
| 4.3 | Skip Logic / Conditional Branching | Define question visibility based on previous answers | P0 | Creates intelligent, adaptive questionnaires | AI-suggests skip patterns based on question content | 4.2 |
| 4.4 | Validation Rules | Required, min/max, pattern match, uniqueness, range, custom constraints | P0 | Enforces data quality at collection point | AI-suggests validation rules based on question type and context | 4.2 |
| 4.5 | Multi-language Support | Define questionnaire in multiple languages with fallback | P0 | Enables field work in multilingual contexts | AI-powered translation suggestions for question text | 4.2 |
| 4.6 | Indicator Linking | Link questions to indicators from indicator library | P0 | Creates traceability from data point to indicator | AI-auto-links questions to relevant indicators | 3.3, 4.2 |
| 4.7 | Question Bank | Reusable library of validated questions | P1 | Reduces design time; promotes standardization | AI-suggests relevant questions from bank based on study context | 4.1 |
| 4.8 | Form Preview | Preview questionnaire as user would see it on web and mobile | P0 | Allows design validation before deployment | None | 4.2 |
| 4.9 | Form Versioning | Version controlled forms; track changes; deploy specific versions | P1 | Prevents data inconsistencies from form changes | None | 4.2 |
| 4.10 | Form Testing / Pilot Mode | Test form with sample data before going live | P1 | Validates form logic and question clarity | AI-identifies potential confusing questions based on pilot response patterns | 4.8 |
| 4.11 | Calculated Fields | Compute values from other responses (sums, averages, scores) | P2 | Reduces post-collection computation | AI-suggests useful calculated fields based on indicator requirements | 4.2 |
| 4.12 | Multimedia Questions | Capture photo, audio, video, signature within form | P0 | Enables rich data collection | AI-powered photo analysis, speech-to-text for audio responses | 4.1 |
| 4.13 | Repeating Groups / Roster | Repeat a set of questions for each member of a household, etc. | P0 | Essential for household and institutional surveys | None | 4.2 |

---

## Module 5: Data Collection (Mobile + Web)

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 5.1 | Offline-First Mobile App | Full offline capability: download forms, collect data, capture media, submit when connected | P0 | Enables data collection in remote areas | Offline AI: on-device validation, anomaly detection | 4.0 (all form builder features) |
| 5.2 | Web Data Entry | Same forms available via web browser for online/CAPI data collection | P0 | Enables online data entry and call center operations | None | 4.0 |
| 5.3 | Assignment Management | Assign forms to specific enumerators or teams | P0 | Controls who collects what data | AI-optimized assignment based on enumerator location, skills, workload | 1.4, 4.10 |
| 5.4 | GPS Capture | Automatic GPS capture at form start, or manual point/line/polygon capture | P0 | Enables geospatial data collection and verification | None | 4.12 |
| 5.5 | Media Capture & Management | Photo, audio, video capture with size optimization, compression, preview | P0 | Rich data collection in field | AI-image analysis, voice-to-text, auto-tagging | 4.12 |
| 5.6 | Auto-Sync on Connectivity | Automatic submission of collected data when network becomes available | P0 | Reduces manual sync burden | Predictive sync based on connectivity patterns | 5.1 |
| 5.7 | Sync Status Indicator | Clear visual indicators for synced, pending, failed submissions | P0 | User confidence in data safety | None | 5.1, 5.6 |
| 5.8 | Conflict Resolution | Handle concurrent edits; last-write-wins or manual resolution | P1 | Prevents data loss from sync conflicts | AI-merges conflicting responses where safe | 5.1, 5.6 |
| 5.9 | Partial Save / Resume | Save partial form and resume later; preserve state on app crash | P0 | Prevents data loss in field conditions | None | 5.1 |
| 5.10 | Deploy Form Updates | Push form updates to mobile devices; force or optional update | P1 | Corrects errors in live forms without redeploying app | None | 4.9, 5.1 |
| 5.11 | Enumerator Dashboard | View assigned surveys, completed count, pending count, earnings (if applicable) | P0 | Enumerator self-management | AI-predicts completion time based on past performance | 5.3 |
| 5.12 | Supervisor Dashboard | View team progress, individual enumerator stats, quality flags | P0 | Field team management | AI-identifies enumerators needing support, potential fraud | 5.3, 5.11 |
| 5.13 | Device Management | Register, approve, block devices; device health monitoring | P2 | Security and device fleet management | AI-detects compromised or unusual device behavior | 5.1 |
| 5.14 | Language Switching | Switch app language independent of form language | P1 | Accessibility for enumerators | None | 5.1 |

---

## Module 6: Data Quality & Validation

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 6.1 | Real-time Validation | Validation rules enforced at data entry (required, range, format, pattern) | P0 | Prevents errors at source | None (deterministic by design) | 4.4 |
| 6.2 | Data Quality Dashboard | Overview of data quality across studies: completeness, outliers, consistency | P1 | Visibility into overall data health | AI-quality scoring per submission, per enumerator, per question | 5.0, 6.1 |
| 6.3 | Automated Outlier Detection | Statistical detection of outliers in numeric responses | P1 | Identifies potential data errors automatically | AI-adaptive outlier thresholds based on data distribution | 6.1 |
| 6.4 | Duplicate Detection | Identify potential duplicate submissions based on key fields | P1 | Prevents double-counting | AI-fuzzy matching for near-duplicate detection | 5.0 |
| 6.5 | Anomaly Flagging | Flag unusual response patterns (straight-lining, speeding, GIS inconsistencies) | P1 | Identifies enumerator fraud or error | AI-pattern recognition across submissions, enumerators, time periods | 6.2 |
| 6.6 | Manual Review Workflow | Flagged submissions routed for manual review and approval/rejection | P1 | Human-in-the-loop quality control | AI-prioritizes review queue by severity | 6.2, 6.3, 6.4, 6.5 |
| 6.7 | Data Editing & Locking | Edit submitted data with audit trail; lock forms to prevent further edits | P1 | Corrects errors while maintaining data integrity | AI-suggests corrections based on patterns | 5.0, 6.6 |
| 6.8 | Data Quality Reports | Scheduled/on-demand reports on data quality metrics | P2 | Formal quality documentation for donors | AI-generates quality report narrative | 6.2 |
| 6.9 | Real-time Monitoring Rules | Custom rules that trigger alerts (e.g., "alert if >10% of responses are null") | P2 | Proactive quality management | AI-recommends monitoring rules based on study design | 6.1 |

---

## Module 7: Analytics & Dashboards

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 7.1 | Built-in Dashboard Builder | Drag-and-drop dashboard builder with charts, tables, maps, KPIs | P0 | Self-service analytics for non-technical users | AI-recommended chart types for selected data | 5.0 |
| 7.2 | Pre-built Study Dashboard | Auto-generated dashboard showing key study metrics | P0 | Instant visibility without configuration | AI-selects relevant visualizations based on study design | 2.2, 5.0 |
| 7.3 | Indicator Tracking Dashboard | Progress against indicator targets with RAG (Red/Amber/Green) status | P1 | Performance monitoring against targets | AI-predicts indicator achievement based on current trends | 3.3, 5.0 |
| 7.4 | Cross-Tabulation | Create cross-tabulation tables for any two or more questions | P1 | Comparative analysis | AI-suggests relevant cross-tabulations based on study hypotheses | 5.0, 7.1 |
| 7.5 | GIS Mapping | Plot data points on map; heat maps, choropleth, cluster maps | P1 | Geospatial analysis | AI-detect spatial patterns and clusters | 5.4, 7.1 |
| 7.6 | Filtering & Segmentation | Filter and segment data by any variable; save filter presets | P0 | Exploratory data analysis | AI-suggests meaningful segments based on data patterns | 5.0 |
| 7.7 | Export Dashboard | Export dashboard snapshot as PDF, PNG, or shareable link | P1 | Communication of findings | None | 7.1 |
| 7.8 | Scheduled Dashboard Emails | Send dashboard snapshots on schedule to stakeholders | P2 | Automated reporting | None | 7.1 |
| 7.9 | Custom KPI Builder | Define custom KPIs from one or more indicators with formulas | P2 | Tailored performance metrics | AI-suggests useful KPIs based on study design | 3.3, 7.1 |

---

## Module 8: Reporting

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 8.1 | Report Template Library | Pre-built report templates (donor report, evaluation report, executive brief) | P0 | Standardized reporting | AI-recommends template based on study type and audience | 7.1 |
| 8.2 | One-Click Report Generation | Generate complete report from template with live data | P0 | Eliminates manual report compilation | AI-writes narrative sections, executive summary, recommendations | 8.1, 5.0 |
| 8.3 | Custom Report Builder | WYSIWYG report editor with drag-and-drop sections, charts, tables | P1 | Custom reports for specific needs | None | 8.1 |
| 8.4 | Report Sections | Executive summary, methodology, findings, conclusions, recommendations, annexes | P0 | Complete report structure | AI-generates each section from live data and study configuration | 8.2 |
| 8.5 | AI Executive Summary | Auto-generated executive summary highlighting key findings | P1 | Time-saving for executives | AI-synthesizes key findings into concise narrative | 8.2 |
| 8.6 | AI Recommendations | Auto-generated recommendations based on data findings | P2 | Actionable insights | AI-generates evidence-based recommendations | 8.2 |
| 8.7 | Export Formats | PDF, Word, HTML, PowerPoint | P1 | Stakeholder-specific formats | None | 8.2 |
| 8.8 | Branded Reports | Organization logo, color scheme, custom cover page | P1 | Professional, branded outputs | None | 8.2 |
| 8.9 | Report Versioning | Version history for reports; re-generate with updated data | P2 | Tracking report evolution | None | 8.2 |
| 8.10 | Scheduled Reports | Generate and distribute reports on a schedule (weekly, monthly, quarterly) | P2 | Automated recurring reporting | None | 8.2 |

---

## Module 9: AI Capabilities

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 9.1 | AI Research Design Assistant | Assist in ToC, LogFrame, indicator design based on study context | P1 | Accelerates research design | Core AI capability — suggests, validates, improves design | 3.1, 3.2, 3.3 |
| 9.2 | AI Questionnaire Assistant | Suggest questions, skip logic, validation rules based on indicators | P1 | Accelerates form design | Generates and refines questionnaire content | 3.5, 4.0 |
| 9.3 | AI Data Quality Engine | Real-time anomaly detection, fraud detection, quality scoring | P1 | Proactive quality assurance | Detects patterns humans cannot manually find | 6.0 |
| 9.4 | AI Report Writer | Generate report narrative, executive summary, recommendations | P1 | Eliminates manual report writing | Synthesizes data into coherent narrative | 8.0 |
| 9.5 | AI Insight Engine | Natural language query of data ("What is the vaccination rate in region X?") | P2 | Democratizes data access | NLQ-to-visualization pipeline | 7.0 |
| 9.6 | AI Knowledge Assistant | Answer questions about past studies, indicators, best practices (RAG) | P2 | Institutional memory retrieval | RAG over organizational knowledge base | 10.0 |
| 9.7 | AI Translation | Translate forms and reports between languages | P2 | Multi-language support | Machine translation with MERL-optimized vocabulary | 4.5, 8.0 |
| 9.8 | AI Photo Analysis | Analyze field photos (count objects, read meters, classify) | P2 | Automated data extraction from images | Computer vision models | 5.5 |
| 9.9 | AI Voice-to-Text | Transcribe audio responses and FGD recordings | P2 | Qualitative data processing | Speech recognition optimized for field conditions | 5.5 |

---

## Module 10: Knowledge Management

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 10.1 | Evidence Repository | Searchable repository of all studies, reports, findings | P1 | Institutional memory preservation | AI-tagging, auto-categorization, semantic search | 2.0, 8.0 |
| 10.2 | Cross-Study Search | Search across all studies, indicators, questionnaires, reports | P2 | Find relevant past work | AI-semantic search for natural language queries | 10.1 |
| 10.3 | Lessons Learned Registry | Structured capture of lessons learned from each study | P2 | Organizational learning | AI-surfaces lessons from data and user input | 10.1 |
| 10.4 | Best Practice Library | Curated MERL best practices; organization-specific SOPs | P2 | Consistent methodology | AI-recommends best practices based on study type | 10.1 |
| 10.5 | Study Comparison | Compare findings, indicators, or methodologies across studies | P2 | Longitudinal and cross-study analysis | AI-identifies trends and patterns across studies | 10.1 |

---

## Module 11: Administration & Permissions

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 11.1 | Organization Settings | Configure organization-wide defaults: language, timezone, branding, data retention | P1 | Tailored platform for each org | None | 1.2 |
| 11.2 | User Management | Invite, suspend, delete users; assign roles | P0 | Access control | AI-suggests role assignments based on user behavior | 1.1, 1.5 |
| 11.3 | Permission Policies | Define who can create projects, design forms, collect data, view data, export, delete | P0 | Granular access control | AI-recommends permission policies based on org structure | 1.5 |
| 11.4 | Data Retention Policies | Automatic archiving/deletion of data based on rules | P2 | Compliance with data protection laws | None | 11.1 |
| 11.5 | Usage Analytics | Dashboard showing platform usage: active users, forms, submissions, storage | P2 | Platform governance and capacity planning | AI-predicts usage trends and resource needs | 1.1 |
| 11.6 | Billing & Subscription Management | Plan management, invoices, payment methods | P2 | Commercial operations | None | 1.2 |

---

## Module 12: Integrations

| # | Feature | Description | Priority | User Value | AI Opportunity | Dependencies |
|---|---------|-------------|----------|------------|----------------|--------------|
| 12.1 | REST API | Full API access for all platform capabilities | P1 | Extensibility and automation | None | All modules |
| 12.2 | Webhook System | Event-based webhooks for real-time integration | P2 | Real-time data flow to other systems | None | 12.1 |
| 12.3 | Data Import | Import data from CSV, Excel, JSON, XML | P1 | Onboarding existing data | AI-maps imported columns to platform fields | 5.0 |
| 12.4 | Data Export | Export raw data, indicators, reports to multiple formats | P0 | Data portability and offline analysis | None | 5.0 |
| 12.5 | DHIS2 Connector | Bidirectional sync of indicators and data with DHIS2 | P2 | Government health systems integration | AI-maps Merline indicators to DHIS2 data elements | 3.3 |
| 12.6 | KoboToolbox Import | Import forms and data from KoboToolbox | P2 | Migration from existing platforms | AI-handles format conversion | 4.0 |
| 12.7 | Power BI / Tableau Connector | Live data connector for external BI tools | P2 | Enterprise BI integration | None | 7.0 |
| 12.8 | Zapier / Make.com Integration | Low-code integration with 5,000+ apps | P2 | Non-technical workflow automation | None | 12.1 |

---

## Feature Summary

| Priority | Count | Percentage |
|----------|-------|------------|
| P0 | 36 | 34% |
| P1 | 39 | 37% |
| P2 | 31 | 29% |
| **Total** | **106** | **100%** |
