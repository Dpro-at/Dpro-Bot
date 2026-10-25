---
name: data-analysis
description: Answer data questions with defined metrics, reproducible transformations, checked aggregations and bounded conclusions. Use for CSV/table profiling, trend and segment analysis, metric investigation and analytical reports; not for automatically changing source data or training a model without a relevant request.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; optional Python3.10+ standard-library CSV profiler; database, spreadsheet and plotting capabilities depend on the host.
metadata:
  agent-player:
    version: 1.2.0
---

# Data analysis

Produce a result that answers the business or research question and can be reproduced from the stated data and method. A table of statistics is not automatically an explanation, and an attractive chart does not validate a metric.

Read [Runtime contract](references/runtime-contract.md) in a new host. Keep package files, analysis code and maintained deliverables in English. Use the available data capabilities without assuming a vendor-specific warehouse connector or plotting library.

## 1. Define the question and the metric

Identify the decision, population, observation grain, time window and desired output. Distinguish a factual lookup, exploratory investigation, comparison and formal report. Match effort to the task rather than making every question a dashboard project.

Define important terms before computing. Specify the numerator and denominator of a rate, currency and units of an amount, event/date field used for a period, and whether records represent users, events, subscriptions or line items. Clarify whether a metric is a snapshot, flow, cumulative count or cohort outcome.

Use [Analysis contract](assets/analysis-contract.md) for substantial work. State reasonable assumptions and ask only about a missing choice that could materially change the answer. Do not use an easy-to-query proxy as if it were the requested metric.

## 2. Inspect the actual data source

For a connected database, read schema and relevant definitions before writing queries. Identify table keys, relationships and the query dialect. Use authorized query tools and preserve read-only behavior unless the task explicitly includes a mutation.

For a file, identify format, encoding, delimiter, headers and approximate size. Preserve the original. Work on a reproducible view or copy when transformations are needed. If access is unavailable, provide a bounded query or method for review; do not invent rows or report calculations as executed.

Record the source location or snapshot identity, extraction time when relevant and transformation steps. Avoid including unnecessary personal data in reports, logs or exported samples.

## 3. Profile before interpreting

Establish row count, columns, observation grain, key uniqueness and relevant date coverage. Inspect nulls, malformed values, suspicious duplicates, numeric ranges and category consistency. Distinguish a genuinely missing observation from zero and from an explicitly meaningful string.

The optional `scripts/profile_csv.py` performs bounded mechanical profiling of a CSV file without uploading it or modifying it. Read [CSV profiler](references/csv-profiler.md) and run `--help` before use. It reports completeness, exact duplicate rows, optional key issues and conservative numeric summaries; it cannot infer business semantics or prove that values are correct.

If the helper is absent in a Markdown-only environment, carry out equivalent checks using assigned SQL, spreadsheet or local tools. State the method and any sampling/truncation limit. Never describe a sample profile as a full-dataset audit.

## 4. Resolve quality issues transparently

Use [Data and metric checks](references/data-and-metrics.md). Inspect a problematic value's meaning before cleaning it. Case normalization, timezone conversion, duplicate removal and missing-value treatment can change the result; record the rule and show relevant before/after counts.

Do not impute missing values automatically. A missing sale is not necessarily a zero sale, and a missing survey response is not an average response. If an analysis requires imputation, justify the method, preserve its assumptions and check how conclusions change without it.

When the available data cannot support the requested precision, narrow the conclusion. Report the consequential gap and the next data needed rather than hiding the issue behind a chart.

## 5. Compute reproducibly

Write the query or transformation so another person can recover the result. Filter the intended population and period explicitly. Count observations at the correct grain before and after joins; many-to-many joins can multiply rows and inflate sums.

Check aggregation logic: subgroup totals should reconcile when categories are exhaustive and mutually exclusive. Rates should use appropriate denominators, not an unweighted average of subgroup percentages. For period comparisons, align length, completeness, timezone and eligibility.

Retain sufficient precision during calculations and round for presentation at the end. Distinguish percentage change from percentage-point change. Explain undefined ratios when the baseline is zero rather than presenting infinity or an arbitrary number.

For statistics, distinguish observed association from causal explanation. Account for changing composition, seasonality, outliers and missing observations where they can affect the conclusion. Use statistical methods appropriate to the sample and question; do not add significance labels merely to make a report look scientific.

## 6. Investigate the most useful comparisons

Explore dimensions that can answer the actual question. For a trend change, inspect absolute counts and denominators, then relevant cohorts or segments. A segment's rate can improve while the overall rate worsens because its share changed; check composition before claiming a contradiction.

Treat exploration as hypothesis generation. If several relationships were inspected, do not present the most striking one as a preplanned result. Explain limits of small or selected samples. Do not generalize beyond the population observed without justification.

When an investigation needs information the data does not contain, separate what the dataset shows from possible explanations. Suggest the targeted next check that could distinguish those explanations.

## 7. Present the result accurately

Lead with the answer and its scope. Support it with the minimum useful table, figure or calculation. Use [Analysis report](assets/analysis-report.md) for a substantial deliverable. Include definitions, source/snapshot, transformation logic and material quality limitations.

Read [Presentation review](references/presentation-review.md) before choosing or interpreting a chart. Label units, dates, populations and missing/truncated data. Distinguish a measured result from a forecast or scenario. A recommendation should make clear which evidence and user objective it relies on.

Do not report an interactive dashboard, exported figure or workbook as created unless the artifact exists and was inspected. If plotting tools are unavailable, provide a usable table and explain the limit.

## 8. Reconcile before delivery

Recompute decisive figures independently where practical, using a small manual calculation or a different aggregation. Check row counts, null handling, join multiplicity and whether the conclusion still matches the original question.

Keep an analysis receipt: data identity, method/query, checks performed, outputs and unresolved questions. Protect source data from accidental overwrite. Use the project's established handoff location for unfinished work, not a new undocumented memory store.

## Acceptance

Use [Data acceptance](references/acceptance.md) with realistic data. A passing profile or syntactically valid query is evidence for a mechanical step; full analysis acceptance requires correct definitions, calculations and interpretation.

## Design reference

[Design notes](references/design-notes.md) identify the reviewed upstream reference and the scope of the comparison.

## Business intelligence mode

For KPI dashboards, recurring reports and shareable analytical views, read [Business intelligence delivery](references/business-intelligence.md). Reuse the metric, data-quality and runtime boundaries above; a dashboard does not make an unverified metric authoritative.

## Campaign analysis mode

For campaign/channel results and optimization decisions,read [campaign analysis](references/campaign-analysis.md) and use the [campaign measurement record](assets/campaign-measurement.md). Reuse metric/data-quality/reconciliation rules;platform attribution is not causal lift and a report does not authorize spending or campaign changes.
