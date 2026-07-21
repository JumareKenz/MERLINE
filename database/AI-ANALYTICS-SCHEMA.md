# Merline AI & Analytics Schema

## Overview

This document defines the data architecture for AI capabilities (pgvector, embeddings, prompt management, inference logging) and analytics (materialized views, data warehouse integration, statistical analysis). AI is deferred to Phase 2, but the schema must be designed now to avoid migration pain later.

**Key extensions**: pgvector, TimescaleDB (optional for time-series), PostGIS

---

## 1. Embedding Storage (pgvector)

### 1.1 Embedding Schema

```sql
-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table: stores vector representations of content
CREATE TABLE embeddings (
    id                UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id   UUID NOT NULL,
    embeddable_type   VARCHAR(100) NOT NULL,
    embeddable_id     UUID NOT NULL,
    embedding         vector(1536) NOT NULL,  -- OpenAI ada-002 default
    content_text      TEXT,
    content_hash      VARCHAR(64),
    model             VARCHAR(100) NOT NULL,  -- 'text-embedding-ada-002', 'voyage-2', 'bge-large'
    chunk_index       INTEGER,
    chunk_count       INTEGER,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX ix_embedding_org ON embeddings(organization_id);
CREATE INDEX ix_embedding_poly ON embeddings(embeddable_type, embeddable_id);
CREATE INDEX ix_embedding_model ON embeddings(model);

-- Vector similarity index (IVFFlat for Phase 1)
CREATE INDEX ix_embedding_cosine 
    ON embeddings 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Alternative: HNSW for better accuracy (Phase 2+)
-- CREATE INDEX ix_embedding_hnsw 
--     ON embeddings 
--     USING hnsw (embedding vector_cosine_ops) 
--     WITH (m = 16, ef_construction = 200);
```

### 1.2 Embedding Search Functions

```sql
-- Semantic search across all entities
CREATE OR REPLACE FUNCTION search_semantic(
    query_embedding vector(1536),
    org_id UUID,
    entity_types TEXT[] DEFAULT NULL,
    match_count INTEGER DEFAULT 20,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    content TEXT,
    similarity FLOAT,
    metadata JSONB
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.embeddable_type::TEXT,
        e.embeddable_id,
        e.content_text,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.metadata
    FROM embeddings e
    WHERE e.organization_id = org_id
      AND (entity_types IS NULL OR e.embeddable_type = ANY(entity_types))
      AND 1 - (e.embedding <=> query_embedding) > similarity_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Hybrid search (full-text + semantic)
CREATE OR REPLACE FUNCTION search_hybrid(
    search_text TEXT,
    query_embedding vector(1536),
    org_id UUID,
    entity_types TEXT[] DEFAULT NULL,
    match_count INTEGER DEFAULT 20,
    fts_weight FLOAT DEFAULT 0.3,
    semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    content TEXT,
    score FLOAT,
    metadata JSONB
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    tsq tsquery := plainto_tsquery('english', search_text);
BEGIN
    RETURN QUERY
    WITH fts_scores AS (
        SELECT 
            e.id,
            e.embeddable_type,
            e.embeddable_id,
            e.content_text,
            e.metadata,
            ts_rank(to_tsvector('english', COALESCE(e.content_text, '')), tsq) AS fts_score
        FROM embeddings e
        WHERE e.organization_id = org_id
          AND (entity_types IS NULL OR e.embeddable_type = ANY(entity_types))
          AND to_tsvector('english', COALESCE(e.content_text, '')) @@ tsq
    ),
    semantic_scores AS (
        SELECT 
            e.id,
            1 - (e.embedding <=> query_embedding) AS semantic_score
        FROM embeddings e
        WHERE e.organization_id = org_id
          AND (entity_types IS NULL OR e.embeddable_type = ANY(entity_types))
    )
    SELECT 
        f.entity_type::TEXT,
        f.entity_id,
        f.content_text,
        (COALESCE(f.fts_score, 0) * fts_weight + COALESCE(s.semantic_score, 0) * semantic_weight) AS score,
        f.metadata
    FROM fts_scores f
    LEFT JOIN semantic_scores s ON s.id = f.id
    ORDER BY score DESC
    LIMIT match_count;
END;
$$;
```

### 1.3 Embedding-Supported Entity Types

| Entity Type | Content to Embed | Chunking Strategy | Use Case |
|-------------|-----------------|-------------------|----------|
| indicator | name, definition, purpose | Single chunk | Semantic indicator search |
| question | text, options, help_text | Per question | Question bank search |
| knowledge_item | title, content, context | 512-token chunks | RAG knowledge retrieval |
| report_section | content | 1024-token chunks | Report similarity search |
| transcript | content | 512-token chunks | Thematic analysis support |
| qualitative_session | notes | Single chunk | Session retrieval |
| submission | response values (text) | Per submission | Anomaly detection |

### 1.4 Embedding Generation Pipeline

