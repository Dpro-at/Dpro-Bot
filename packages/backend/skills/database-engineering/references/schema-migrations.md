# Schema design and migrations

## Invariants first

Define the entity/event grain and its stable key. A surrogate key can simplify relationships while a separate unique business key enforces the intended identity. Distinguish absent, unknown, empty and zero values. Choose numeric precision and units deliberately; a string identifier with leading zeros is not automatically numeric.

Check engine semantics for nullable unique columns, collations, generated values, foreign keys and deferred validation. A UNIQUE column may still permit nulls; use the actual combination of constraints required by the invariant. Application validation is useful but cannot protect a concurrent writer that bypasses it.

## Compatible evolution

Inventory internal and known external consumers. Expanding a schema can permit old and new clients to coexist; backfills and write-path transitions must then maintain consistency. Define when the old field can be removed and how completion is verified. A code search can miss external reports or jobs, so label consumer coverage.

For a required field on existing data, determine the source of valid values and how concurrent inserts/updates behave during backfill. Do not fill unknown business facts with plausible defaults to satisfy a constraint. Split incompatible steps when the platform and release process require it.

## Operational semantics

Inspect lock acquisition, transaction support, table rewrite/index build behavior and cancellation semantics for the exact engine/version. Online or concurrent operations can still consume resources and leave intermediate state. Naming an operation online does not prove it is safe under the current workload.

A migration receipt should contain source/target schema ref, affected tables, preconditions, actual commands, data checks and deployment state. Rehearse interruption/retry behavior where consequential. Do not delete the old schema until the authorized migration and recovery expectations are met.

## Recovery limits

A rollback of code is distinct from a data reversal. Dropped values may be unrecoverable without a compatible backup/log history. Document the real recovery route and the point of irreversibility. An unexecuted rollback script is not evidence of successful recovery.

The [constraint fixture](../assets/constraint-fixture.md) illustrates a local nullable-uniqueness pitfall using fictional data. It does not establish another engine's full semantics or a production migration result.
