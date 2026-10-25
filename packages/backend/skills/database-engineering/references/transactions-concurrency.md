# Transactions, concurrent decisions and uncertain commits

## Protect the invariant at the effect

List concurrent actors and the relevant state. A check followed later by an update can race. Use a database constraint, conditional update, appropriate lock/isolation or another supported mechanism so the decisive condition holds when the effect occurs. Check affected-row counts and handle conflicts as real outcomes, not successful writes.

A transaction groups supported operations according to the engine's isolation rules; it does not automatically serialize every business decision. Write skew, lost updates and phantom effects depend on actual access patterns and isolation. Test the relevant competing transactions on the intended engine rather than assuming a local single-threaded fixture covers them.

## Identity and retries

Use a stable operation identity when the business operation should have one effect across retries. A new random identity per retry can duplicate a transfer or reservation. If a response is lost after commit, inspect durable state or the operation receipt before repeating the effect. Distinguish failed, committed and uncertain states.

Bound retries and handle deadlock/serialization conflicts according to the engine's current contract. A retry should repeat the appropriate transaction from a valid starting state, not only the final statement with stale values. Keep external effects out of a casually retried block unless their own protocol supports the intended idempotency/recovery.

## External boundaries

A database transaction may not atomically include an email, webhook, another database or object storage. Use the existing outbox/inbox or reconciliation route where appropriate and state remaining uncertainty. Rollback is not a promise to undo every external action or engine-specific nontransactional effect.

## Authorization

Check grants, effective identity and row boundaries at the relevant execution path when in scope. A test performed as an administrator does not prove the ordinary role is restricted. Keep elevated diagnostics separate from representative permission checks and avoid changing grants simply to bypass an observed failure.

## Local illustration

The [concurrent reservation fixture](../assets/reservation-fixture.md) demonstrates a conditional update across two SQLite connections. Run it only as a bounded local example; verify the intended engine and operation separately.
