# Merline AI Capabilities Guide

## Version: 1.0.0 | Owner: AI Systems Architect | Status: Draft

---

## 1. AI Overview

### 1.1 What Merline AI Does

Merline AI is an intelligence layer that augments every stage of the MERL lifecycle. It helps researchers, evaluators, and managers work faster and make better decisions — but always under human supervision.

| Capability | Description | Availability |
|------------|-------------|-------------|
| **Research Design Assistant** | Suggests Theory of Change, LogFrame, indicators, sampling | Professional+ (AI queries) |
| **Questionnaire Assistant** | Suggests questions, skip logic, validation | Professional+ |
| **Data Quality Engine** | Detects anomalies, fraud, quality issues in real-time | Professional+ |
| **Report Writer** | Generates narrative, executive summary, recommendations | Enterprise+ |
| **Insight Engine** | Natural language queries on data | Enterprise+ |
| **Knowledge Assistant** | Q&A over institutional knowledge (RAG) | Enterprise+ |
| **Photo Analysis** | Object detection, meter reading, classification | Enterprise+ |
| **Translation** | Multi-language form and report translation | Professional+ |

### 1.2 What Merline AI Does NOT Do

- **Never makes irreversible decisions** without human confirmation
- **Never replaces professional judgment** of researchers
- **Never accesses raw PII** (filtered before reaching AI models)
- **Never modifies data directly** (read-only analysis)
- **Never operates without audit** (every inference traceable)
- **Never claims certainty** without confidence scoring
- **Never reveals training data** or cross-tenant information

### 1.3 How to Access AI

AI features are available from:
- **AI Assist button** on relevant screens (studies, forms, reports)
- **Knowledge Assistant** chat interface in the sidebar
- **Automated data quality checks** — run on submission
- **Report generation** — AI-assisted drafting

### 1.4 AI Principles

1. **Grounded**: Every output cites evidence (RAG sources, data, methodologies)
2. **Explainable**: Reasoning chain visible, confidence scored, limitations stated
3. **Measurable**: Quality metrics tracked per inference, per capability
4. **Verifiable**: Users can check AI claims against source data
5. **Overridable**: Every recommendation can be edited, rejected, or replaced
6. **Continuously improving**: Feedback loops refine prompts, models, and retrieval

---

## 2. Per-Capability Guides

### 2.1 Research Design Assistant

**Purpose**: Accelerate study design by suggesting methodologies, frameworks, and indicators.

**How to use:**
1. Create a new study and fill in objectives and context
2. Click **AI Assist** on the Study Design page
3. Select what you need help with: Theory of Change, LogFrame, methodology, indicators
4. Review AI suggestions — each item shows confidence score and source citations
5. Accept, edit, or reject suggestions
6. AI suggestions are not applied automatically — you must explicitly confirm

**How to review AI output:**
- Check that the Theory of Change logic chain is sound
- Verify indicators meet SMART criteria
- Confirm methodology aligns with your research questions
- Edit any incorrect or inappropriate suggestions

**Limitations:**
- May suggest overly complex designs for simple studies
- Requires detailed study context — vague inputs produce vague outputs
- MERL domain is complex; AI may miss context-specific nuances

### 2.2 Data Quality Engine

**Purpose**: Automatically detect data quality issues in submitted responses.

**What it checks:**
| Check | Description | Action |
|-------|-------------|--------|
| **Completeness** | Required questions answered | Pass/Warn/Fail |
| **Outliers** | Statistical outliers in numeric responses | Flag for review |
| **GPS anomalies** | Unexpected location, speed between surveys | Flag for review |
| **Duration check** | Too fast (straight-lining) or too slow | Flag for review |
| **Straight-lining** | Same answer for all matrix questions | Flag for review |
| **Duplicate detection** | Near-duplicate submissions | Flag for review |
| **Skip logic violations** | Answers contradicting skip patterns | Flag for review |

**How to review data quality flags:**
1. Navigate to the Data Quality dashboard for your study
2. Review flagged submissions — each flag includes evidence
3. Filter by severity (high/medium/low) or enumerator
4. Click through to see the specific response and issue
5. Take action: Approve, Reject with explanation, or Request resubmission

**Tips:**
- Low-quality submissions from the same enumerator may indicate training needs
- GPS anomalies often mean the enumerator was not at the claimed location
- Duration flags need context — a 5-minute survey might be valid for a short screener

### 2.3 Report Writer

**Purpose**: Generate report drafts from study data, reducing manual writing time.

**How to use:**
1. Navigate to the Reports section
2. Select a report template (Donor Report, Evaluation Report, Executive Brief)
3. Click **Generate with AI**
4. AI generates: Executive summary, methodology section, findings narrative, recommendations
5. Each section is editable — make changes as needed
6. Review for accuracy before publishing

**What you should review:**
- Facts and figures — AI may misinterpret or hallucinate specific numbers
- Recommendations — are they supported by the findings?
- Tone and formality — adjust to match your organization's style
- Cultural and context sensitivity

**AI-generated content markers:**
- AI-generated sections are marked with a purple indicator
- Every claim links to the source data or analysis it references
- Confidence scores show how sure the AI is about each section

### 2.4 Knowledge Assistant

**Purpose**: Answer questions using your organization's institutional knowledge.

