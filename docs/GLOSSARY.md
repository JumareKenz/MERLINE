# Merline Platform Glossary

## Version: 1.0.0 | Owner: MERL Domain Expert | Status: Draft

---

## A

| Term | Definition | See Also |
|------|------------|----------|
| **Activity** | A specific action or process undertaken to produce outputs. In MERL, activities are what programs do with inputs to create outputs. | Output, Input |
| **ADR** | Architecture Decision Record. A document that captures an important architectural decision along with its context, alternatives, and consequences. | Decision History |
| **AI Gateway** | The service that routes all AI requests to the appropriate model based on cost, latency, and capability requirements. | Model Router |
| **Assignment** | A task assigning a specific questionnaire to a specific enumerator, typically with a target count and due date. | Enumerator |
| **Audit Log** | An immutable, append-only record of all significant actions on the platform, used for security, compliance, and accountability. | |

## B

| Term | Definition | See Also |
|------|------------|----------|
| **Baseline** | An initial measurement of indicators before a program intervention begins, used for later comparison. | Endline, Midline |
| **Bearer Token** | An authentication token included in HTTP headers to authorize API requests. | JWT |

## C

| Term | Definition | See Also |
|------|------------|----------|
| **C4 Model** | A hierarchical approach to documenting software architecture: Context, Container, Component, Code. | System Architecture |
| **CAPI** | Computer-Assisted Personal Interviewing. Data collection where an enumerator uses a device to record responses during an in-person interview. | |
| **CDC** | Change Data Capture. A method of tracking database changes for replication or analytics pipelines. | |
| **Confidence Score** | A numerical value (0.0-1.0) indicating how confident the AI is in a particular output. | AI Guide |
| **Cross-Tabulation** | A table showing the relationship between two or more variables. | |

## D

| Term | Definition | See Also |
|------|------------|----------|
| **Data Quality Check** | An automated validation rule applied to submitted data to detect errors, inconsistencies, or anomalies. | Data Quality Engine |
| **Data Subject** | An identifiable person whose personal data is processed by the platform. GDPR term. | GDPR |
| **Disaggregation** | The breakdown of indicator data by dimensions such as sex, age, region, or socioeconomic status. | Indicator |
| **DPA** | Data Processing Agreement. A legally binding contract between a data controller and data processor. | Compliance |
| **DPIA** | Data Protection Impact Assessment. A process to identify and mitigate data protection risks. | Compliance |
| **DSAR** | Data Subject Access Request. A request by an individual to access their personal data held by an organization. | GDPR |

## E

| Term | Definition | See Also |
|------|------------|----------|
| **Embedding** | A numerical vector representation of text used for semantic search and RAG. | RAG, pgvector |
| **Endline** | A final measurement of indicators after a program intervention, used to assess impact. | Baseline, Midline |
| **Enumerator** | A field data collector who conducts interviews and completes surveys using the mobile application. | Assignment |
| **Evidence Repository** | A searchable database of all studies, reports, and findings, serving as institutional memory. | Knowledge Management |

## F

| Term | Definition | See Also |
|------|------------|----------|
| **FGD** | Focus Group Discussion. A qualitative data collection method involving a moderated group discussion. | KII |
| **FTS** | Full-Text Search. A search technique that matches documents containing specified words or phrases. | |

## G

| Term | Definition | See Also |
|------|------------|----------|
| **GDPR** | General Data Protection Regulation. EU regulation on data protection and privacy. | Compliance |
| **GIS** | Geographic Information System. A system for capturing, storing, and analyzing geographic data. | PostGIS |
| **GoRouter** | Declarative routing package for Flutter applications. | Mobile Architecture |

## H

| Term | Definition | See Also |
|------|------------|----------|
| **Horizon** | Laravel's queue monitoring and management tool. Provides a dashboard for queue workers. | Queue |
| **HPA** | Horizontal Pod Autoscaler. Kubernetes feature that automatically scales pod replicas. | Kubernetes |

## I

| Term | Definition | See Also |
|------|------------|----------|
| **Impact** | The long-term, higher-level change that a program aims to achieve. The highest level in a Theory of Change. | Outcome, Output |
| **Indicator** | A specific, measurable variable used to track progress toward a result. May be quantitative or qualitative. | KPI, LogFrame |
| **Indicator Library** | A reusable collection of standardized indicator definitions, organized by sector and source. | |
| **Input** | Resources (financial, human, material) invested in a program. | Activity, Output |
| **Isar** | A high-performance local database for Flutter, used for offline data storage in the mobile app. | Offline-First |

