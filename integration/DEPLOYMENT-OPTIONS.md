# Enterprise Deployment Options

## Deployment Models

### Multi-Tenant SaaS (Default)
- Shared infrastructure across all tenants
- Schema-per-tenant isolation in shared PostgreSQL cluster
- Automated CI/CD deployments
- Best for: NGOs, research institutions, mid-market

### Single-Tenant Dedicated
- Dedicated infrastructure per customer
- Isolated Kubernetes namespace or cluster
- Customer-specific domain, encryption keys
- Best for: Government agencies, large enterprises, healthcare

### Private Cloud / VPC
- Deployed within customer's cloud account (AWS, GCP, Azure)
- Customer-managed networking and security
- Merline manages application layer
- Best for: Regulated industries, data sovereignty requirements

### Air-Gapped / On-Premises
- Fully offline deployment with no external connectivity
- Delivered as container images + Helm charts
- Local AI models (self-hosted LLMs via vLLM/Ollama)
- Local PostgreSQL, Redis, S3-compatible storage (MinIO)
- Periodic manual update mechanism (USB or secure transfer)
- Best for: National security, disconnected field operations, sanctions-restricted countries

### Hybrid
- Core platform on-premises, analytics in cloud
- Sensitive data stays on-premises, aggregate analytics in cloud
- Best for: Organizations transitioning to cloud

## Data Residency

### Supported Regions
- Primary: eu-west-1 (Ireland), eu-central-1 (Frankfurt), us-east-1 (N. Virginia)
- Africa: af-south-1 (Cape Town), Local Zone (Lagos, Nairobi planned)
- Asia: ap-southeast-1 (Singapore), ap-south-1 (Mumbai)
- Middle East: me-south-1 (Bahrain)

### Regional Requirements
- EU: GDPR-compliant, data stays in EU
- Nigeria: NDPR-compliant, local hosting option
- Kenya: Data Protection Act 2019, local hosting
- India: Personal Data Protection Bill compliant
- US: SOC 2, HIPAA-ready

## Customer-Managed Encryption Keys

### Bring Your Own Key (BYOK)
- AWS KMS / Azure Key Vault / GCP Cloud KMS
- Key rotation, access logging, region-scoped
- Database encryption, S3 bucket encryption, envelope encryption

### Hold Your Own Key (HYOK)
- Customer-operated HSM
- Merline cannot access encryption keys
- Limited to specific data classifications

## Deployment Automation

- One-click cloud deployment via Terraform + Helm
- Customer onboarding script (DNS, SSL, IAM, network setup)
- Monitoring stack pre-configured (Prometheus, Grafana, Loki)
- Backup automation (WAL archiving, S3 replication)
- Auto-healing and self-recovery
