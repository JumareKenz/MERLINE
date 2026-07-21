# Merline On-Device & Edge AI Strategy

## Version: 1.0.0
## Owner: AI Research, Innovation & Advanced Intelligence Director

---

## 1. Strategic Context

Field data collection occurs in environments with limited or no internet connectivity. On-device AI ensures that quality assurance, validation, and intelligence reach field teams regardless of connectivity.

**Design Principle**: On-device AI is not a degraded version of cloud AI — it is a complementary tier optimized for latency, privacy, and offline operation.

---

## 2. On-Device ML Models for Mobile App

### 2.1 Capability Matrix

| Capability | Model Type | Size | RAM | Battery Impact | Offline? | Priority |
|------------|-----------|------|-----|----------------|----------|----------|
| Field validation (required, type, range) | Rule-based + tiny MLP | <5MB | 10MB | Negligible | Yes | P0 |
| Language translation (5 languages) | NLLB-200 distilled (300M) | 600MB | 200MB | Moderate | Yes (select) | P0 |
| Quality flagging (straight-lining, speeding) | Distilled classifier | 10MB | 30MB | Low | Yes | P0 |
| Form auto-fill suggestions | Small seq2seq | 50MB | 80MB | Low | Optional | P1 |
| Audio transcription (offline) | Whisper tiny | 150MB | 300MB | High | Yes | P1 |
| Image classification (document type) | MobileNetV3 | 8MB | 20MB | Low | Yes | P1 |
| OCR (offline) | PaddleOCR mobile | 30MB | 100MB | Moderate | Yes | P2 |
| Anomaly detection (on-device) | Autoencoder | 5MB | 15MB | Low | Yes | P2 |
| Query understanding (offline fallback) | Distilled BERT | 100MB | 150MB | Moderate | Yes (fallback) | P2 |

### 2.2 Deployment Strategy

| Tier | Device Specs | Model Scope | Storage Budget | Update Frequency |
|------|-------------|-------------|---------------|------------------|
| **Low-end** | 2GB RAM, ARM Cortex-A53 | Rule-based + tiny ML only | 50MB | Quarterly |
| **Mid-range** | 4GB RAM, ARM Cortex-A75 | All P0 + P1 models | 500MB | Monthly |
| **High-end** | 6GB+ RAM, flagship SoC | Full stack | 1.5GB | Monthly+ |

### 2.3 Model Hub

Models are downloaded and updated via the Merline app on first sync:
- **Base bundle**: Always included (validation, rules)
- **Language pack**: Downloaded on demand per user language
- **Regional pack**: Region-specific models (e.g., Indian languages)
- **Feature pack**: Downloaded when feature is first used

### 2.4 Offline Inference Pipeline

```
Data Entry → On-Device Validation (rule-based)
    ↓
    ├── Pass → Save locally; queue for sync
    └── Fail → On-Device ML Check (distilled model)
         ↓
         ├── Low confidence flag → Hold for cloud review
         └── High confidence flag → Alert user immediately
```

---

## 3. Model Compression & Quantization

### 3.1 Techniques

| Technique | Size Reduction | Accuracy Loss | Inference Speedup | Use Case |
|-----------|---------------|---------------|-------------------|----------|
| FP16 → INT8 quantization (PTQ) | 50% | <0.5% | 2x | All models |
| INT8 → INT4 quantization (PTQ) | 75% | 1-2% | 3x | Low-resource language models |
| Knowledge distillation | 80%+ | 2-5% | Varies | Task-specific classifiers |
| Pruning (structured) | 30-50% | <1% | 1.5x | Over-parameterized models |
| Pruning (unstructured) | 70-90% | 2-5% | — (HW dependent) | Niche, HW-specific |
| ONNX Runtime optimization | — | None | 1.5-3x | All models |

### 3.2 Quantization Experiments

| Model | FP16 Size | INT8 Size | INT4 Size | INT8 Acc Retention | INT4 Acc Retention |
|-------|-----------|-----------|-----------|-------------------|-------------------|
| Distilled BERT (classifier) | 110MB | 55MB | 28MB | 99.5% | 98.0% |
| NLLB-300M | 600MB | 300MB | 150MB | 98.5% | 96.0% |
| Whisper tiny | 150MB | 75MB | 38MB | 99.0% | 97.0% |
| MobileNetV3 | 22MB | 11MB | 6MB | 99.8% | 99.0% |

