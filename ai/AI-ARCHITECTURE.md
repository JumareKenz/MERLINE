# Merline AI Architecture

## 1. AI System Context

### 1.1 What AI Does
AI in Merline is an **intelligence layer** that augments every stage of the MERL lifecycle:

| Stage | AI Contribution | Human Role |
|-------|----------------|------------|
| Research Design | Suggest ToC, LogFrame, methodology, indicators | Approve, adapt, reject |
| Questionnaire Design | Suggest questions, skip logic, validation, wording | Review, select, customize |
| Data Collection | On-device validation, real-time anomaly detection | Collect, verify |
| Data Quality | Detect fabrication, straight-lining, GPS anomalies | Investigate, decide |
| Analysis | Theme extraction, sentiment, pattern recognition | Interpret, validate |
| Reporting | Generate narratives, summaries, recommendations | Edit, approve |
| Knowledge Management | Semantic search, lesson surfacing, Q&A | Curate, apply |
| Decision Support | Predictions, risk flags, trend analysis | Act on insights |

### 1.2 What AI Does NOT Do
- **Never makes irreversible decisions** without human confirmation
- **Never replaces professional judgment** of researchers, evaluators, or managers
- **Never accesses raw PII** (filtered before reaching AI models)
- **Never modifies data directly** (read-only analysis)
- **Never operates without audit** (every inference traceable)
- **Never claims certainty** without confidence scoring
- **Never reveals training data** or cross-tenant information

### 1.3 Design Principles
1. **Grounded**: Every output cites evidence (RAG sources, data, methodologies)
2. **Explainable**: Reasoning chain visible, confidence scored, limitations stated
3. **Measurable**: Quality metrics tracked per inference, per capability
4. **Verifiable**: Users can check AI claims against source data
5. **Overridable**: Every recommendation can be edited, rejected, or replaced
6. **Continuously improving**: Feedback loops refine prompts, models, and retrieval

---

## 2. Model Strategy (Summary)

See `MODEL-STRATEGY.md` for full details.

### 2.1 Model Tiers

| Tier | Models | Latency | Cost | Use Cases |
|------|--------|---------|------|-----------|
| **T1: Fast** | GPT-4o-mini, Claude Haiku, Gemini Flash, Llama 3 8B | <2s | Low | Classification, validation, extraction, translation |
| **T2: Reasoning** | GPT-4o, Claude Sonnet, Gemini Pro | <5s | Medium | RAG Q&A, report drafting, questionnaire generation |
| **T3: Complex** | GPT-4o, Claude Opus, Gemini Ultra, Llama 3 70B | <15s | High | ToC/LogFrame generation, complex analysis, methodology design |
| **Specialized** | Whisper (speech), GPT-4o Vision (OCR/image), Voyage/BGE (embeddings) | Varies | Varies | Transcription, image analysis, embedding |

### 2.2 Provider Strategy
- **Primary**: Direct API (OpenAI, Anthropic, Google)
- **Secondary**: OpenRouter (fallback, unified billing)
- **Enterprise**: Azure OpenAI, AWS Bedrock (for regulated tenants)
- **Self-hosted**: Llama 3 via vLLM/Ollama (data-sensitive tenants)

---

## 3. Inference Pipeline

```
User Request → Guardrails → PII Filter → Route → Retrieve → Reason → Generate → Validate → Respond
```

### 3.1 Pipeline Stages

| Stage | Component | Description |
|-------|-----------|-------------|
| **1. Request Intake** | AI API | Authenticate, rate-limit, validate tenant context, feature flags |
| **2. Guardrails (Input)** | Guardrail Service | PII redaction, injection detection, content safety, length check |
| **3. Model Routing** | Model Router | Capability → tier → provider → fallback chain → cost check |
| **4. Context Assembly** | RAG Service | Embed query → vector search → hybrid search → re-rank → compress |
| **5. Prompt Assembly** | Prompt Registry | Load versioned prompt → inject context → compile messages |
| **6. Inference** | AI Gateway | Sync (fast) / Async (complex) / Stream (UX) execution |
| **7. Guardrails (Output)** | Guardrail Service | Safety check, PII leak detection, hallucination detection, format check |
| **8. Response Validation** | Quality Evaluator | Confidence scoring, citation verification, completeness check |
| **9. Post-processing** | AI Service | Format response, attach citations, calculate cost, log inference |
| **10. Delivery** | API Gateway | Return to client, cache if appropriate, update user feedback context |

### 3.2 Sync vs Async vs Streaming

