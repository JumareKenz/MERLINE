# Merline Statistical Analysis Framework

## Architecture

```
Application (Web/Mobile)
    │
    ├── Built-in Statistics (SQL in PostgreSQL)
    │   ├── Descriptive statistics
    │   ├── Frequency tables
    │   ├── Cross-tabulations (chi-square)
    │   └── Basic regression
    │
    ├── R Integration (Phase 1+)
    │   ├── Hypothesis testing (t-test, ANOVA)
    │   ├── Regression models (linear, logistic, multilevel)
    │   ├── Survey analysis (weights, design effects)
    │   └── Advanced visualizations
    │
    └── Python Integration (Phase 2+)
        ├── Machine learning
        ├── Natural language processing
        ├── Geospatial analysis
        └── Causal inference
```

---

## 1. Descriptive Statistics

### 1.1 Built-in SQL Functions

```sql
-- Continuous variables
SELECT
    question_code,
    COUNT(*) AS n,
    COUNT(*) FILTER (WHERE value IS NOT NULL) AS valid_n,
    AVG(value::DECIMAL) AS mean,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value::DECIMAL) AS median,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value::DECIMAL) AS q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value::DECIMAL) AS q3,
    STDDEV(value::DECIMAL) AS std_dev,
    VARIANCE(value::DECIMAL) AS variance,
    MIN(value::DECIMAL) AS min,
    MAX(value::DECIMAL) AS max,
    COUNT(*) FILTER (WHERE value IS NULL) AS missing_count,
    COUNT(*) FILTER (WHERE value IS NULL)::DECIMAL / COUNT(*) * 100 AS missing_pct
FROM analytics.fact_submissions fs
JOIN analytics.response_values rv ON rv.submission_key = fs.submission_key
WHERE fs.dim_study_key = :study_key
  AND rv.question_id = :question_id;

-- Categorical variables
SELECT
    rv.value->>'value' AS category,
    COUNT(*) AS frequency,
    COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100 AS percentage
FROM analytics.fact_submissions fs
JOIN analytics.response_values rv ON rv.submission_key = fs.submission_key
WHERE fs.dim_study_key = :study_key
  AND rv.question_id = :question_id
GROUP BY rv.value->>'value'
ORDER BY frequency DESC;
```

### 1.2 Frequency Tables

```php
class FrequencyAnalysis
{
    public function run(string $studyId, string $questionId): array
    {
        $results = DB::connection('analytics')->select("
            SELECT
                rv.value->>'value' AS category,
                COUNT(*) AS frequency,
                ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) AS percentage,
                ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (ORDER BY COUNT(*) DESC) * 100, 1) AS cumulative_pct
            FROM submissions s
            JOIN response_values rv ON rv.submission_id = s.id
            WHERE s.study_id = :study_id
              AND rv.question_id = :question_id
              AND s.status = 'approved'
              AND s.deleted_at IS NULL
            GROUP BY rv.value->>'value'
            ORDER BY frequency DESC
        ", ['study_id' => $studyId, 'question_id' => $questionId]);

        $total = array_sum(array_column($results, 'frequency'));
        $missing = DB::connection('analytics')->scalar("
            SELECT COUNT(*) FROM submissions s
            WHERE s.study_id = :study_id
              AND s.status = 'approved'
              AND s.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM response_values rv
                  WHERE rv.submission_id = s.id AND rv.question_id = :question_id
              )
        ", ['study_id' => $studyId, 'question_id' => $questionId]);

        return [
            'question_id' => $questionId,
            'total_responses' => $total,
            'missing' => $missing,
            'categories' => $results,
            'statistics' => [
                'valid_responses' => $total,
                'missing_pct' => $total > 0 ? round($missing / ($total + $missing) * 100, 1) : 0,
            ],
        ];
    }
}
```

### 1.3 Cross-Tabulation

