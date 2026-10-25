---
name: analytics-modeling
description: Design and change tested analytical models, dimensional structures and reusable metric definitions with explicit grain and downstream compatibility. Use for warehouse transformations, dbt models, semantic layers and analytics engineering.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; database, orchestration and catalogue access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Analytics modeling

Deliver a model whose rows and measures mean what downstream consumers expect. Establish the business question, intended grain, source meaning and compatibility requirements before writing a transformation. A successful SQL query does not establish that the resulting metric is correct.

Read [Runtime contract](references/runtime-contract.md) in a new host. Read [Grain and joins](references/grain-and-joins.md) when designing a model, [Incremental and history](references/incremental-history.md) when state changes over time, and [Metrics and consumers](references/metrics-consumers.md) for semantic definitions and releases. Use [Model contract](assets/model-contract.md), [Change receipt](assets/change-receipt.md) and [Acceptance](references/acceptance.md) to make substantial changes reviewable.

## Establish the model contract

Identify the consuming decision or interface, row identity, temporal meaning, dimensions, measures and freshness needs. Read existing source definitions, model documentation, business rules and consumer queries. Inspect the project conventions and actual tool versions. Prefer reusing a valid definition over adding a second model with the same meaning; a distinct grain, access boundary or computational need can justify a new model.

Record authoritative inputs, source keys, null rules, units, timezone and the meaning of deleted or corrected records. A column named revenue is not enough to decide whether it is gross, net, recognized, booked or collected. Missing business semantics should remain explicit rather than becoming a guessed formula.

Determine what can be inspected or executed with assigned capabilities. Use authorized bounded read access to inspect schemas and representative values when needed; limit rows and sensitive fields. Where live data is unavailable, work from supplied contracts and clearly labeled fixtures. Do not claim warehouse validation from a local substitute.

## Design grain before joins

State one output row in plain language and identify a key that actually represents it. Select the dimensional structure that fits the questions and update behavior. Avoid applying a preferred architecture to every dataset. Distinguish a transaction fact, periodic snapshot, accumulating lifecycle record and entity dimension.

For every join, state expected cardinality and temporal matching rule. Check source uniqueness and null behavior before relying on keys. One order with several line items and several payments can produce a fanout when both detail sets join directly. Aggregate to a compatible grain, constrain the relationship or model the distinct facts separately. DISTINCT is not an adequate general repair for an incorrect join.

Make null and unknown categories deliberate. An unmatched dimension can represent a late arrival, missing key or a genuine optional relationship; choose the appropriate treatment and retain enough evidence to detect quality regressions. Do not silently drop valid facts through an inner join because unmatched rows complicate the output.

## Implement within the actual project

Use the existing transformation framework and reference mechanism. In a dbt project, inspect the installed version and relevant official contract; use project model/source references rather than inventing physical schemas. In a SQL-only project, follow its dependency and deployment system. Do not require a framework or install an adapter merely because this package mentions it.

Keep transformations understandable and aligned with project style. Separate source normalization, reusable business rules and final presentation when that makes dependencies clearer. Select materialization and partitioning from freshness, cost and workload evidence. A row limit on final output may still scan a large source; check the engine's relevant query plan or cost controls before exploratory work.

Use [Incremental and history](references/incremental-history.md) before adopting a watermark, merge key or slowly changing dimension. Handle duplicates, late records, corrections, deletions and repeat execution explicitly. A compile-only check does not demonstrate incremental correctness.

## Test meaning and compatibility

Test properties that can invalidate the consumer: key uniqueness, required fields, relationships, accepted states, bounds, reconciliation and temporal coverage as relevant. Use a small adversarial fixture for fanout, duplicate source records, null keys and late updates. Where possible, compare the incremental result with a full recomputation on the same bounded input. A helper's passing status is not a substitute for checking the intended business meaning.

Inspect model output, not only test configuration. Reconcile record counts and selected measures against the proper source grain. Rates require separate numerator and denominator checks; averages cannot usually be summed across groups. Record exclusions and rounding rules so a difference can be explained rather than hidden behind a tolerance.

Before renaming, removing or retyping a consumed field, inspect downstream dependencies and external consumers where available. Propose a compatible transition, versioned model or migration window appropriate to the existing platform. Do not change a contract in place merely because all local tests pass. Preserve the current route until the authorized migration is verified.

## Release and hand off

Describe the final model, its grain, metric definitions, dependencies, tests actually executed, affected consumers and deployment status. Keep local verification, warehouse build, deployment and downstream adoption separate. A source edit is not a live deployment; a deployed model is not proof that every dashboard migrated.

If required evidence is unavailable, state which assertion remains unverified and the next useful check. Preserve a reproducible receipt without copying sensitive rows into a public artifact. Maintain owner and change triggers for business rules whose meaning can evolve.

[Design notes](references/design-notes.md) identify reviewed upstream material and comparison boundaries.