## J

| Term | Definition | See Also |
|------|------------|----------|
| **JSONB** | Binary JSON format in PostgreSQL, allowing flexible schema storage with indexing. | PostgreSQL |
| **JWT** | JSON Web Token. A compact, URL-safe token format used for authentication. | Bearer Token |

## K

| Term | Definition | See Also |
|------|------------|----------|
| **KII** | Key Informant Interview. A qualitative interview with a subject matter expert. | FGD |
| **KPI** | Key Performance Indicator. A critical indicator used to measure organizational or program performance. | Indicator |
| **Kubernetes (K8s)** | Container orchestration platform for automating deployment, scaling, and management of containerized applications. | DevOps |

## L

| Term | Definition | See Also |
|------|------------|----------|
| **LogFrame** | Logical Framework. A matrix that summarizes a program's goals, purpose, outputs, activities, indicators, and assumptions. | Theory of Change |
| **Loki** | Log aggregation system by Grafana Labs, used for centralized logging. | Monitoring |

## M

| Term | Definition | See Also |
|------|------------|----------|
| **MERL** | Monitoring, Evaluation, Research, and Learning. The domain of systematic data collection, analysis, and use for program improvement and accountability. | |
| **MFA** | Multi-Factor Authentication. An authentication method requiring two or more verification factors. | Security |
| **Midline** | An intermediate measurement of indicators during a program intervention. | Baseline, Endline |
| **Model Router** | The component that selects which AI model to use for a given request based on capability, cost, and latency requirements. | AI Gateway |
| **Multi-Tenancy** | A single platform deployment serving multiple organizations with data isolation. | Schema-per-tenant |

## N

| Term | Definition | See Also |
|------|------------|----------|
| **NDPR** | Nigeria Data Protection Regulation. Nigerian data protection law. | Compliance |
| **Next.js** | React framework providing SSR, SSG, ISR, and full-stack capabilities. | Frontend Architecture |

## O

| Term | Definition | See Also |
|------|------------|----------|
| **OAuth2** | An open standard for token-based authentication and authorization. | API Authentication |
| **Offline-First** | A design principle where all features work without internet connectivity, with background sync when connectivity is available. | Mobile Architecture |
| **OLTP** | Online Transaction Processing. Database optimized for transactional workloads (inserts, updates, deletes). | |
| **Outcome** | The medium-term change resulting from program outputs. At the outcome level in a Theory of Change. | Output, Impact |
| **Output** | The direct products or services delivered by program activities. | Activity, Outcome |

## P

| Term | Definition | See Also |
|------|------------|----------|
| **pgvector** | PostgreSQL extension for vector similarity search, used for AI embeddings and RAG. | RAG, Embedding |
| **PII** | Personally Identifiable Information. Data that can identify a specific individual. | Security, GDPR |
| **PITR** | Point-in-Time Recovery. The ability to restore a database to any moment in time. | Backup |
| **PostGIS** | PostgreSQL extension for geographic object queries and spatial analysis. | GIS |
| **Prompt Registry** | Version-controlled system for managing AI prompts, including deployment, A/B testing, and audit. | Prompt Architecture |

## Q

| Term | Definition | See Also |
|------|------------|----------|
| **Queue** | A mechanism for asynchronous job processing. Merline uses Redis + Laravel Horizon. | Horizon |
| **Questionnaire** | A structured data collection instrument containing questions, sections, skip logic, and validation rules. | Survey |

## R

| Term | Definition | See Also |
|------|------------|----------|
| **RAG** | Retrieval-Augmented Generation. An AI technique that retrieves relevant information from a knowledge base before generating a response. | AI Architecture |
| **RAG Status** | Red/Amber/Green status indicator for tracking performance against targets. | Indicator |
| **RBAC** | Role-Based Access Control. Authorization model where permissions are assigned to roles, and users are assigned to roles. | Security |
| **RPO** | Recovery Point Objective. The maximum acceptable data loss in a disaster, measured in time. | Disaster Recovery |
| **RTO** | Recovery Time Objective. The maximum acceptable downtime after a disaster. | Disaster Recovery |