```php
class CrossTabulation
{
    public function run(string $studyId, string $rowQuestionId, string $colQuestionId): array
    {
        $rows = DB::connection('analytics')->select("
            SELECT
                COALESCE(rv_row.value->>'value', '(missing)') AS row_category,
                COALESCE(rv_col.value->>'value', '(missing)') AS col_category,
                COUNT(*) AS cell_count
            FROM submissions s
            JOIN response_values rv_row ON rv_row.submission_id = s.id
                AND rv_row.question_id = :row_qid
            JOIN response_values rv_col ON rv_col.submission_id = s.id
                AND rv_col.question_id = :col_qid
            WHERE s.study_id = :study_id
              AND s.status = 'approved'
              AND s.deleted_at IS NULL
            GROUP BY row_category, col_category
            ORDER BY row_category, col_category
        ", [
            'study_id' => $studyId,
            'row_qid' => $rowQuestionId,
            'col_qid' => $colQuestionId,
        ]);

        // Convert to matrix
        $matrix = $this->buildMatrix($rows);

        // Chi-square test
        $chiSquare = $this->chiSquareTest($matrix);

        return [
            'row_variable' => $rowQuestionId,
            'column_variable' => $colQuestionId,
            'table' => $matrix,
            'chi_square' => $chiSquare,
            'total_n' => array_sum(array_map('array_sum', $matrix['cells'])),
        ];
    }

    private function chiSquareTest(array $matrix): array
    {
        $rows = count($matrix['rows']);
        $cols = count($matrix['cols']);
        $total = array_sum(array_map('array_sum', $matrix['cells']));
        $chi2 = 0;

        // Expected frequencies
        $rowTotals = array_map('array_sum', $matrix['cells']);
        $colTotals = array_fill(0, $cols, 0);
        foreach ($matrix['cells'] as $row) {
            foreach ($row as $j => $val) {
                $colTotals[$j] += $val;
            }
        }

        for ($i = 0; $i < $rows; $i++) {
            for ($j = 0; $j < $cols; $j++) {
                $expected = ($rowTotals[$i] * $colTotals[$j]) / $total;
                if ($expected > 0) {
                    $observed = $matrix['cells'][$i][$j];
                    $chi2 += pow($observed - $expected, 2) / $expected;
                }
            }
        }

        $df = ($rows - 1) * ($cols - 1);
        $pValue = 1 - stats_cdf_chisquare($chi2, $df);

        return [
            'chi_square' => round($chi2, 4),
            'degrees_of_freedom' => $df,
            'p_value' => round($pValue, 6),
            'significant_at_005' => $pValue < 0.05,
            'minimum_expected_cell_count' => min(array_filter($this->expectedCells($matrix))),
        ];
    }
}
```

---

## 2. Inferential Statistics (R Integration)

### 2.1 R Integration Architecture

```
PHP Application
    │
    ├── Export data to CSV / RDS
    ├── Generate R script from template
    ├── Execute via Rscript (subprocess)
    ├── Parse JSON results
    └── Store in analysis_requests / analysis_regression tables
```

### 2.2 Supported Statistical Tests

| Test | Function | Use Case | R Package |
|------|----------|----------|-----------|
| One-sample t-test | `t.test(x, mu=0)` | Compare mean to known value | stats |
| Independent t-test | `t.test(x ~ group)` | Compare two groups | stats |
| Paired t-test | `t.test(before, after, paired=TRUE)` | Pre/post comparison | stats |
| Wilcoxon test | `wilcox.test(x ~ group)` | Non-parametric group comparison | stats |
| One-way ANOVA | `aov(y ~ factor)` | Compare 3+ groups | stats |
| Two-way ANOVA | `aov(y ~ f1 * f2)` | Factorial design | stats |
| Repeated measures ANOVA | `aov(y ~ time + Error(subject/time))` | Longitudinal | stats |
| Chi-square test | `chisq.test(table)` | Association between categorical | stats |
| Fisher's exact | `fisher.test(table)` | Small cell counts | stats |
| Pearson correlation | `cor.test(x, y, method='pearson')` | Linear relationship | stats |
| Spearman correlation | `cor.test(x, y, method='spearman')` | Monotonic relationship | stats |
| Linear regression | `lm(y ~ x1 + x2)` | Continuous outcome | stats |
| Logistic regression | `glm(y ~ x1, family=binomial)` | Binary outcome | stats |
| Poisson regression | `glm(y ~ x1, family=poisson)` | Count outcome | stats |
| Multilevel model | `lmer(y ~ x + (1|cluster))` | Clustered data | lme4 |
| Principal component | `prcomp(data, scale=TRUE)` | Dimensionality reduction | stats |
| Cluster analysis | `kmeans(data, centers=k)` | Segmentation | stats |
| Factor analysis | `factanal(data, factors=n)` | Latent variable identification | stats |