**Recommendation**: INT8 for most models; INT4 for low-end devices with acceptable quality trade-off.

---

## 4. Federated Learning

### 4.1 Rationale

Organizations want cross-organization insights without sharing raw data. Federated learning enables collaborative model improvement while preserving data privacy.

### 4.2 Use Cases

| Use Case | Model Type | Privacy | Value |
|----------|-----------|---------|-------|
| Fabrication detection patterns | Fraud classifier | High (model learns fraud patterns without seeing data) | Improved detection across orgs |
| Translation quality improvement | NLLB fine-tuning | Medium | Better field translations |
| Quality flag threshold calibration | Anomaly detector | High | More accurate flagging |
| Enumerator behavior patterns | Enumerator quality model | High | Benchmarking without exposure |

### 4.3 Architecture

```
Server (Merline)
    ↓
Distribute global model → tenants download
    ↓
Tenant trains on local data (N epochs)
    ↓
Tenant sends model updates (gradients, NOT data)
    ↓
Server aggregates (FedAvg / FedProx)
    ↓
Server broadcasts improved global model
    ↓
Repeat
```

### 4.4 Privacy Guarantees

| Mechanism | Guarantee | Implementation |
|-----------|-----------|----------------|
| Differential privacy | ε=2 (per tenant per round) | DP-SGD with Gaussian noise |
| Secure aggregation | Server cannot see individual updates | Secret sharing / MPC |
| Model isolation | Tenant model never leaves tenant VPC | Federated transfer learning |
| Gradient clipping | Prevents gradient leakage attacks | Adaptive clipping |

### 4.5 Federated Learning Experiments

| Experiment | Design | Success Criteria |
|------------|--------|------------------|
| FL-001: Fabrication detection | 20 tenants, 5K samples each | Model quality within 5% of centralized |
| FL-002: Translation improvement | 10 tenants, 3 languages | BLEU score improvement > 2 points |
| FL-003: Threshold calibration | 50 tenants, quality flags | False positive reduction > 15% |

### 4.6 Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| Statistical heterogeneity (non-IID data) | FedProx + adaptive learning rates |
| Communication cost | Gradient compression (Sparsification, quantization) |
| Tenant drop-out | Asynchronous aggregation (FedAsync) |
| Poisoning attacks | Robust aggregation (Median, Trimmed Mean, Krum) |
| Limited tenant participation | Incentive design; minimum samples per round |

---

## 5. Edge Deployment for Field Offices

### 5.1 Use Cases

| Scenario | Device | Capabilities |
|----------|--------|--------------|
| **Country office server** | Mini PC / NUC (8-16GB RAM) | Full model stack for 10-50 field teams |
| **Regional hub** | Server (32-64GB, GPU optional) | Pre-processing, batch AI, sync orchestration |
| **Remote field base** | Laptop / tablet (8GB RAM) | Core models + local knowledge base |

### 5.2 Edge Server Config

| Tier | Hardware | Models | Sync | Cost |
|------|----------|--------|------|------|
| **Basic** | Intel NUC i5, 16GB, no GPU | Rule-based + tiny ML + embedded vector DB | Batch sync daily | $500 |
| **Standard** | Intel NUC i7, 32GB, Arc A380 | + Whisper tiny, NLLB-300M, distilled BERT | Continuous sync | $1,200 |
| **Premium** | Mini server, 64GB, RTX 4060 | + Llama 4 8B (INT4), full vector DB | Continuous sync | $3,000 |

### 5.3 Edge Vector Database

- **Technology**: LanceDB / Chroma (embedded, no server required)
- **Size**: 10K-100K embedding vectors (50-500MB)
- **Contents**: Organization SOPs, reference documents, past study data
- **Sync**: Pull updates from cloud on connectivity

---

## 6. TinyML for IoT/Sensor Integration

### 6.1 Potential Applications

