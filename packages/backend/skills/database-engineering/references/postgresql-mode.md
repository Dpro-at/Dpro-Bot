# PostgreSQL specialist mode

## Establish context

Record PostgreSQL version, topology, extensions, schema/search path, roles, connection/pool mode and actual environment. Inspect the project's migration/query tooling and known consumers. A hosted provider's administrative API and helper functions are not available on every PostgreSQL installation.

Use shared schema/concurrency/recovery/performance references with the actual engine's semantics. Verify null/constraint behavior, identity keys, timezone/collation and relevant access roles. Do not treat a test as an administrator as proof of an ordinary user's data boundary.

## Changes and locks

Inspect lock, transaction and resource behavior before an authorized schema/index change. PostgreSQL concurrent index creation cannot run inside a transaction block and can leave an invalid index after failure. Verify completion/catalogue state instead of treating a returned name as a valid index; see the [official CREATE INDEX contract](https://www.postgresql.org/docs/current/sql-createindex.html). Concurrent does not mean no operational impact.

A same-name object need not have the intended definition. Inspect target schema, table and actual object properties before deciding a migration is already applied. A preflight check can race with another writer; use the actual migration/locking process rather than claiming check-then-DDL is universally idempotent.

## Data and access correctness

Investigate MVCC visibility, long-running transactions and lock/wait evidence as relevant to the observed problem. Do not change isolation or maintenance settings without a supported reason. For row-level policies or privileged functions, verify effective caller, ownership/bypass behavior, execution grants and the intended tenant/row boundary in the actual environment. Optimizing a policy must not weaken access semantics.

## Performance and recovery

Use representative plans/workload evidence and distinguish estimated plan from execution analysis. Inspect cardinality, predicates, indexes, waits and resource observations without declaring every sequential scan defective. Compare read/write tradeoffs and preserve result meaning.

A PostgreSQL backup/log range needs a compatible isolated restore and relevant application/invariant checks before recovery is called tested. A replica or existing dump filename alone does not establish that result. Deliver actual environment/version, migration/query/access/recovery observations and unverified boundaries. This reference supplies no live access, deployment authority or extension installation.

Acceptance: identify a concurrent-index transaction conflict before execution; inspect failed-build state; verify object definition instead of name only; test the ordinary access role; keep performance improvements separate from security correctness and production acceptance.