### 2.3 R Script Template

```r
#!/usr/bin/env Rscript

# Generated by Merline Statistical Analysis Service
# Analysis Type: t_test

args <- commandArgs(trailingOnly = TRUE)
data_file <- args[1]
output_file <- args[2]
config <- jsonlite::fromJSON(args[3])

# Load data
data <- read.csv(data_file, stringsAsFactors = FALSE)

# Run analysis
result <- list()

if (config$test == "independent_t") {
    test_result <- t.test(
        data[[config$dependent]] ~ data[[config$group]],
        alternative = config$alternative %||% "two.sided",
        conf.level = config$conf_level %||% 0.95
    )

    result$type <- "Independent t-test"
    result$statistic <- test_result$statistic
    result$parameter <- test_result$parameter
    result$p_value <- test_result$p.value
    result$conf_int <- test_result$conf.int
    result$estimate <- test_result$estimate
    result$effect_size <- abs(test_result$estimate[1] - test_result$estimate[2]) /
        pooled_sd(data[[config$dependent]], data[[config$group]])
    result$interpretation <- ifelse(
        test_result$p.value < 0.05,
        paste0("Significant difference (p = ", round(test_result$p.value, 4), ")"),
        paste0("No significant difference (p = ", round(test_result$p.value, 4), ")")
    )
}

# Write output
jsonlite::write_json(result, output_file, auto_unbox = TRUE)
```

### 2.4 Analysis Request Flow

```php
class StatisticalAnalysisService
{
    public function requestAnalysis(string $studyId, string $type, array $config): AnalysisRequest
    {
        // 1. Create request record
        $request = AnalysisRequest::create([
            'study_id' => $studyId,
            'analysis_type' => $type,
            'configuration' => $config,
            'status' => 'pending',
            'requested_by' => auth()->id(),
        ]);

        // 2. Dispatch async job
        RunAnalysisJob::dispatch($request);

        return $request;
    }

    public function execute(AnalysisRequest $request): void
    {
        $request->update(['status' => 'running']);

        try {
            // Export data
            $dataFile = $this->exportData($request);

            // Generate R script
            $scriptFile = $this->generateScript($request, $dataFile);

            // Output file
            $outputFile = storage_path("analysis/{$request->id}_result.json");

            // Execute R
            $command = sprintf(
                'Rscript --vanilla %s %s %s %s 2>&1',
                escapeshellarg($scriptFile),
                escapeshellarg($dataFile),
                escapeshellarg($outputFile),
                escapeshellarg(json_encode($request->configuration))
            );

            $start = microtime(true);
            exec($command, $output, $exitCode);
            $duration = (int)((microtime(true) - $start) * 1000);

            if ($exitCode !== 0) {
                throw new AnalysisFailedException(implode("\n", $output));
            }

            // Parse results
            $results = json_decode(file_get_contents($outputFile), true);

            $request->update([
                'status' => 'completed',
                'result_data' => $results,
                'execution_time_ms' => $duration,
                'completed_at' => now(),
            ]);

            // Cleanup
            @unlink($dataFile);
            @unlink($scriptFile);
            @unlink($outputFile);

        } catch (\Exception $e) {
            $request->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }
    }
}
```

---

## 3. Longitudinal Analysis

### 3.1 Baseline → Midline → Endline Comparison