```php
<?php
// app/Jobs/GenerateEmbeddings.php

class GenerateEmbeddings implements ShouldQueue
{
    public function __construct(
        private string $entityType,
        private string $entityId,
        private string $content
    ) {}

    public function handle(EmbeddingService $embeddings): void
    {
        // Chunk content
        $chunks = $this->chunkContent($this->content);
        
        foreach ($chunks as $index => $chunk) {
            // Generate embedding via AI Gateway
            $vector = $embeddings->generate($chunk['text']);
            
            // Store
            Embedding::create([
                'organization_id' => tenant()->id,
                'embeddable_type' => $this->entityType,
                'embeddable_id' => $this->entityId,
                'embedding' => $vector,
                'content_text' => $chunk['text'],
                'content_hash' => hash('sha256', $chunk['text']),
                'model' => config('ai.embedding_model'),
                'chunk_index' => $index,
                'chunk_count' => count($chunks),
            ]);
        }
    }

    private function chunkContent(string $content, int $maxTokens = 512): array
    {
        // Split by paragraphs, then by sentences for overflow
        $paragraphs = explode("\n\n", $content);
        $chunks = [];
        $current = '';
        
        foreach ($paragraphs as $para) {
            if (str_word_count($current . $para) > $maxTokens) {
                $chunks[] = ['text' => trim($current)];
                $current = $para;
            } else {
                $current .= "\n\n" . $para;
            }
        }
        
        if (trim($current)) {
            $chunks[] = ['text' => trim($current)];
        }
        
        return $chunks;
    }
}
```

### 1.5 Vector Search Query Patterns

```php
<?php
// app/Services/SemanticSearchService.php

class SemanticSearchService
{
    public function __construct(
        private EmbeddingService $embeddings
    ) {}

    // Simple semantic search
    public function search(string $query, array $options = []): Collection
    {
        $vector = $this->embeddings->generate($query);
        
        $results = DB::select("
            SELECT e.embeddable_type, e.embeddable_id, e.content_text,
                   1 - (e.embedding <=> ?) AS similarity,
                   e.metadata
            FROM embeddings e
            WHERE e.organization_id = ?
              AND (? IS NULL OR e.embeddable_type = ANY(?))
              AND 1 - (e.embedding <=> ?) > ?
            ORDER BY e.embedding <=> ?
            LIMIT ?
        ", [
            $vector,
            tenant()->id,
            $options['types'] ?? null,
            $options['types'] ?? null,
            $vector,
            $options['threshold'] ?? 0.7,
            $vector,
            $options['limit'] ?? 20,
        ]);
        
        return collect($results);
    }

    // Find similar indicators
    public function similarIndicators(Indicator $indicator, int $limit = 10): Collection
    {
        return $this->search($indicator->definition, [
            'types' => ['indicator'],
            'limit' => $limit + 1, // +1 because source will be included
        ])->filter(fn($r) => $r->entity_id !== $indicator->id)->take($limit);
    }

    // RAG context retrieval
    public function retrieveContext(string $query, array $entityTypes = ['knowledge_item', 'indicator', 'report_section']): string
    {
        $results = $this->search($query, [
            'types' => $entityTypes,
            'limit' => 5,
            'threshold' => 0.75,
        ]);
        
        return $results->map(fn($r) => 
            "[Source: {$r->entity_type} / {$r->entity_id}]\n{$r->content_text}"
        )->implode("\n\n---\n\n");
    }
}
```

---

## 2. Prompt and Model Version Tracking

### 2.1 Prompt Versions Table

```sql
CREATE TABLE prompt_versions (
    id                    UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    prompt_key            VARCHAR(100) NOT NULL,
    version               INTEGER NOT NULL DEFAULT 1,
    name                  VARCHAR(300),
    model                 VARCHAR(100) NOT NULL,
    system_prompt         TEXT NOT NULL,
    user_prompt_template  TEXT NOT NULL,
    parameters            JSONB NOT NULL DEFAULT '{}' 
                          CHECK (jsonb_typeof(parameters) = 'object'),
    variables             TEXT[] DEFAULT '{}',   -- Template variable names
    is_active             BOOLEAN NOT NULL DEFAULT FALSE,
    deployment_target     JSONB,                  -- Filter: tenant_id, study_type, etc.
    performance_metrics   JSONB,                  -- Avg tokens, latency, quality score
    change_notes          TEXT,
    created_by            UUID NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_prompt_version ON prompt_versions(prompt_key, version);
CREATE INDEX ix_prompt_active ON prompt_versions(is_active) WHERE is_active = TRUE;
CREATE INDEX ix_prompt_model ON prompt_versions(model);
```

### 2.2 Prompt Version Management