| Mode | Use Case | User Experience |
|------|----------|----------------|
| **Sync** | Simple validation, classification, extraction | Instant response (<3s) |
| **Async (Queue)** | Report generation, batch analysis, document processing | Poll/progress + notification |
| **Streaming** | Conversational assistant, draft generation | Typewriter effect, progressive rendering |

---

## 4. Multi-Agent Architecture

### 4.1 Specialist Agents

| Agent | Purpose | Trigger |
|-------|---------|---------|
| **Research Design Agent** | ToC, LogFrame, methodology, sampling design | User opens study design, clicks "AI Assist" |
| **Survey Design Agent** | Question suggestions, wording, skip logic, validation | User editing questionnaire |
| **Indicator Agent** | SMART validation, disaggregation, library suggestions | User creating/editing indicator |
| **Data Quality Agent** | Anomaly detection, fraud detection, quality scoring | Submission received, batch check |
| **Reporting Agent** | Narrative generation, executive summary, recommendations | Report generation request |
| **Knowledge Assistant** | Q&A, document retrieval, lesson surfacing | User query in knowledge base |
| **Executive Assistant** | Portfolio summaries, trend alerts, risk detection | Dashboard view, scheduled digest |
| **Qualitative Analysis Agent** | Theme extraction, sentiment, codebook suggestions | Transcript uploaded, analysis started |

### 4.2 Supervisor Agent

The **Supervisor Agent** orchestrates specialist agents:

```
User Request
    │
    ▼
Supervisor Agent
    │
    ├── 1. Intent Classification → Which specialist(s)?
    ├── 2. Context Assembly → Gather study/project/data context
    ├── 3. Agent Dispatch → Call primary + supporting agents
    ├── 4. Response Synthesis → Merge, deconflict, format
    └── 5. Quality Gate → Validate before returning
```

### 4.3 Handoff Protocol

```
Agent A → Context Package {
    session_id: UUID,
    user_id: UUID,
    tenant_id: UUID,
    study_id: UUID (optional),
    intent: string,
    input_data: JSON,
    agent_output: JSON,
    rag_context: Source[],
    confidence: float,
    limitations: string[],
    conversation_history: Message[]
} → Agent B
```

### 4.4 Context Sharing
- All agents share a **unified context window** per session
- Context includes: study config, project data, user role, conversation history, RAG sources
- Context is scoped per tenant — no cross-tenant leakage
- Context window management: sliding window with priority (study data > conversation > general)

---

## 5. AI Service Architecture

### 5.1 Service Layer

```
┌──────────────────────────────────────────────────────────────────┐
│                    AI LAYER (Laravel + Python)                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  AI Gateway       │  │  RAG Service     │  │  Agent Service  │  │
│  │  (Laravel)        │  │  (Laravel)       │  │  (Python)      │  │
│  │                   │  │                  │  │                │  │
│  │  • Route/fallback │  │  • Embeddings    │  │  • Supervisor   │  │
│  │  • Cache/retry    │  │  • Vector search │  │  • Specialists  │  │
│  │  • Cost tracking  │  │  • Hybrid search │  │  • Orchestrate  │  │
│  │  • Observability  │  │  • Re-ranking    │  │  • Tool use     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────┘  │
│           │                     │                       │         │
│  ┌────────┴─────────┐  ┌───────┴─────────┐  ┌──────────┴───────┐ │
│  │  Prompt Registry  │  │  Quality        │  │  Guardrail       │ │
│  │  (Laravel)        │  │  Evaluator     │  │  Service         │ │
│  │                   │  │  (Laravel)      │  │  (Python)        │ │
│  │  • Versioning     │  │  • Scoring      │  │                 │ │
│  │  • A/B testing    │  │  • Feedback     │  │  • Input safety  │ │
│  │  • Deployment     │  │  • Metrics      │  │  • Output safety │ │
│  └──────────────────┘  └─────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Python Microservices
- **Agent Service**: Python (FastAPI) for agent orchestration — LangChain/LlamaIndex
- **Guardrail Service**: Python for content safety — dedicated, independently scalable
- **Reasoning**: Python for complex chain-of-thought and multi-step reasoning
- **Communication**: Laravel → Python via HTTP/gRPC; queued via Redis for async

### 5.3 Queue-Based Async
- Report generation, batch quality checks, document ingestion → dispatched to queues
- Queue workers (Laravel Horizon) handle async AI tasks
- Progress tracked via job status; user notified on completion

---

## 6. Retrieval-Augmented Generation (RAG) Architecture

See `RAG-ARCHITECTURE.md` for full details.

### 6.1 Overview

```
Knowledge Sources
    │
    ▼
