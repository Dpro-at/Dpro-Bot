# Replay, checkpoints and uncertainty

## Define the effect boundary

Write down source progress, destination effect and the acknowledgement operation. Determine which can commit atomically in the actual technology. In a local transactional store, one transaction may bind effect and checkpoint. Across systems, use the supported idempotent write, transactional messaging, outbox/inbox or reconciliation pattern appropriate to the existing architecture. Do not claim a stronger guarantee than the weakest relevant boundary.

Use a stable idempotency key scoped to the operation and destination. Retain enough history to detect replays for the period the source can deliver them. If deduplication history expires sooner than replay history, document the gap. A random key per retry defeats idempotency.

## Crash cases

Test before the effect, after the effect but before checkpoint, after checkpoint and after response loss. For each case, identify what is durable and how the next run discovers it. A retry after uncertain submission should first inspect the target by stable identity or receipt when possible. If the effect cannot be read back and is not idempotent, retain uncertain state for operator reconciliation instead of blindly repeating it.

## Late and reordered records

A cursor should reflect the actual source contract. Composite ordering can resolve tied timestamps when a stable secondary key exists. A lookback can accommodate a bounded delay but requires deterministic merge behavior. An unbounded late-arrival claim cannot be solved by a small arbitrary lookback window. Corrections and tombstones must participate in conflict resolution consistently.

## Partial batches and rejected records

Record rejected identities and reasons without exposing private payloads in ordinary logs. Decide whether the batch can commit accepted records independently. If it does, checkpointing must still preserve a path to recover rejected records; a global checkpoint must not erase them from the retrievable source window. Quarantine requires an owner, retention and replay route, not only a folder.

## Backfill

Specify source range, mapping version, target scope, rate/cost limits, concurrency with current ingestion and reconciliation criteria. Prevent old backfill values from overwriting newer valid updates. Validate a bounded segment before a broad authorized run. Record progress and stop safely on evidence of a contract mismatch or irreconcilable source gap.