```php
class LongitudinalAnalysis
{
    public function compareRounds(string $projectId, string $indicatorId): array
    {
        $results = DB::connection('analytics')->select("
            SELECT
                st.study_type,
                st.title AS study_title,
                st.start_date,
                st.end_date,
                iv.value,
                iv.numerator_value,
                iv.denominator_value,
                iv.confidence_low,
                iv.confidence_high,
                iv.sample_size
            FROM analytics.fact_indicator_values iv
            JOIN analytics.dim_study st ON st.study_key = iv.dim_study_key
            WHERE iv.dim_indicator_key = (
                SELECT indicator_key FROM analytics.dim_indicator
                WHERE indicator_id = :indicator_id AND is_current = TRUE
            )
            AND st.project_key = (
                SELECT project_key FROM analytics.dim_project
                WHERE project_id = :project_id AND is_current = TRUE
            )
            AND iv.is_actual = TRUE
            AND iv.disaggregation_dimension IS NULL
            ORDER BY st.start_date
        ", [
            'indicator_id' => $indicatorId,
            'project_id' => $projectId,
        ]);

        // Compute differences between consecutive rounds
        $comparisons = [];
        for ($i = 1; $i < count($results); $i++) {
            $prev = $results[$i - 1];
            $curr = $results[$i];
            $comparisons[] = [
                'from' => $prev->study_type,
                'to' => $curr->study_type,
                'from_value' => $prev->value,
                'to_value' => $curr->value,
                'absolute_change' => $curr->value - $prev->value,
                'percent_change' => $prev->value > 0
                    ? round(($curr->value - $prev->value) / $prev->value * 100, 1)
                    : null,
                'direction' => $curr->value > $prev->value ? 'increase' : 'decrease',
            ];
        }

        // Difference-in-differences (if comparison group exists)
        $did = $this->differenceInDifferences($indicatorId, $results);

        return [
            'indicator_id' => $indicatorId,
            'rounds' => $results,
            'comparisons' => $comparisons,
            'difference_in_differences' => $did,
        ];
    }

    private function differenceInDifferences(string $indicatorId, array $treatmentRounds): ?array
    {
        // Requires comparison group data in indicator_values (is_comparison flag)
        $comparison = DB::connection('analytics')->select("
            SELECT ... FROM fact_indicator_values
            WHERE dim_indicator_key = :key AND is_comparison = TRUE
            ORDER BY period_end
        ", ['key' => $this->getIndicatorKey($indicatorId)]);

        if (count($treatmentRounds) < 2 || count($comparison) < 2) return null;

        $treatmentChange = end($treatmentRounds)->value - $treatmentRounds[0]->value;
        $comparisonChange = end($comparison)->value - $comparison[0]->value;

        return [
            'treatment_change' => $treatmentChange,
            'comparison_change' => $comparisonChange,
            'did_estimate' => $treatmentChange - $comparisonChange,
        ];
    }
}
```

### 3.2 Difference-in-Differences (R Implementation)

```r
# Difference-in-Differences Analysis
library(dplyr)
library(lmtest)
library(sandwich)

data <- read.csv(data_file)

# DID model: Y = β0 + β1*Treatment + β2*Post + β3*(Treatment×Post) + ε
model <- lm(
    outcome ~ treatment * post + covariates,
    data = data
)

# Robust standard errors
robust_se <- coeftest(model, vcov = vcovHC(model, type = "HC3"))

result <- list(
    did_estimate = coef(model)["treatment:post"],
    se = robust_se["treatment:post", "Std. Error"],
    p_value = robust_se["treatment:post", "Pr(>|t|)"],
    ci_95 = confint(model, "treatment:post", level = 0.95),
    r_squared = summary(model)$r.squared,
    n_observations = nobs(model)
)
```

---

## 4. Sampling Analysis

### 4.1 Sampling Weight Calculation