| Sensor | Application | Sector |
|--------|-------------|--------|
| Water flow meter | Monitor water point usage | WASH |
| Temperature logger | Vaccine cold chain monitoring | Health |
| Soil moisture sensor | Agricultural intervention monitoring | Agriculture |
| Air quality sensor | Pollution monitoring | Environment |
| Motion sensor | Facility usage patterns | Infrastructure |
| Wearable (step count) | Community health worker activity | Health |

### 6.2 TinyML Approach

| Component | Technology |
|-----------|-----------|
| Microcontroller | ESP32, Raspberry Pi Pico, Arduino Nano |
| ML framework | TensorFlow Lite Micro |
| Model architecture | 1D-CNN, decision trees, tiny transformers |
| Model size target | <100KB |
| Power budget | <10mW (battery operation >1 year) |
| Communication | LoRaWAN / BLE / cellular IoT |

### 6.3 Integration

```
Sensor → TinyML inference (on-device) → Threshold alert → LoRaWAN → Cloud
                                                     ↓
                                              Local storage (SD card)
```

### 6.4 Priority

**Explore (Phase 4+)**. Not a core capability. Evaluate demand from key tenants in WASH and agriculture sectors before investing significantly.

---

## 7. Trade-Off Analysis

### 7.1 Accuracy vs Latency

| Tier | Accuracy (vs cloud) | Latency | User Experience |
|------|--------------------|---------|-----------------|
| Cloud (GPT-4o) | 100% (baseline) | 2-5s | Wait for response |
| Cloud (GPT-4o-mini) | 85-90% | 1-2s | Brief wait |
| On-device (distilled) | 80-90% | <100ms | Instant |
| On-device (rule-based) | 70-90%* | <10ms | Instant |

*Depends on task complexity; rule-based is 100% for deterministic checks.

### 7.2 Accuracy vs Storage

| Storage Budget | Models Possible | Avg Accuracy (composite) |
|---------------|----------------|--------------------------|
| 50MB | Rule-based + tiny classifiers | 75% |
| 200MB | + language pack (2 languages) | 82% |
| 500MB | + full language pack + distilled models | 87% |
| 1.5GB | + Whisper tiny + LLM fallback | 91% |

### 7.3 Battery Impact

| Operation | Battery Drain | Impact per 100 uses |
|-----------|--------------|---------------------|
| Rule-based validation | Negligible | <0.1% |
| TinyML classifier | Very low | 0.3% |
| Whisper tiny transcription | Moderate | 5% |
| NLLB translation (100 words) | Low | 0.5% |
| Cloud AI call (w/ sync) | High (radio) | 8% |

### 7.4 Decision Framework

```
Is the task latency-sensitive? (sub-100ms)
├── YES → On-device required
├── NO → Is connectivity available?
│   ├── YES → Cloud AI (higher quality)
│   └── NO → On-device fallback
│
Is data privacy sensitive?
├── YES → On-device preferred
└── NO → Cloud acceptable
```

---

## 8. Rollout Plan

| Phase | Timeline | Capabilities | Devices |
|-------|----------|-------------|---------|
| **Phase 1** | Q3 2026 | Rule-based validation, quality flags | All Android/iOS |
| **Phase 2** | Q4 2026 | Translation (5 languages), form auto-fill | Mid/high-end |
| **Phase 3** | Q1 2027 | Whisper tiny, image classification | Mid/high-end |
| **Phase 4** | Q2 2027 | OCR, full offline query understanding | High-end |
| **Phase 5** | H2 2027 | Edge server deployment, federated learning pilot | Enterprise |
| **Phase 6** | 2028 | TinyML IoT integration, full FL rollout | All tiers |

---

## 9. Success Metrics

| Metric | Target (Phase 2) | Target (Phase 4) |
|--------|-------------------|-------------------|
| Offline validation accuracy | >90% | >95% |
| Translation BLEU score | >30 (on-device) | >35 (on-device) |
| On-device percentage of total AI | 5% | 30% |
| Battery impact per active hour | <5% | <3% |
| Model update success rate | >95% | >99% |
| Federated learning participation | N/A (pilot) | >20% of tenants |