```php
<?php
// app/Services/PromptRegistryService.php

class PromptRegistryService
{
    public function getPrompt(string $promptKey, array $context = []): PromptVersion
    {
        // Find active prompt matching context filters
        $prompt = PromptVersion::where('prompt_key', $promptKey)
            ->where('is_active', true)
            ->orderBy('version', 'desc')
            ->first();

        if (!$prompt) {
            throw new PromptNotFoundException("No active prompt found for: {$promptKey}");
        }

        return $prompt;
    }

    public function deployVersion(string $promptKey, array $data): PromptVersion
    {
        return DB::transaction(function () use ($promptKey, $data) {
            $latest = PromptVersion::where('prompt_key', $promptKey)
                ->orderBy('version', 'desc')
                ->first();

            $version = new PromptVersion([
                'prompt_key' => $promptKey,
                'version' => ($latest->version ?? 0) + 1,
                'name' => $data['name'],
                'model' => $data['model'],
                'system_prompt' => $data['system_prompt'],
                'user_prompt_template' => $data['user_prompt_template'],
                'parameters' => $data['parameters'] ?? [],
                'variables' => $data['variables'] ?? [],
                'deployment_target' => $data['deployment_target'] ?? null,
                'change_notes' => $data['change_notes'] ?? '',
                'created_by' => auth()->id(),
            ]);
            $version->save();

            return $version;
        });
    }

    public function activate(string $promptKey, int $version): void
    {
        PromptVersion::where('prompt_key', $promptKey)
            ->update(['is_active' => false]);

        PromptVersion::where('prompt_key', $promptKey)
            ->where('version', $version)
            ->update(['is_active' => true]);
    }

    public function compilePrompt(PromptVersion $prompt, array $variables = []): array
    {
        $system = $prompt->system_prompt;
        $user = $prompt->user_prompt_template;

        foreach ($variables as $key => $value) {
            $user = str_replace("{{{$key}}}", $value, $user);
        }

        return [
            'model' => $prompt->model,
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ],
            'parameters' => $prompt->parameters,
        ];
    }
}
```

### 2.3 Model Routing Table

```sql
CREATE TABLE model_routes (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    route_key           VARCHAR(100) NOT NULL,  -- 'analysis', 'summary', 'qa', etc.
    model               VARCHAR(100) NOT NULL,
    priority            INTEGER NOT NULL DEFAULT 1,  -- Lower = tried first
    cost_per_1k_tokens  DECIMAL(10,6) NOT NULL,
    capabilities        TEXT[] NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_route_id   UUID,  -- Chain to next route on failure
    rate_limit          INTEGER,  -- RPM
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_model_route ON model_routes(route_key, priority);
```

---

## 3. Inference Logging and Observability

### 3.1 AI Inference Logs

