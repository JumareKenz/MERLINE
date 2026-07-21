# Model Strategy & Provider Architecture

## 1. Model Selection Principles

1. **Right model for the right task** — classification uses cheap models, complex reasoning uses capable models
2. **No single provider lock-in** — each capability has 2+ fallback models across providers
3. **Latency SLA meets UX requirements** — sync <3s, async <30s, streaming as UX demands
4. **Cost proportional to value** — high-cost models only when quality delta justifies expense
5. **Private deployment option** — every critical capability has a self-hostable alternative

---

## 2. Model Tiers

### T1: Fast Models — <2s latency, low cost

| Model | Provider | Context | Strengths | Use Cases |
|-------|----------|---------|-----------|-----------|
| GPT-4o-mini | OpenAI | 128K | Fast, cheap, multi-lingual | Classification, validation, extraction, translation |
| Claude 3 Haiku | Anthropic | 200K | Fastest, strong safety | Real-time guardrails, simple Q&A |
| Gemini 1.5 Flash | Google | 1M | Largest context, cheap | Document processing, batch extraction |
| Llama 3 8B | Meta/Ollama | 8K | Self-hostable, free | High-volume local inference, offline |

### T2: Reasoning Models — <5s latency, medium cost

| Model | Provider | Context | Strengths | Use Cases |
|-------|----------|---------|-----------|-----------|
| GPT-4o | OpenAI | 128K | Strong general reasoning | RAG Q&A, report drafting, questionnaire generation |
| Claude 3.5 Sonnet | Anthropic | 200K | Best instruction following, nuance | Indicator design, methodology advice, lesson synthesis |
| Gemini 1.5 Pro | Google | 1M | Long context, multimodal | Document analysis, complex RAG |
| Llama 3 70B | Meta/Ollama | 8K | Self-hostable capable | Private tenant inference |

### T3: Complex Models — <15s latency, higher cost

| Model | Provider | Context | Strengths | Use Cases |
|-------|----------|---------|-----------|-----------|
| GPT-4o (advanced) | OpenAI | 128K | Strongest reasoning | ToC/LogFrame generation, complex analysis design |
| Claude 3.5 Opus | Anthropic | 200K | Deep reasoning, structured output | Methodology design, sampling strategy |
| Gemini 2.0 Pro | Google | 1M+ | Multimodal reasoning | Cross-study analysis, portfolio insights |
| Llama 3 405B | Meta | 8K | Frontier open model | High-security tenants, air-gapped deployments |

### Specialized Models

| Model | Purpose | Provider |
|-------|---------|----------|
| Whisper (large-v3) | Speech-to-text | OpenAI / local |
| GPT-4o Vision | OCR, image analysis | OpenAI |
| Voyage-3 / BGE-M3 | Embeddings (text) | Voyage AI / BAAI |
| text-embedding-3-large | Embeddings (text) | OpenAI |
| CLAP / MuLaM | Audio embeddings | Open source |
| t5-small / distilbert | NER, classification | Open source |

---

## 3. Primary Models by Capability

| Capability | Primary Model | Fallback 1 | Fallback 2 | Tier |
|-----------|--------------|------------|------------|------|
| **Text Classification** | GPT-4o-mini | Claude Haiku | Llama 3 8B | T1 |
| **NER / Extraction** | GPT-4o-mini | Claude Haiku | Llama 3 8B | T1 |
| **Translation** | GPT-4o-mini | Gemini Flash | Llama 3 8B | T1 |
| **Sentiment Analysis** | GPT-4o-mini | Claude Haiku | — | T1 |
| **Language Detection** | GPT-4o-mini | Claude Haiku | — | T1 |
| **Data Quality (validation)** | GPT-4o-mini | Claude Haiku | — | T1 |
| **Data Quality (fraud check)** | GPT-4o | Claude Sonnet | — | T2 |
| **Theme Extraction (Qual)** | GPT-4o | Claude Sonnet | — | T2 |
| **RAG Q&A** | GPT-4o | Claude Sonnet | Gemini Pro | T2 |
| **Questionnaire Design** | GPT-4o | Claude Sonnet | — | T2 |
| **Indicator Generation** | GPT-4o | Claude Sonnet | — | T2 |
| **Report Drafting** | GPT-4o | Claude Sonnet | Gemini Pro | T2 |
| **ToC/LogFrame Design** | GPT-4o (adv) | Claude Opus | — | T3 |
| **Methodology Design** | GPT-4o (adv) | Claude Opus | — | T3 |
| **Complex Analysis** | GPT-4o (adv) | Claude Opus | Gemini Pro | T3 |
| **Embeddings** | Voyage-3 | BGE-M3 | text-embedding-3-large | N/A |
| **Speech-to-Text** | Whisper v3 | — | — | N/A |
| **Image Analysis** | GPT-4o Vision | — | — | N/A |