```php
class SamplingWeightService
{
    public function calculateWeights(string $studyId): array
    {
        // Design weights (inverse of selection probability)
        $weights = DB::connection('analytics')->select("
            SELECT
                su.id AS sampling_unit_id,
                su.strata_code,
                su.cluster_code,
                -- Base weight = 1 / selection_probability
                1.0 / NULLIF(su.selection_probability, 0) AS design_weight,
                -- Non-response adjustment
                strata.n_responded::DECIMAL / NULLIF(strata.n_selected, 0) AS response_rate
            FROM sampling_units su
            JOIN sampling_plans sp ON sp.id = su.sampling_plan_id
            JOIN (
                SELECT strata_code,
                       COUNT(*) AS n_selected,
                       COUNT(*) FILTER (WHERE status = 'participated') AS n_responded
                FROM sampling_units
                WHERE sampling_plan_id = (
                    SELECT id FROM sampling_plans WHERE study_id = :study_id
                )
                GROUP BY strata_code
            ) strata ON strata.strata_code = su.strata_code
            WHERE sp.study_id = :study_id
        ", ['study_id' => $studyId]);

        // Post-stratification weights (raking to known population totals)
        $populationTotals = $this->getPopulationTotals($studyId);
        $raked = $this->rakeWeights($weights, $populationTotals);

        return [
            'design_weights' => $weights,
            'raked_weights' => $raked,
            'weight_summary' => [
                'min' => min(array_column($raked, 'final_weight')),
                'max' => max(array_column($raked, 'final_weight')),
                'mean' => array_sum(array_column($raked, 'final_weight')) / count($raked),
                'total' => array_sum(array_column($raked, 'final_weight')),
            ],
        ];
    }

    private function rakeWeights(array $weights, array $populationTotals): array
    {
        // Iterative proportional fitting (raking)
        $maxIterations = 50;
        $convergenceThreshold = 0.001;

        foreach ($weights as &$w) {
            $w['final_weight'] = $w['design_weight'];
        }

        for ($iter = 0; $iter < $maxIterations; $iter++) {
            $maxDiff = 0;

            // Adjust for each margin
            foreach ($populationTotals as $margin => $targets) {
                foreach ($targets as $category => $targetTotal) {
                    $currentTotal = 0;
                    $indices = [];
                    foreach ($weights as $i => $w) {
                        if (($w[$margin] ?? null) === $category) {
                            $currentTotal += $w['final_weight'];
                            $indices[] = $i;
                        }
                    }

                    if ($currentTotal > 0) {
                        $adjustment = $targetTotal / $currentTotal;
                        foreach ($indices as $i) {
                            $newWeight = $weights[$i]['final_weight'] * $adjustment;
                            $maxDiff = max($maxDiff, abs($newWeight - $weights[$i]['final_weight']));
                            $weights[$i]['final_weight'] = $newWeight;
                        }
                    }
                }
            }

            if ($maxDiff < $convergenceThreshold) break;
        }

        return $weights;
    }
}
```

### 4.2 Confidence Intervals and Design Effects

```php
class SurveyEstimation
{
    public function estimateProportion(array $data, array $weights, ?float $designEffect = null): array
    {
        $totalWeight = array_sum($weights);
        $weightedSum = 0;
        foreach ($data as $i => $value) {
            $weightedSum += $value * $weights[$i];
        }
        $proportion = $weightedSum / $totalWeight;
        $n = count($data);

        // Effective sample size
        $deff = $designEffect ?? $this->calculateDesignEffect($data, $weights);
        $nEff = $n / $deff;

        // Standard error with design effect
        $se = sqrt(($proportion * (1 - $proportion)) / $nEff);

        // Confidence interval (95%)
        $z = 1.96;
        $ciLow = $proportion - $z * $se;
        $ciHigh = $proportion + $z * $se;

        // Margin of error
        $moe = $z * $se * 100;

        return [
            'proportion' => round($proportion, 4),
            'standard_error' => round($se, 4),
            'confidence_interval_95' => [round($ciLow, 4), round($ciHigh, 4)],
            'margin_of_error_pct' => round($moe, 2),
            'n' => $n,
            'effective_n' => round($nEff),
            'design_effect' => round($deff, 3),
        ];
    }

    private function calculateDesignEffect(array $data, array $weights): float
    {
        // Kish's approximate design effect
        $sumW = array_sum($weights);
        $sumWSq = array_sum(array_map(fn($w) => $w * $w, $weights));
        return $sumWSq / ($sumW * $sumW / count($weights));
    }
}
```