**How to use:**
1. Open the Knowledge Assistant chat (sidebar or Knowledge section)
2. Ask questions in natural language:
   - "What was the vaccination coverage in the 2025 baseline survey?"
   - "Show me lessons learned from education projects in Kenya"
   - "What methodology did we use for the health impact evaluation?"
3. AI searches across studies, reports, and documented lessons
4. Responses include citations to source documents

**What it searches:**
- Published study reports and findings
- Indicator definitions and results
- Lessons learned registry
- Best practices library
- Platform documentation

**Limitations:**
- Only searches data your organization has access to
- Quality depends on what has been documented
- Recent data may not be indexed yet (indexing lag: < 1 hour)

---

## 3. How to Review AI Recommendations

### 3.1 Confidence Scores

Every AI output includes a confidence score (0.0 - 1.0):

| Score | Meaning | Recommended Action |
|-------|---------|-------------------|
| 0.9 - 1.0 | High confidence | Review briefly, likely correct |
| 0.7 - 0.9 | Moderate confidence | Review carefully, may need edits |
| 0.5 - 0.7 | Low confidence | Verify independently, likely needs revision |
| < 0.5 | Very low confidence | Treat as suggestion only |

### 3.2 Citation Verification

AI outputs include citations to source documents:
- **RAG citations**: Source document name and section
- **Data citations**: Specific study, indicator, and value
- **Methodology citations**: MERL standard or guideline referenced

Click any citation to view the source. Verify before accepting.

### 3.3 Human Review Requirements

| Capability | Review Required | Auto-approve Possible |
|------------|----------------|----------------------|
| Research Design | Always | Never |
| Questionnaire | Always | Never |
| Data Quality Flags | Flagged submissions | Non-flagged passes |
| Report Narrative | Always | Never |
| Knowledge Q&A | Optional | High confidence only |

---

## 4. How to Provide Feedback

### 4.1 Feedback Types

| Feedback | How to Submit | Impact |
|----------|--------------|--------|
| **Thumbs up/down** | Click thumbs icon on any AI output | Immediate score logged |
| **Edit history** | Edit AI-generated content | Tracks what was changed |
| **Detailed feedback** | Feedback form in AI Assistant | Reviewed weekly by AI team |
| **Flag error** | "Report an error" link | Triggers quality review |

### 4.2 What Happens to Feedback

1. Every interaction is logged for quality monitoring
2. Edits to AI-generated content are analyzed to identify improvement areas
3. Aggregate feedback drives prompt and model improvements
4. Critical errors trigger immediate investigation

---

## 5. Privacy & Data Handling

### 5.1 Data Sent to AI Models

| Data Type | Sent to Model | Reason |
|-----------|--------------|--------|
| Study objectives | Yes | Required for context |
| Indicator definitions | Yes | Required for suggestions |
| Questionnaire questions | Yes | Required for quality checks |
| Response data (anonymized) | Yes | Required for analysis |
| Personally Identifiable Information (PII) | **No** | Filtered before model call |
| Organization name | Yes | Context |
| User name | **No** | Not needed for AI inference |

### 5.2 AI Model Privacy

- **Data in transit**: All AI API calls are encrypted (TLS 1.3)
- **Data at rest**: Logs stored in encrypted database
- **Model training**: Merline data is NOT used for model training
- **Tenant isolation**: No cross-tenant data leakage
- **Audit trail**: Every AI interaction is logged with tenant context

### 5.3 Third-Party Model Providers

| Provider | Data Processing Agreement | Data Used for Training |
|----------|-------------------------|----------------------|
| OpenAI (GPT-4o) | Signed DPA | No (API usage) |
| Anthropic (Claude) | Signed DPA | No (API usage) |
| Google (Gemini) | Signed DPA (GCP) | No (API usage) |
| Self-hosted (Llama) | N/A (on-premise) | N/A |

For sensitive data, self-hosted models can be deployed on-premise.

---

## 6. FAQ

**Q: Can AI make decisions without me?**
A: No. AI in Merline never takes irreversible actions without human confirmation. AI recommends; humans decide.

**Q: How accurate is the AI?**
A: Accuracy varies by capability. The Research Design Assistant scores ~85% on standardized tests. Always verify AI output.

**Q: Will AI hallucinate?**
A: All large language models can hallucinate. Merline mitigates this through: RAG grounding (findings cited to sources), confidence scoring, output guardrails, and human review requirements.

**Q: How much does AI cost?**
A: AI usage is included in Professional+ tiers with monthly query limits. See pricing tiers for details. Overages: $0.50/query.

**Q: Can I use my own API keys?**
A: Enterprise and Government tiers can configure custom model endpoints.

**Q: Is my data used to train AI models?**
A: No. Merline has agreements with all model providers that your data is not used for training.

**Q: Can I opt out of AI features?**
A: Yes. Organization admins can disable AI features in Organization Settings.

**Q: How do I report an AI error?**
A: Click "Report an error" on any AI output. Include details about what was incorrect.

**Q: What languages does AI support?**
A: English (primary), French, Spanish, Arabic, Portuguese, Swahili. Other languages may have reduced quality.

---

## 7. Related Documents

- [AI Architecture](../ai/AI-ARCHITECTURE.md)
- [Prompt Engineering Architecture](../prompts/ARCHITECTURE.md)
- [Multi-Agent Architecture](../ai/AGENTS.md)
- [Compliance Map](../security/COMPLIANCE-MAP.md)
- [Glossary](GLOSSARY.md)