---

## 4. Provider Architecture

### 4.1 Provider Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Gateway                                     │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Provider:     │  │ Provider:     │  │ Provider:     │               │
│  │ OpenAI        │  │ Anthropic    │  │ Google        │               │
│  │ (Direct API)  │  │ (Direct API) │  │ (Direct API)  │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐               │
│  │ Azure        │  │ AWS          │  │ GCP          │               │
│  │ OpenAI       │  │ Bedrock      │  │ Vertex AI    │               │
│  │ (Enterprise) │  │ (Enterprise) │  │ (Enterprise) │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Aggregators: OpenRouter, Together AI                         │   │
│  │ Fallback chain: Direct → Aggregator → Self-hosted           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Self-Hosted: vLLM (Llama 3), Ollama (dev), Whisper.cpp      │   │
│  │ For: private tenants, offline regions, air-gapped deployments│   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Routing Logic

```
Route(user_request, capability, tenant):
    1. Check tenant model override (enterprise may mandate specific provider)
    2. Select primary model for capability
    3. Check budget: tenant has quota for this tier?
         - Yes → use primary model
         - No → downgrade to cheaper tier
    4. Check latency budget: sync request with low timeout?
         - Yes → prefer fastest available
    5. Try primary provider
         - Success → return
         - Failure → try fallback 1 → fallback 2 → error
    6. Record route + cost for billing
```

### 4.3 Fallback Strategy

| Failure Type | Action |
|-------------|--------|
| Rate limited | Wait + retry (exponential backoff) → fallback provider |
| Timeout | Immediate fallback (no retry to same provider) |
| 5xx error | Retry × 2 → fallback provider |
| 4xx (auth, bad request) | Do NOT retry → raise error |
| Safety filter triggered | Block response, log for review |

---

## 5. Self-Hosted Model Strategy

### 5.1 When Self-Hosted Models Are Used

| Scenario | Models | Infrastructure |
|----------|--------|---------------|
| Private tenant (air-gapped) | Llama 3 70B, Llama 3 8B, Whisper, BGE | On-prem / private cloud |
| Offline field operations | Llama 3 8B (quantized), BGE-small | Mobile device / edge server |
| High-volume classification | Llama 3 8B, DistilBERT | Cloud VM (GPU) |
| Development & testing | Llama 3 8B (Ollama) | Developer machine |
| Cost-sensitive regions | Llama 3 70B (or lower) | Regional cloud (cheaper GPU) |

### 5.2 Performance Expectations

| Model | Hardware | Tokens/sec | Quality vs API |
|-------|----------|-----------|----------------|
| Llama 3 8B (Q4) | RTX 4090 | ~100 t/s | ~85-90% GPT-4o-mini |
| Llama 3 70B (Q4) | 2× A100 | ~50 t/s | ~90-95% GPT-4o |
| Llama 3 405B (Q4) | 8× A100 | ~20 t/s | ~95% GPT-4o (advanced) |
| BGE-M3 | CPU | ~500 docs/s | Comparable to Voyage-3 |
| Whisper large-v3 | RTX 4090 | ~10× real-time | Comparable to API |

---

## 6. Model Governance

### 6.1 Model Release & Deprecation

| Event | Process |
|-------|---------|
| New model available | Evaluate against capability-specific test suite (accuracy, latency, cost, safety) |
| Canary deployment | Route 5% of traffic to new model for 1 week, compare metrics |
| Rollout | If metrics meet threshold, switch primary model, keep old as fallback |
| Deprecation | Announce 30 days in advance, move to fallback tier, archive prompt versions |
| Emergency rollback | Immediately revert to previous model if quality drops >10% |

### 6.2 Model Evaluation Suite

Each capability has a benchmark dataset with golden answers:

```
Capability: Questionnaire_Design
Test cases: 200 (100 English, 50 French, 50 Swahili)
Metrics:
  - Accuracy (question type selection): target 95%
  - Relevance (skip logic correctness): target 90%
  - Language quality (expert review): target 4.0/5.0
  - Latency: P95 <5s
  - Cost per inference: max $0.05
```

### 6.3 Tenant Model Selection

Enterprise tenants can configure per-capability model preferences:
- **Auto** (default): System chooses optimal model
- **Fixed provider**: e.g., "Always use Anthropic"
- **Fixed model**: e.g., "Only use Llama 3 70B"
- **Budget tier**: e.g., "Never use T3 models"
- **Private deployment**: e.g., "Use our self-hosted instance"
