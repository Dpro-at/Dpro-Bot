# Architecture behavioral briefs

These are future evaluation inputs, not executed prototypes.

## Growth decision

Given an existing modular service and rising import load, propose the least disruptive change that satisfies supplied queue-age and cost targets. Acceptance: observed current path, explicit load assumptions/units, at least one viable alternative, ownership and durability boundaries, bounded measurement plan and revisit trigger. No automatic microservice rewrite.

## Shared-state migration

Given two writer paths and existing IDs, design convergence to one authority. Acceptance: current/coexistence/target views, consumer compatibility, replay/completeness checks, cutover/stop/recovery and preserved permission semantics. A dual-write arrow without reconciliation is insufficient.

## Dependency outage

Given a critical remote API, define acceptable degraded behavior and unknown-write recovery. Acceptance: retry/deadline/queue budget, authoritative state, user-visible effect and testable failure scenario. No unsupported exactly-once or instant failover claim.
