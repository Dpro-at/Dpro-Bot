---
name: data-quality
description: Assess and improve dataset fitness for a defined use through grain-aware profiling, source reconciliation, actionable quality checks and verified remediation. Use for quality investigations, data acceptance and reliability controls.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; tools and data access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Data quality

Decide whether the data is fit for the actual decision, transformation or model, and show the evidence behind that judgment. A schema-valid table can be semantically wrong; a high average quality score can conceal a decisive missing field.

Read [Runtime contract](references/runtime-contract.md) in a new host. Use [Check design](references/check-design.md) for profiling and assertions, [Investigation](references/investigation.md) for discrepancies, and [Remediation](references/remediation.md) for proposed or authorized repairs. Use [Quality contract](assets/quality-contract.md), [Finding record](assets/finding-record.md) and [Acceptance](references/acceptance.md) to make substantial results reviewable.

## Define fitness and scope

Identify the intended use, dataset/version, source of record, row grain, business keys, important fields, consumers and relevant time window. Inspect existing contracts, metric definitions and quality incidents before introducing another scorecard. A billing export, aggregate dashboard and predictive training set can require different checks even when sourced from the same tables.

Record actual access and sampling coverage. Prefer bounded metadata and minimized samples; do not copy private rows into a shared report. If only a sample is available, state its selection method and limits. Missing evidence is not a passing check. Distinguish source defects from extraction, mapping, join and presentation defects.

## Profile the correct grain

Check row and key counts, nulls, distinct values, types, ranges, time coverage, duplicate identity and relevant relationships. Preserve units, timezone, null meaning and expected update behavior. A generated identifier can be unique while the business record is duplicated. A repeated customer ID can be correct in a transaction table; grain determines the assertion.

Inspect segments that can hide behind an aggregate: source, time period, release, region or another meaningful partition. Compare rates with denominators and affected scope, not only absolute issue counts. Separate expected late arrivals, partial backfills and optional fields from defects. Do not convert null to zero or deduplicate rows merely to improve a score.

## Select checks that protect the use

Read [Check design](references/check-design.md). Choose assertions that could invalidate the intended result: completeness of required inputs, business-key uniqueness, accepted meanings, referential/temporal integrity, freshness, reconciliation and drift. Document each rule's rationale, population, severity, owner and response.

Distinguish format validity from accuracy. A plausible date, valid email pattern or in-range amount does not prove correctness. Accuracy needs a trustworthy comparison or other appropriate evidence. Do not invent thresholds from a universal checklist. Derive them from the approved contract, decision consequence and observed baseline; label proposed thresholds as proposals.

Where several checks measure the same upstream issue, avoid multiplying alerts without new action. Preserve a critical failure independently of a composite score. A missing decisive key can block one use while leaving another bounded use acceptable; describe that distinction.

## Investigate without erasing evidence

Trace a finding to its earliest supported cause. Compare source and destination by stable identity, compatible time window, units and filters. Correct row counts do not guarantee correct keys or values. Check join fanout, cursor gaps, field conversions, timezone boundaries and changed definitions before blaming the source.

Use [Investigation](references/investigation.md) for conflicting counts or metrics. Record what supports the suspected cause, what could overturn it and the next discriminating check. Preserve uncertainty where the available history cannot establish a root cause. Do not present correlation with a release as proof that the release caused the issue.

## Repair only the authorized scope

Use [Remediation](references/remediation.md) before changing data or acceptance rules. Separate proposal, containment, source fix, backfill and downstream repair. A quality assessment does not authorize deleting invalid rows, rewriting production data or suppressing a failing check.

For an authorized correction, identify the affected records/version, recoverability, concurrent writers and expected effect. Rehearse a bounded fixture or isolated copy where appropriate. Validate both the intended repaired state and preservation of unrelated valid records. Reconcile downstream consumers that already received the bad result; fixing the current table may leave exported reports wrong.

## Deliver an actionable judgment

Deliver supported findings, scope, affected uses, confidence, owner, next action and checks actually executed. Distinguish passed, failed, blocked and not run. Include a qualified fitness decision instead of an unexplained health percentage. Keep evidence references near the finding and avoid exposing sensitive values.

For ongoing checks, specify the actual monitor, cadence, meaningful threshold, remediation owner and runbook when implementation is in scope. A written check is not an active monitor. Record baseline and review trigger so valid business changes do not become permanent false alarms.

[Design notes](references/design-notes.md) identify reviewed material and comparison limits.