```sql
CREATE TABLE ai_inference_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id     UUID NOT NULL,
    user_id             UUID,
    conversation_id     UUID,
    prompt_version_id   UUID,
    model               VARCHAR(100) NOT NULL,
    model_route_key     VARCHAR(100),
    
    -- Request
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    total_tokens        INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    
    -- Performance
    latency_ms          INTEGER,
    ttft_ms             INTEGER,  -- Time to first token
    
    -- Quality
    quality_score       DECIMAL(3,2),  -- 0-1, from automated evaluation
    confidence_score    DECIMAL(3,2),
    
    -- Cost
    cost_usd            DECIMAL(10,8),
    
    -- Context
    context_entity_type VARCHAR(100),
    context_entity_id   UUID,
    rag_chunks_used     INTEGER,
    rag_sources         TEXT[],
    
    -- Outcome
    was_cached          BOOLEAN NOT NULL DEFAULT FALSE,
    was_fallback        BOOLEAN NOT NULL DEFAULT FALSE,
    error_message       TEXT,
    user_rating         INTEGER,  -- 1-5 thumbs
    
    -- Full payload (sampled, not every request)
    input_payload       JSONB,
    output_payload      JSONB,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Partitions (monthly)
CREATE TABLE ai_inference_logs_2026_07 PARTITION OF ai_inference_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Indexes
CREATE INDEX ix_ail_org ON ai_inference_logs(organization_id);
CREATE INDEX ix_ail_user ON ai_inference_logs(user_id);
CREATE INDEX ix_ail_model ON ai_inference_logs(model);
CREATE INDEX ix_ail_created ON ai_inference_logs(created_at);
CREATE INDEX ix_ail_conversation ON ai_inference_logs(conversation_id);
CREATE INDEX ix_ail_prompt ON ai_inference_logs(prompt_version_id);

-- Retention: 90 days active, then purge
CREATE OR REPLACE FUNCTION purge_inference_logs()
RETURNS void AS $$
BEGIN
    DROP TABLE IF EXISTS ai_inference_logs_*
    WHERE to_timestamp(split_part(relname, '_', 3), 'YYYY_MM') < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Token Usage Tracking

```sql
CREATE TABLE ai_token_usage_daily (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id     UUID NOT NULL,
    date                DATE NOT NULL,
    model               VARCHAR(100) NOT NULL,
    prompt_key          VARCHAR(100),
    
    input_tokens        BIGINT NOT NULL DEFAULT 0,
    output_tokens       BIGINT NOT NULL DEFAULT 0,
    total_calls         INTEGER NOT NULL DEFAULT 0,
    total_cost_usd      DECIMAL(12,6) NOT NULL DEFAULT 0,
    
    avg_latency_ms      INTEGER,
    p95_latency_ms      INTEGER,
    error_count         INTEGER NOT NULL DEFAULT 0,
    
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uk_token_usage_daily ON ai_token_usage_daily(organization_id, date, model, prompt_key);
CREATE INDEX ix_token_usage_org ON ai_token_usage_daily(organization_id, date);
```

### 3.3 Inference Logging Implementation

```php
<?php
// app/Services/AILoggingService.php

class AILoggingService
{
    public function __construct(
        private AIGateway $gateway,
        private CacheService $cache
    ) {}

    public function logInference(array $request, array $response, float $duration): void
    {
        // Always log metadata (low volume)
        $log = new AIInferenceLog();
        $log->organization_id = tenant()->id;
        $log->user_id = auth()->id();
        $log->model = $response['model'] ?? $request['model'];
        $log->input_tokens = $response['usage']['input_tokens'] ?? 0;
        $log->output_tokens = $response['usage']['output_tokens'] ?? 0;
        $log->latency_ms = (int) ($duration * 1000);
        $log->cost_usd = $this->calculateCost($response);
        $log->was_cached = $response['from_cache'] ?? false;
        $log->was_fallback = $response['from_fallback'] ?? false;
        $log->error_message = $response['error'] ?? null;
        $log->context_entity_type = $request['context_type'] ?? null;
        $log->context_entity_id = $request['context_id'] ?? null;
        
        // Sample full payload (1 in 100 for cost control)
        if (random_int(1, 100) === 1) {
            $log->input_payload = json_encode($request);
            $log->output_payload = json_encode($response);
        }
        
        $log->save();

        // Update daily aggregation
        $this->updateDailyMetrics($log);
    }

    public function updateDailyMetrics(AIInferenceLog $log): void
    {
        $date = $log->created_at->toDateString();
        
        DB::statement("
            INSERT INTO ai_token_usage_daily 
                (organization_id, date, model, input_tokens, output_tokens, total_calls, total_cost_usd, avg_latency_ms)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT (organization_id, date, model)
            DO UPDATE SET
                input_tokens = ai_token_usage_daily.input_tokens + EXCLUDED.input_tokens,
                output_tokens = ai_token_usage_daily.output_tokens + EXCLUDED.output_tokens,
                total_calls = ai_token_usage_daily.total_calls + 1,
                total_cost_usd = ai_token_usage_daily.total_cost_usd + EXCLUDED.total_cost_usd,
                avg_latency_ms = (ai_token_usage_daily.avg_latency_ms * (total_calls - 1) + EXCLUDED.avg_latency_ms) / total_calls
        ", [
            $log->organization_id,
            $date,
            $log->model,
            $log->input_tokens,
            $log->output_tokens,
            $log->cost_usd ?? 0,
            $log->latency_ms,
        ]);
    }

    private function calculateCost(array $response): float
    {
        $model = $response['model'] ?? 'gpt-4o';
        $rates = config("ai.models.{$model}.pricing");
        
        $inputCost = ($response['usage']['input_tokens'] ?? 0) / 1000 * ($rates['input_per_1k'] ?? 0);
        $outputCost = ($response['usage']['output_tokens'] ?? 0) / 1000 * ($rates['output_per_1k'] ?? 0);
        
        return $inputCost + $outputCost;
    }
}
```

---

## 4. Knowledge Graph Structure

### 4.1 Entity Link Table

```sql
-- Explicit knowledge graph relationships between entities
CREATE TABLE knowledge_links (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id     UUID NOT NULL,
    source_type         VARCHAR(100) NOT NULL,
    source_id           UUID NOT NULL,
    target_type         VARCHAR(100) NOT NULL,
    target_id           UUID NOT NULL,
    relationship_type   VARCHAR(100) NOT NULL,  
                        -- 'measures', 'derives_from', 'contradicts', 'complements',
                        -- 'replaces', 'component_of', 'cross_references',
                        -- 'informs', 'evidence_for', 'associated_with'
    weight              DECIMAL(3,2) DEFAULT 1.0,  -- Strength of relationship
    metadata            JSONB,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_kl_source ON knowledge_links(source_type, source_id);
CREATE INDEX ix_kl_target ON knowledge_links(target_type, target_id);
CREATE INDEX ix_kl_org ON knowledge_links(organization_id);
CREATE INDEX ix_kl_type ON knowledge_links(relationship_type);

-- Graph traversal query example:
-- Find all indicators related to a question (2 hops)
WITH RECURSIVE entity_graph AS (
    -- Base: direct links from source
    SELECT source_type, source_id, target_type, target_id, relationship_type, 1 AS depth
    FROM knowledge_links
    WHERE source_type = 'question' AND source_id = 'question-uuid'
    
    UNION ALL
    
    -- Recursive: follow links
    SELECT kl.source_type, kl.source_id, kl.target_type, kl.target_id, 
           kl.relationship_type, eg.depth + 1
    FROM knowledge_links kl
    JOIN entity_graph eg ON eg.target_type = kl.source_type AND eg.target_id = kl.source_id
    WHERE eg.depth < 3  -- Max 3 hops
)
SELECT DISTINCT target_type, target_id, relationship_type, depth
FROM entity_graph
ORDER BY depth;
```

### 4.2 Graph Query Service

```php
<?php
// app/Services/KnowledgeGraphService.php

class KnowledgeGraphService
{
    public function findRelatedEntities(
        string $entityType,
        string $entityId,
        array $relationshipTypes = [],
        int $maxDepth = 3
    ): Collection {
        $params = [$entityType, $entityId, $maxDepth];
        $typeFilter = '';
        
        if (!empty($relationshipTypes)) {
            $placeholders = implode(', ', array_fill(0, count($relationshipTypes), '?'));
            $typeFilter = "AND kl.relationship_type IN ({$placeholders})";
            $params = array_merge($params, $relationshipTypes);
        }

        return collect(DB::select("
            WITH RECURSIVE entity_graph AS (
                SELECT source_type, source_id, target_type, target_id, 
                       relationship_type, 1 AS depth, ARRAY[source_id || target_id] AS path
                FROM knowledge_links
                WHERE source_type = ? AND source_id = ?
                
                UNION ALL
                
                SELECT kl.source_type, kl.source_id, kl.target_type, kl.target_id,
                       kl.relationship_type, eg.depth + 1, eg.path || kl.source_id || kl.target_id
                FROM knowledge_links kl
                JOIN entity_graph eg 
                    ON eg.target_type = kl.source_type 
                    AND eg.target_id = kl.source_id
                    AND NOT (kl.source_id || kl.target_id = ANY(eg.path))
                WHERE eg.depth < ?
            )
            SELECT DISTINCT target_type, target_id, relationship_type, depth
            FROM entity_graph
            ORDER BY depth, relationship_type
        ", $params));
    }

    public function getIndicatorNetwork(string $indicatorId): array
    {
        return [
            'questions' => $this->findRelatedEntities('indicator', $indicatorId, ['measures']),
            'components' => $this->findRelatedEntities('indicator', $indicatorId, ['component_of']),
            'cross_references' => $this->findRelatedEntities('indicator', $indicatorId, ['cross_references']),
            'derived' => $this->findRelatedEntities('indicator', $indicatorId, ['derives_from']),
            'informing' => $this->findRelatedEntities('indicator', $indicatorId, ['informs']),
        ];
    }
}
```

---

## 5. Evaluation Dataset Schema

### 5.1 Evaluation Data Tables

```sql
-- Evaluation datasets for AI quality monitoring
CREATE TABLE evaluation_datasets (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id     UUID NOT NULL,
    name                VARCHAR(300) NOT NULL,
    description         TEXT,
    dataset_type        VARCHAR(50) NOT NULL CHECK (dataset_type IN (
                            'ground_truth', 'human_eval', 'regression', 'adversarial'
                        )),
    model               VARCHAR(100),
    prompt_key          VARCHAR(100),
    version             INTEGER NOT NULL DEFAULT 1,
    total_examples      INTEGER NOT NULL DEFAULT 0,
    pass_rate           DECIMAL(5,4),
    metadata            JSONB,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evaluation_examples (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    dataset_id          UUID NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
    input               TEXT NOT NULL,
    expected_output     TEXT,
    actual_output       TEXT,
    pass                BOOLEAN,
    score               DECIMAL(5,4),
    score_rationale     TEXT,
    error_type          VARCHAR(100),
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ee_dataset ON evaluation_examples(dataset_id);
CREATE INDEX ix_ee_pass ON evaluation_examples(dataset_id, pass);

-- Evaluation run results
CREATE TABLE evaluation_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    dataset_id          UUID NOT NULL REFERENCES evaluation_datasets(id),
    prompt_version_id   UUID NOT NULL,
    model               VARCHAR(100) NOT NULL,
    run_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_examples      INTEGER NOT NULL,
    passed_examples     INTEGER NOT NULL,
    failed_examples     INTEGER NOT NULL,
    pass_rate           DECIMAL(5,4) GENERATED ALWAYS AS 
                        (passed_examples::DECIMAL / NULLIF(total_examples, 0)) STORED,
    avg_score           DECIMAL(5,4),
    duration_seconds    INTEGER,
    metadata            JSONB
);

CREATE INDEX ix_er_dataset ON evaluation_runs(dataset_id);
CREATE INDEX ix_er_prompt ON evaluation_runs(prompt_version_id);
```

---

## 6. Analytics Materialized Views

### 6.1 Daily Submission Aggregation

```sql
CREATE MATERIALIZED VIEW mv_daily_submissions AS
SELECT
    s.organization_id,
    s.study_id,
    s.completed_at::DATE AS submission_date,
    s.status,
    COUNT(*) AS submission_count,
    COUNT(DISTINCT s.enumerator_id) AS active_enumerators,
    COUNT(DISTINCT s.assignment_id) AS assignments_used,
    AVG(s.duration_seconds)::INTEGER AS avg_duration_seconds,
    COUNT(*) FILTER (WHERE s.flagged_for_review = TRUE) AS flagged_count,
    COUNT(*) FILTER (WHERE s.validation_status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE s.status = 'approved') AS approved_count
FROM submissions s
WHERE s.deleted_at IS NULL
GROUP BY s.organization_id, s.study_id, s.completed_at::DATE, s.status;

CREATE UNIQUE INDEX ix_mv_daily_sub ON mv_daily_submissions(organization_id, study_id, submission_date, status);
```

### 6.2 Indicator Trend (Time-Series)

```sql
CREATE MATERIALIZED VIEW mv_indicator_trend AS
SELECT
    iv.indicator_id,
    i.code AS indicator_code,
    i.name AS indicator_name,
    i.level,
    iv.period_start,
    iv.period_end,
    iv.value,
    iv.numerator_value,
    iv.denominator_value,
    iv.is_baseline,
    iv.is_actual,
    iv.is_estimated,
    iv.disaggregation_dimension,
    iv.disaggregation_category,
    i.target_value,
    CASE 
        WHEN iv.value IS NULL THEN NULL
        WHEN i.target_value IS NULL THEN NULL
        WHEN iv.value >= i.target_value THEN 'achieved'
        WHEN iv.value >= i.target_value * 0.75 THEN 'on_track'
        WHEN iv.value >= i.target_value * 0.5 THEN 'at_risk'
        ELSE 'off_track'
    END AS rag_status
FROM indicator_values iv
JOIN indicators i ON i.id = iv.indicator_id AND i.deleted_at IS NULL
WHERE iv.status = 'approved';

CREATE UNIQUE INDEX ix_mv_indicator_trend ON mv_indicator_trend(indicator_id, period_start, disaggregation_dimension, disaggregation_category);
CREATE INDEX ix_mv_indicator_rag ON mv_indicator_trend(rag_status);
```

### 6.3 Enumerator Quality Metrics

```sql
CREATE MATERIALIZED VIEW mv_enumerator_quality AS
SELECT
    a.enumerator_id,
    a.study_id,
    u.first_name || ' ' || u.last_name AS enumerator_name,
    t.name AS team_name,
    COUNT(DISTINCT a.id) AS total_assignments,
    COUNT(DISTINCT sub.id) AS total_submissions,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'approved') AS approved_submissions,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.flagged_for_review = TRUE) AS flagged_submissions,
    COUNT(DISTINCT sub.id) FILTER (WHERE sub.validation_status = 'failed') AS failed_submissions,
    ROUND(AVG(sub.duration_seconds)::NUMERIC, 0)::INTEGER AS avg_duration_seconds,
    ROUND(AVG(dq.score)::NUMERIC, 2) AS avg_quality_score,
    MIN(sub.completed_at) AS first_submission,
    MAX(sub.completed_at) AS last_submission,
    ROUND(
        COUNT(DISTINCT sub.id) FILTER (WHERE sub.status = 'approved')::DECIMAL / 
        NULLIF(COUNT(DISTINCT a.id), 0), 4
    ) AS completion_rate
FROM assignments a
JOIN users u ON u.id = a.enumerator_id
LEFT JOIN teams t ON t.id = u.id  -- via team_members
LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.deleted_at IS NULL
LEFT JOIN data_quality_checks dq ON dq.submission_id = sub.id
WHERE a.deleted_at IS NULL
GROUP BY a.enumerator_id, a.study_id, u.first_name, u.last_name, t.name;

CREATE UNIQUE INDEX ix_mv_enum_quality ON mv_enumerator_quality(enumerator_id, study_id);
```

### 6.4 Refreshing Materialized Views

```php
<?php
// app/Console/Commands/RefreshAnalyticsViews.php

class RefreshAnalyticsViews extends Command
{
    protected $signature = 'analytics:refresh {view?} {--tenant=}';

    public function handle(): int
    {
        $views = [
            'mv_daily_submissions' => 15,     // minutes
            'mv_indicator_trend' => 60,        // minutes
            'mv_indicator_performance' => 60,
            'mv_enumerator_quality' => 360,    // 6 hours
            'mv_study_progress' => 15,
        ];

        $view = $this->argument('view');

        if ($view && !isset($views[$view])) {
            $this->error("Unknown view: {$view}");
            return Command::FAILURE;
        }

        $targets = $view ? [$view => $views[$view]] : $views;

        foreach ($targets as $name => $interval) {
            $start = microtime(true);
            
            DB::statement("REFRESH MATERIALIZED VIEW CONCURRENTLY {$name}");
            
            $duration = round((microtime(true) - $start) * 1000);
            Log::info("Refreshed {$name} in {$duration}ms");
        }

        return Command::SUCCESS;
    }
}
```

---

## 7. Data Warehouse Integration Points

### 7.1 CDC Logical Replication

```sql
-- Publication for CDC to analytics database
CREATE PUBLICATION merline_cdc FOR TABLE
    submissions,
    response_values,
    indicator_values,
    audit_events;

-- Subscription on analytics database
CREATE SUBSCRIPTION merline_analytics_sub
    CONNECTION 'host=primary dbname=merline user=replicator'
    PUBLICATION merline_cdc;
```

### 7.2 Analytics Export Views

```sql
-- Star-schema fact table for BI tools
CREATE VIEW v_fact_submissions AS
SELECT
    s.id AS submission_id,
    s.organization_id,
    s.study_id,
    s.questionnaire_id,
    s.enumerator_id,
    s.assignment_id,
    s.status,
    s.completed_at::DATE AS completion_date,
    EXTRACT(DOW FROM s.completed_at) AS day_of_week,
    EXTRACT(HOUR FROM s.completed_at) AS hour_of_day,
    s.duration_seconds,
    CASE 
        WHEN s.duration_seconds < 300 THEN 'too_fast'
        WHEN s.duration_seconds < 600 THEN 'fast'
        WHEN s.duration_seconds < 1800 THEN 'normal'
        WHEN s.duration_seconds < 3600 THEN 'slow'
        ELSE 'too_slow'
    END AS duration_category,
    s.flagged_for_review,
    s.validation_status,
    q.title AS questionnaire_title,
    st.title AS study_title,
    st.study_type
FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN studies st ON st.id = s.study_id
WHERE s.deleted_at IS NULL;

-- Dimension view for enumerators
CREATE VIEW v_dim_enumerator AS
SELECT
    u.id AS enumerator_id,
    u.first_name || ' ' || u.last_name AS full_name,
    t.name AS team_name,
    u.locale,
    e.is_active
FROM users u
JOIN enumerators e ON e.user_id = u.id AND e.deleted_at IS NULL
LEFT JOIN teams t ON t.id = e.team_id;
```

### 7.3 Parquet Export for Data Lake

```php
<?php
// app/Jobs/ExportToDataLake.php

class ExportToDataLake implements ShouldQueue
{
    public function handle(): void
    {
        $exportDate = now()->subDay()->toDateString();
        
        // Export submissions
        DB::connection('analytics')->statement("
            COPY (
                SELECT * FROM v_fact_submissions 
                WHERE completion_date = '{$exportDate}'
            ) TO '/tmp/submissions_{$exportDate}.parquet' 
            WITH (FORMAT PARQUET)
        ");
        
        // Upload to S3 data lake
        Storage::disk('s3-datalake')->put(
            "submissions/{$exportDate}/submissions.parquet",
            file_get_contents("/tmp/submissions_{$exportDate}.parquet")
        );
        
        // Export indicator values
        DB::connection('analytics')->statement("
            COPY (
                SELECT * FROM mv_indicator_trend
                WHERE period_end >= '{$exportDate}'
            ) TO '/tmp/indicators_{$exportDate}.parquet'
            WITH (FORMAT PARQUET)
        ");
        
        Storage::disk('s3-datalake')->put(
            "indicators/{$exportDate}/indicators.parquet",
            file_get_contents("/tmp/indicators_{$exportDate}.parquet")
        );
    }
}
```

---

## 8. Statistical Analysis Schema (R Integration)

### 8.1 Analysis Request Table

```sql
-- Track statistical analysis requests (for R/Python integration)
CREATE TABLE analysis_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    organization_id     UUID NOT NULL,
    study_id            UUID REFERENCES studies(id),
    requested_by        UUID NOT NULL,
    analysis_type       VARCHAR(100) NOT NULL,  
                        -- 'descriptive', 'cross_tab', 'regression', 't_test', 'anova',
                        -- 'chi_square', 'correlation', 'cluster', 'pca', 'qualitative'
    configuration       JSONB NOT NULL,  -- Variables, parameters, filters
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    result_data         JSONB,  -- Computed results
    result_file_url     VARCHAR(500),  -- R Markdown / Jupyter output
    error_message       TEXT,
    execution_time_ms   INTEGER,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ar_study ON analysis_requests(study_id);
CREATE INDEX ix_ar_user ON analysis_requests(requested_by);
CREATE INDEX ix_ar_status ON analysis_requests(status);
```

### 8.2 Analysis Result Tables

```sql
-- Cross-tabulation results
CREATE TABLE analysis_crosstabs (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    request_id          UUID NOT NULL REFERENCES analysis_requests(id) ON DELETE CASCADE,
    row_variable        VARCHAR(200) NOT NULL,
    column_variable     VARCHAR(200) NOT NULL,
    row_category        VARCHAR(200),
    column_category     VARCHAR(200),
    count               INTEGER NOT NULL,
    row_percentage      DECIMAL(7,4),
    column_percentage   DECIMAL(7,4),
    total_percentage    DECIMAL(7,4),
    chi_square_value    DECIMAL(10,4),
    chi_square_p_value  DECIMAL(10,6),
    expected_count      DECIMAL(10,4),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ac_request ON analysis_crosstabs(request_id);

-- Regression results
CREATE TABLE analysis_regression (
    id                  UUID PRIMARY KEY DEFAULT gen_uuid_v7(),
    request_id          UUID NOT NULL REFERENCES analysis_requests(id) ON DELETE CASCADE,
    model_type          VARCHAR(50) NOT NULL,  -- 'linear', 'logistic', 'multinomial', 'poisson'
    dependent_var       VARCHAR(200) NOT NULL,
    independent_var     VARCHAR(200) NOT NULL,
    coefficient         DECIMAL(12,6),
    std_error           DECIMAL(12,6),
    z_value             DECIMAL(12,6),
    p_value             DECIMAL(10,6),
    confidence_low_95   DECIMAL(12,6),
    confidence_high_95  DECIMAL(12,6),
    r_squared           DECIMAL(7,4),
    adjusted_r_squared  DECIMAL(7,4),
    significance_code   CHAR(1),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ar_request ON analysis_regression(request_id);
```

### 8.3 R Integration Service

```php
<?php
// app/Services/StatisticalAnalysisService.php

class StatisticalAnalysisService
{
    public function runAnalysis(AnalysisRequest $request): void
    {
        $request->update(['status' => 'running']);
        
        // Export data for R
        $dataFile = $this->exportDataForR($request);
        
        // Generate R script
        $script = $this->generateRScript($request, $dataFile);
        
        // Execute via Rscript
        $resultFile = storage_path("analysis/{$request->id}_result.rds");
        
        $command = sprintf(
            'Rscript --vanilla %s %s %s 2>&1',
            escapeshellarg($script),
            escapeshellarg($dataFile),
            escapeshellarg($resultFile)
        );
        
        $output = shell_exec($command);
        
        if ($output === null) {
            $request->update([
                'status' => 'failed',
                'error_message' => 'R execution failed',
            ]);
            return;
        }
        
        // Parse results
        $results = json_decode(file_get_contents($resultFile), true);
        
        $request->update([
            'status' => 'completed',
            'result_data' => $results,
            'completed_at' => now(),
        ]);
        
        // Cleanup
        unlink($dataFile);
        unlink($script);
        unlink($resultFile);
    }

    private function exportDataForR(AnalysisRequest $request): string
    {
        $filePath = storage_path("analysis/{$request->id}_data.csv");
        
        $query = $this->buildDataQuery($request);
        
        DB::connection('analytics')->statement("
            COPY ({$query}) TO '{$filePath}' DELIMITER ',' CSV HEADER
        ");
        
        return $filePath;
    }

    private function generateRScript(AnalysisRequest $request, string $dataFile): string
    {
        $template = match ($request->analysis_type) {
            'descriptive' => $this->descriptiveTemplate(),
            'cross_tab' => $this->crosstabTemplate(),
            'regression' => $this->regressionTemplate(),
            't_test' => $this->ttestTemplate(),
            default => throw new InvalidArgumentException("Unknown analysis type: {$request->analysis_type}"),
        };
        
        $script = str_replace(
            ['{{DATA_FILE}}', '{{CONFIG}}'],
            [$dataFile, json_encode($request->configuration)],
            $template
        );
        
        $scriptPath = storage_path("analysis/{$request->id}_script.R");
        file_put_contents($scriptPath, $script);
        
        return $scriptPath;
    }
}
```

---

## 9. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Vector dimension** | 1536 (OpenAI ada-002) | Most widely supported; can be reduced via PCA if needed |
| **Vector index** | IVFFlat (Phase 1) → HNSW (Phase 2) | IVFFlat builds fast for initial use; HNSW for production scale |
| **Embedding model** | Configurable per tenant | Supports data sovereignty requirements |
| **Prompt storage** | Versioned rows in PostgreSQL | No need for separate prompt management system in Phase 1 |
| **Inference logging** | Sampled payloads (1%) | Full payload storage is expensive; metadata always logged |
| **Knowledge graph** | PostgreSQL adjacency list | Sufficient for <1M relationships; migrate to Neo4j if scale demands |
| **Analytics views** | Materialized views (CONCURRENTLY) | Refresh without blocking reads |
| **Statistical analysis** | PostgreSQL + R integration | R for computation, PostgreSQL for data management |
| **CDC** | Logical replication (Phase 2) | Application-level event publishing in Phase 1 |
| **Data lake** | Parquet in S3 | Columnar format for analytics; cost-effective cold storage |
