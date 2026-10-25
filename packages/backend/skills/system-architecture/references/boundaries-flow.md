# Boundaries and flow

Map one critical flow end to end: actor, entrypoint, permission decision, application operation, durable state, external dependency and user-visible completion. Add asynchronous paths where they actually exist. A component diagram without data and authority direction can conceal the main risk.

## Responsibility

Assign one authoritative owner to each important fact or state transition. A cache, index, replica and materialized view are copies with freshness/consistency contracts, not additional authorities by accident. Identify which component validates identity, object permission, revision and domain invariant.

Choose boundaries from change/ownership/deployment needs. A modular monolith can preserve strong local transactions with lower operating cost. Independent services may improve isolation or team delivery but add network failures, compatibility and coordination. Neither is universally superior. Record the reason a new boundary is necessary.

## Contracts and effects

Define synchronous request/result and asynchronous accepted/completed meaning. Name identifiers, schema owners, maximum sizes, ordering, duplicate policy and version expectations. Treat timeout after dispatch as potentially unknown where the protocol permits an effect to continue. A local database transaction cannot atomically include an arbitrary remote action.

For state-plus-message designs, identify the actual durable intent boundary and dispatch/reconciliation owner. For multi-writer or eventual-consistency designs, describe conflict resolution and what users observe during convergence. Do not promise exactly-once delivery or zero data loss without the actual protocol/failure evidence.

## Failure containment

Identify dependencies, timeouts, retry ownership, resource pools and bounded queues. A downstream slowdown can exhaust threads/connections even when components remain healthy. Avoid retry amplification across layers. Define overload rejection or degradation that preserves essential invariants, and distinguish process liveness from meaningful readiness.

Specify recovery objectives and which data/history is needed to meet them. Backups are only part of recovery; restore procedure, credentials, compatible software and observed restoration matter. A replicated corrupt write is not a backup strategy. Keep security and privacy boundaries explicit without claiming a full assessment from a diagram.

## Views

A small system may need one component/flow diagram and a decision record. A complex migration may need current, coexistence and target views. Keep notation understandable, name external systems and label trust/durability boundaries. Do not generate multiple diagrams that repeat the same boxes without helping a decision.