## S

| Term | Definition | See Also |
|------|------------|----------|
| **SAML** | Security Assertion Markup Language. XML-based standard for single sign-on (SSO). | SSO |
| **Sanctum** | Laravel's lightweight authentication system for SPAs and mobile apps using token-based auth. | Authentication |
| **Sampling** | The process of selecting a subset of a population to represent the whole in a study. | |
| **Schema-per-tenant** | Multi-tenancy strategy where each tenant gets an isolated database schema within a shared database instance. | Multi-Tenancy |
| **SDG** | Sustainable Development Goal. One of 17 global goals set by the United Nations. | |
| **SMART** | Specific, Measurable, Achievable, Relevant, Time-bound. Criteria for good indicator definition. | Indicator |
| **SSO** | Single Sign-On. An authentication scheme allowing users to log in once and access multiple systems. | SAML, OAuth2 |
| **Straight-lining** | A data quality issue where a respondent selects the same answer for all questions in a matrix. | Data Quality |
| **Sync Engine** | The component managing data synchronization between mobile devices and the server, handling delta sync, conflict resolution, and media upload. | Offline-First |

## T

| Term | Definition | See Also |
|------|------------|----------|
| **Tenant** | An organization that uses the Merline platform, with isolated data and configuration. | Multi-Tenancy |
| **Theory of Change (ToC)** | A comprehensive framework describing how and why a desired change is expected to happen in a particular context. | LogFrame |
| **TimescaleDB** | A time-series database extension for PostgreSQL, used for analytics and KPI tracking. | Analytics |

## U

| Term | Definition | See Also |
|------|------------|----------|
| **UUIDv7** | Universally Unique Identifier version 7. Time-ordered, globally unique IDs suitable for offline generation. | Database |

## V

| Term | Definition | See Also |
|------|------------|----------|
| **Vector Store** | A database optimized for storing and searching vector embeddings. Merline uses pgvector. | pgvector, RAG |
| **vLLM** | A high-performance inference engine for large language models, used for self-hosted model serving. | AI Architecture |

## W

| Term | Definition | See Also |
|------|------------|----------|
| **WAL** | Write-Ahead Log. PostgreSQL's method for ensuring data integrity and enabling point-in-time recovery. | PITR |
| **Webhook** | An HTTP callback that notifies external systems when events occur in Merline. | API Reference |

## Z

| Term | Definition | See Also |
|------|------------|----------|
| **Zustand** | A lightweight state management library for React, used for client-side state in the web application. | Frontend Architecture |

---

## Acronyms & Abbreviations

| Acronym | Full Form |
|---------|-----------|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| BI | Business Intelligence |
| CAPI | Computer-Assisted Personal Interviewing |
| CDC | Change Data Capture |
| CI/CD | Continuous Integration / Continuous Deployment |
| DPA | Data Processing Agreement |
| DPIA | Data Protection Impact Assessment |
| DSAR | Data Subject Access Request |
| E2E | End-to-End (testing) |
| FGD | Focus Group Discussion |
| FTS | Full-Text Search |
| GDPR | General Data Protection Regulation |
| GIS | Geographic Information System |
| HPA | Horizontal Pod Autoscaler |
| IaC | Infrastructure as Code |
| IRB | Institutional Review Board |
| JWT | JSON Web Token |
| KII | Key Informant Interview |
| KPI | Key Performance Indicator |
| MFA | Multi-Factor Authentication |
| MERL | Monitoring, Evaluation, Research, Learning |
| MVP | Minimum Viable Product |
| NDPR | Nigeria Data Protection Regulation |
| OLTP | Online Transaction Processing |
| PII | Personally Identifiable Information |
| PITR | Point-in-Time Recovery |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SAML | Security Assertion Markup Language |
| SDK | Software Development Kit |
| SDG | Sustainable Development Goal |
| SLA | Service Level Agreement |
| SMART | Specific, Measurable, Achievable, Relevant, Time-bound |
| SSO | Single Sign-On |
| TLS | Transport Layer Security |
| ToC | Theory of Change |
| WAL | Write-Ahead Log |

---

## Related Documents

- [Documentation Architecture](ARCHITECTURE.md)
- [MERL Domain Model](../domain/)
- [Knowledge Governance](KNOWLEDGE-GOVERNANCE.md)
