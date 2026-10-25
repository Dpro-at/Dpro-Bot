# Durable service behavior

Identify the invariant before choosing a layer diagram. Examples include preventing negative inventory, preserving one active membership or ensuring a completed command has one matching receipt. Keep framework parsing outside the business rule where useful, but do not introduce indirection that hides the write boundary.

## Local effects

Use the installed database's transactions, uniqueness constraints and supported conditional writes. Bind query parameters. Validate the relevant authority and state as close as possible to the write, including a final guard where revocation or concurrent state change matters. An earlier UI check or cached policy snapshot is insufficient for a consequential mutation.

Keep transactions short. Holding a database lock while waiting for a remote API can exhaust the pool and still cannot make a remote effect atomic. If state and an outgoing event must agree, record the intent durably with the local state, then dispatch through an owned worker and reconcile. This is an implementation option, not a mandate to add a broker to every application.

For a received message, define identity, allowed ordering, duplicate policy and acknowledgment point. Persist the deduplication decision and business effect together when they share a store. Acknowledging before durability risks lost work; acknowledging later may cause replay. Handle poison input explicitly with bounded retry and an observable terminal or quarantine route.

## Lifecycle

Name who owns connections, subscriptions, background work and cancellation. Shut down only owned resources and drain or interrupt according to the existing lifecycle. A request timeout can stop local waiting while an external service continues. Distinguish cancellation requested from effect canceled.

Use dependency deadlines and bounded concurrency. Avoid layering independent retries at the proxy, HTTP client and job worker without a shared budget. A circuit breaker changes availability behavior; add it only when the dependency and operating model justify the complexity.

## Migrations and coexistence

Inspect existing schema migration conventions and compatibility windows. Make a backup/recovery plan appropriate to the authorized environment before a data-changing migration. A down migration cannot necessarily reconstruct lost meaning. Prefer additive transitions when old/new code must coexist, with explicit authoritative writer and removal criteria.

If comparing an old and new path, shadow only operations that cannot create duplicate business effects. Comparing read outputs is different from sending two writes. Test partial failure and rollback in an isolated environment; do not perform a live cutover to demonstrate code completeness.

## Evidence

Record the actual engine, schema revision and failure point exercised. Verify final rows, effect receipts and relevant absence of extra changes. An in-memory repository proves a business branch, not transactional durability, locking, process-crash recovery or engine-specific behavior.
