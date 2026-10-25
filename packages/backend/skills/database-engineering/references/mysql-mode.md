# MySQL specialist mode

## Identify the actual engine

Record MySQL version, storage engine, topology, SQL mode, character set/collation, timezone and application driver. MariaDB or another protocol-compatible service can differ in syntax and behavior; inspect its own supported contract. Reuse the shared schema, concurrency, recovery and workload guidance with this environment's semantics.

Inspect existing migrations, table definitions, indexes and representative queries. Record keys, null rules, units and consumer expectations. Do not translate PostgreSQL syntax, row-security assumptions or extension behavior blindly. A migration that works in SQLite does not verify the MySQL target.

## DDL and operation boundaries

For MySQL 8.4, many schema statements end the active transaction implicitly, so wrapping arbitrary DDL in BEGIN/ROLLBACK is not a general recovery strategy. Check the exact statement and engine against the [official implicit-commit contract](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html). Separate code rollback from recovery of data already changed.

Online DDL can still wait for metadata locks. Algorithm and locking support depends on the operation; see [online DDL limitations](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-limitations.html). Inspect workload, long transactions, data size, available space and stop/recovery conditions before an authorized change. Do not label an operation zero-downtime merely because its syntax requests online behavior.

## Correctness and workload

Verify actual transaction isolation, locking/access paths and affected-row behavior for the intended operation. Define retry and uncertain-commit reconciliation using the real driver/engine contract. Test representative conflicting operations in an appropriate environment rather than inferring concurrency from one sequential success.

Use the actual optimizer/diagnostic tooling and inspect whether a command executes the statement. Compare query results and workload evidence under compatible conditions. Consider write/storage cost before adding indexes and avoid universal memory/connection settings.

## Recovery and handoff

Use the supported backup method for this engine/topology and verify an isolated restore before claiming recovery tested. Replication state is not independent backup evidence. Deliver environment/ref, actual migration/query/restore checks, data preservation, deployment state and remaining gaps. No live MySQL execution is implied by this reference.

Acceptance: identify an unsupported cross-engine statement before running it; distinguish implicit commit from rollback safety; expose metadata-lock risk; compare representative workload without changing semantics; verify restore in an isolated target or leave it unverified. Record actual engine outputs when exercising these tasks.
