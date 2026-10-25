---
name: data-pipelines
description: Design, implement and verify bounded ingestion and integration workflows with explicit source contracts, replay semantics, checkpoints and reconciliation. Use for batch or streaming ETL/ELT, API synchronization and data integration.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; database, orchestration and catalogue access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Data pipelines

Deliver a reproducible path from a named source contract to an intended destination state. Explain what can be replayed, how completeness is known and what recovery means after an uncertain failure. A running scheduler or a successful request does not prove complete, correct ingestion.

Read [Runtime contract](references/runtime-contract.md) in a new host. Use [Source and destination contracts](references/contracts.md) for extraction/mapping, [Replay and recovery](references/replay-recovery.md) for stateful work, [Integration behavior](references/integration-behavior.md) for external services, and [Operations](references/operations.md) for deployment and handoff. Use [Pipeline contract](assets/pipeline-contract.md), [Run receipt](assets/run-receipt.md) and [Acceptance](references/acceptance.md).

## Define the bounded job

Identify the business purpose, authorized source and target, environment, data classes, source key, ordering guarantees, target grain, volume, freshness and operational owner. Inspect existing connectors, transformations, schedules and checkpoints before adding another pipeline. Reuse the correct path when it can satisfy the task; avoid overlapping writers that compete over the same target.

Read source schemas and the relevant current official API/engine documentation. Keep observed behavior separate from assumptions. A field named updated_at does not establish stable ordering or change completeness. Establish snapshot versus change-stream semantics, deletion signals and whether the source can replay older records.

Record actual credentials/tool access without printing secrets. A connector definition does not prove the account has read permission; a design task does not authorize writing records or starting a schedule. Complete the independent design and local fixture work while identifying the exact remaining external capability.

## Choose extraction and mapping deliberately

For batch snapshots, define the extraction boundary and a completeness signal before replacing a target snapshot. For incremental extraction, define a stable cursor or watermark with tie handling, late-arrival policy and a recovery route. For streams, state delivery guarantees, partition/offset meaning, ordering scope and the boundary where acknowledgements occur.

Map each field to a destination meaning, type, null rule, unit, timezone and sensitivity. Identify incompatible or lossy conversions explicitly. Preserve a source identifier and relevant provenance where the contract permits it. Unknown enum values or an additive field can often be quarantined or tolerated; a breaking type or required-field change needs a deliberate policy rather than silent corruption.

Choose transformations and storage based on the actual engine and existing project conventions. Do not prescribe a message broker, warehouse or orchestration platform solely to make a simple job look complete. Use bounded samples and explain when an unavailable capability prevents production claims.

## Design replay before execution

Choose stable business/event keys and deterministic conflict resolution. Define whether a repeat is ignored, merged, versioned or creates a new event. Keep [Replay and recovery](references/replay-recovery.md) close when the job checkpoints progress or writes to more than one system. A claim of exactly-once processing requires evidence across the actual effect/checkpoint boundary, not a marketing label.

Advance source progress only when the corresponding destination effect is durable according to the real protocol. If those operations are not atomic, use a supported reconciliation or idempotency mechanism and expose the residual uncertainty. A crash after a write but before a checkpoint can produce a replay; a checkpoint before a write can lose data.

Handle partial batches, rejected rows, out-of-order records, late corrections and tombstones. Specify whether a poison record blocks progress, enters quarantine or follows another approved route. Do not skip a record silently to make a job green. A rejected-record count without identity and recovery context may be insufficient for later correction.

## Verify with adversarial fixtures

Create a small fixture that includes the normal path, duplicate delivery, tied cursor values, late updates, malformed records, schema drift and supported deletions. Re-run the same batch and compare final target state. Simulate interruption around the effect/checkpoint boundary using an appropriate local test harness. Confirm that recovery does not silently lose or multiply business effects.

Reconcile at the intended grain. Track extracted, accepted, rejected, duplicate and applied outcomes with clear definitions; these categories are not automatically mutually exclusive. Compare expected destination keys and selected measures, not just row counts. A batch can have the correct count while containing the wrong records.

Record the actual engine/runtime and commands used. A local fixture demonstrates the tested algorithm under that fixture; it does not verify the live API, deployment credentials, source retention, distributed ordering or scheduler recovery. Leave those checks explicit.

## Operate and deliver

Use [Operations](references/operations.md) for observability, bounded retries, backfills and deployment. Separate implementation, configured-but-disabled schedule, successful manual run and active recurring operation. Do not turn on a schedule because code exists.

Deliver the contract, implementation or complete design requested, meaningful test receipts, current checkpoint/run state and the owner-facing next action. If a write outcome is uncertain, reconcile before replaying. If a source gap cannot be repaired with its retained history, state the recovery limitation rather than declaring a complete backfill.

[Design notes](references/design-notes.md) record independently reviewed sources and comparison limits.