---

## 5. Geospatial Analysis

### 5.1 Coverage Analysis

```sql
-- Coverage: % of admin units with minimum data
WITH admin_units AS (
    SELECT admin_level_1, admin_level_2
    FROM analytics.dim_location
    WHERE admin_level_0 = :country
    GROUP BY admin_level_1, admin_level_2
),
covered_units AS (
    SELECT DISTINCT admin_level_1, admin_level_2
    FROM analytics.fact_submissions fs
    JOIN analytics.dim_location dl ON dl.location_key = fs.dim_location_key
    WHERE fs.dim_study_key = :study_key
      AND fs.status = 'approved'
)
SELECT
    au.admin_level_1,
    COUNT(DISTINCT au.admin_level_2) AS total_units,
    COUNT(DISTINCT cu.admin_level_2) AS covered_units,
    ROUND(COUNT(DISTINCT cu.admin_level_2)::DECIMAL / NULLIF(COUNT(DISTINCT au.admin_level_2), 0) * 100, 1) AS coverage_pct
FROM admin_units au
LEFT JOIN covered_units cu ON cu.admin_level_1 = au.admin_level_1 AND cu.admin_level_2 = au.admin_level_2
GROUP BY au.admin_level_1
ORDER BY coverage_pct;
```

### 5.2 Hotspot Detection

```sql
-- Spatial clustering (density-based)
SELECT
    ST_ClusterDBSCAN(location::geometry, eps := 0.01, minpoints := 5) OVER () AS cluster_id,
    COUNT(*) AS point_count,
    ST_Centroid(ST_Collect(location::geometry)) AS cluster_centroid,
    ST_ConvexHull(ST_Collect(location::geometry)) AS cluster_boundary
FROM analytics.fact_submissions fs
JOIN analytics.dim_location dl ON dl.location_key = fs.dim_location_key
WHERE fs.dim_study_key = :study_key
  AND fs.status = 'approved'
GROUP BY cluster_id
HAVING COUNT(*) >= 5;
```

### 5.3 Buffer and Service Area Analysis

```sql
-- Submissions within 5km of a health facility
SELECT COUNT(*)
FROM analytics.fact_submissions fs
JOIN analytics.dim_location dl ON dl.location_key = fs.dim_location_key
WHERE fs.dim_study_key = :study_key
  AND ST_DWithin(
      dl.geometry::geography,
      (SELECT location::geography FROM facilities WHERE id = :facility_id),
      5000  -- 5km buffer
  );
```

---

## 6. Export to Statistical Software

### 6.1 Supported Formats

| Format | Library | Variable Type Mapping | Metadata Support |
|--------|---------|----------------------|------------------|
| CSV | Native PHP | All | Column names only |
| SPSS (.sav) | foreign (R) | numeric, string, factor | Variable labels, value labels, missing values |
| Stata (.dta) | foreign (R) | numeric, string | Variable labels, value labels |
| SAS (.sas7bdat) | haven (R) | numeric, character | Variable labels, formats |
| R (.rds) | base R | Preserves all types | Full metadata |
| JSON | PHP json_encode | String, number, boolean, null | Nested structures |

### 6.2 SPSS Export with Value Labels

```r
# Export to SPSS with full metadata
library(foreign)

data <- read.csv(data_file)
metadata <- jsonlite::fromJSON(metadata_file)

# Apply variable labels
for (var in names(metadata$variable_labels)) {
    attr(data[[var]], "label") <- metadata$variable_labels[[var]]
}

# Apply value labels for categorical variables
for (var in names(metadata$value_labels)) {
    data[[var]] <- factor(data[[var]],
        levels = names(metadata$value_labels[[var]]),
        labels = unlist(metadata$value_labels[[var]])
    )
}

# Apply missing value definitions
for (var in names(metadata$missing_values)) {
    if (var %in% names(data)) {
        attr(data[[var]], "missings") <- metadata$missing_values[[var]]
    }
}

# Write SPSS file
write.spss(data, output_file,
    max.varlabels = 120,
    varlabel.encoding = "UTF-8"
)
```