Document Ingestion Pipeline
    ├── Chunking (sentence-based, 512-1024 tokens)
    ├── Metadata extraction (source, date, type, tenant)
    ├── Embedding generation (Voyage/BGE/OpenAI)
    └── Store in pgvector
    │
User Query
    │
    ▼
Retrieval Pipeline
    ├── Query embedding
    ├── Hybrid search (vector + FTS + metadata filter)
    ├── Re-ranking (cross-encoder)
    ├── Context compression (extractive)
    └── Citation assembly
```

### 6.2 Knowledge Sources

| Source | Type | Update Frequency |
|--------|------|-----------------|
| MERL frameworks (WHO, UNICEF, USAID, OECD DAC) | Static documents | On ingest |
| Organizational policies & SOPs | Static documents | On ingest |
| Past study designs & reports | Generated content | Per study publication |
| Indicator library | Structured data | On indicator create/update |
| Lessons learned | Structured data | On lesson publication |
| Research papers | External documents | On ingest |
| Questionnaire templates | Structured data | On template publish |

### 6.3 pgvector Schema
- Dimension: 1536 (OpenAI/Voyage) or 1024 (BGE)
- Index: IVFFlat (Phase 1) → HNSW (Phase 2)
- Partitioned by tenant (organization_id)
- Metadata filters: entity_type, source, date range, confidence

---

## 7. Human-in-the-Loop Design

### 7.1 Review Levels

| Level | Criteria | UX |
|-------|----------|-----|
| **Auto-accept** | Confidence ≥0.9, safe classification, low-impact | Silently accepted, logged |
| **Auto-accept with flag** | Confidence 0.7-0.9, safe | Accepted, shown as "AI-generated — verify" |
| **Human review** | Confidence <0.7, medium-risk, or high-impact | Queued in review dashboard; notification sent |
| **Block** | High-risk, guardrail violation | Rejected; user sees "Cannot generate — retry" |

### 7.2 Review Actions
| Action | Description |
|--------|-------------|
| **Accept** | Use as-is (logged as accepted) |
| **Edit** | Modify AI output (logged as edited) |
| **Reject** | Discard with reason (logged for improvement) |
| **Regenerate** | Request new output (logged as rejected + retry) |
| **Override** | Replace with human-authored content (logged as override) |

### 7.3 Feedback Capture
- Thumbs up/down on every AI output
- Reason for rejection (categorical: inaccurate, irrelevant, unsafe, other)
- Edit distance metrics (how much user changed AI output)
- Implicit signals: time spent reviewing, regeneration requests

---

## 8. Cost Optimization

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| **Model routing** | Use cheapest capable model per task | 40-60% |
| **Prompt compression** | Strip unnecessary context, use concise instructions | 20-30% |
| **Response caching** | Cache identical/embedding-similar queries (TTL) | 15-25% |
| **Embedding cache** | Reuse embeddings for unchanged content | 30-50% |
| **Context window management** | Only include relevant RAG chunks, not full documents | 40-60% |
| **Batch inference** | Batch similar requests to same model | 10-20% |
| **Streaming** | Progressive rendering, user stops if not useful | Varies |
| **Per-tenant budgets** | Hard caps, cost alerts, model downgrade on overage | Prevents runaway |
| **Local models** | Llama 3 for high-volume, low-complexity tasks | 90%+ vs API |

---

## 9. Observability

See `AI-OBSERVABILITY.md` for full details.

### 9.1 Metrics Per Inference

| Metric | Source | Aggregation |
|--------|--------|-------------|
| Latency (P50/P95/P99) | AI Gateway | Per model, per capability, per tenant |
| Token usage | AI Gateway | Per model, per tenant, per day |
| Cost ($) | AI Gateway | Per model, per tenant, per capability |
| Quality score | Quality Evaluator | Per capability, per prompt version |
| Hallucination rate | Quality Evaluator | Per model, per RAG configuration |
| User satisfaction | Feedback system | Per capability, per user segment |
| Error rate | AI Gateway | Per model, per provider |

### 9.2 Continuous Improvement Loop

```
User Feedback → Analytics → Identify Gaps
    │                            │
    └──── Prompt Refinement ←────┘
                 │
                 ▼
            Evaluation (test suite)
                 │
                 ▼
            Canary Deploy (5% traffic)
                 │
                 ▼
            Full Rollout (if metrics improve)
                 │
                 ▼
            Monitor → Repeat
```
