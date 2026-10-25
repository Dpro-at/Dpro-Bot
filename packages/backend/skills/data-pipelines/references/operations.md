# Operations and handoff

## Observable runs

Record pipeline/version, run ID, source range, start/end, target/environment, checkpoint before/after, input/output/reject counts and actual result. Define the counting categories. Include freshness and lag where meaningful; a green job with an empty extraction may conceal a broken source. Log stable identifiers or aggregate diagnostics instead of sensitive raw records.

Choose alerts that lead to a useful action: sustained freshness breach, rejected-record growth, stalled cursor, repeated uncertainty or reconciliation failure. A threshold should follow the actual service objective and baseline, not a copied universal number. Identify the operator and safe first diagnostic.

## Deployment and schedules

Use the existing deployment and orchestration system. Review environment targeting, credentials, permissions, concurrent-writer behavior and rollback limits. A code task does not automatically authorize deployment, starting a service or enabling a recurring schedule. Keep configured-disabled distinct from running. Capture actual activation and run receipts when authorized.

A rollback of transformation code may not reverse already written records or external effects. Plan data repair separately and preserve version provenance. Do not rely on killing a process to undo a completed destination transaction.

## Runbook

Include normal verification, stop conditions, source-gap diagnosis, checkpoint readback, quarantine ownership and replay/backfill instructions. Recovery starts by establishing durable state, not deleting checkpoints to force a restart. If retained source history cannot cover the gap, report the need for a new snapshot or another authorized repair.

## Handoff

Deliver the contract, source changes, actual tests, deploy/run state, known limitations and next action. Distinguish a designed route from a connected route and a passing local fixture from a verified production pipeline. Do not claim cross-platform or distributed guarantees from one local engine.