### 6.3 Variable Mapping Configuration

```yaml
export_config:
  study_id: "STUDY-2026-001"
  format: "spss"
  include_metadata: true
  variable_mappings:
    - question_code: "Q1"
      variable_name: "HH_HEAD_NAME"
      type: "string"
      label: "Name of household head"
      missing_values: ["", "DK", "REF"]
    - question_code: "Q2"
      variable_name: "HH_SIZE"
      type: "numeric"
      label: "Number of household members"
      measurement: "scale"
      min: 1
      max: 50
    - question_code: "Q3"
      variable_name: "WATER_SOURCE"
      type: "factor"
      label: "Main source of drinking water"
      value_labels:
        piped: "Piped into dwelling"
        borehole: "Protected borehole"
        well: "Protected well"
        surface: "Surface water"
        other: "Other"
      missing_values: ["DK", "REF"]
```

---

## 7. Analysis Request Catalogue

| # | Analysis Type | Method | Input | Output | Implementation |
|---|---------------|--------|-------|--------|----------------|
| 1 | Frequency | SQL | Single question | Counts, percentages | Built-in SQL |
| 2 | Cross-tabulation | SQL + PHP | Two questions | Contingency table, chi-square | Built-in |
| 3 | Descriptive stats | SQL | Numeric question | Mean, median, SD, IQR, min, max | Built-in SQL |
| 4 | Independent t-test | R | Numeric DV + binary group | t-statistic, p-value, CI, Cohen's d | R |
| 5 | Paired t-test | R | Pre/post numeric | t-statistic, p-value, CI | R |
| 6 | One-way ANOVA | R | Numeric DV + categorical IV | F-statistic, p-value, post-hoc Tukey | R |
| 7 | Two-way ANOVA | R | Numeric DV + 2 categorical IVs | F-statistics, interaction, post-hoc | R |
| 8 | Chi-square test | R | Two categorical variables | χ², df, p-value, Cramer's V | R |
| 9 | Pearson correlation | R | Two numeric variables | r, p-value, CI | R |
| 10 | Spearman correlation | R | Two ordinal variables | ρ, p-value | R |
| 11 | Linear regression | R | Numeric DV + predictors | β, SE, p-value, R², adj R² | R |
| 12 | Logistic regression | R | Binary DV + predictors | OR, SE, p-value, AIC, pseudo-R² | R |
| 13 | Poisson regression | R | Count DV + predictors | IRR, SE, p-value | R |
| 14 | Multilevel/mixed model | R | Clustered data | Fixed effects, random effects, ICC | R (lme4) |
| 15 | Principal component | R | Multiple numeric variables | Eigenvalues, loadings, variance explained | R |
| 16 | K-means clustering | R | Multiple numeric variables | Cluster assignments, centroids, WSS | R |
| 17 | Difference-in-differences | R | Treatment + comparison + time | DID estimate, SE, p-value | R |
| 18 | Sampling weight calc | PHP | Sampling design | Design weights, raked weights | PHP |
| 19 | Design effect estimation | PHP | Weights + cluster design | DEFF, effective n | PHP |
| 20 | Coverage analysis | SQL + PostGIS | Submissions + admin boundaries | Coverage %, gaps | Built-in SQL |
| 21 | Hotspot detection | PostGIS | GPS points + density params | Clusters, centroids, boundaries | PostGIS DBSCAN |
| 22 | Buffer analysis | PostGIS | Points + radius | Count within buffer | Built-in SQL |

**Total analysis types: 22 (4 built-in SQL, 13 R-based, 3 PostGIS, 2 PHP)**
