# Isolation and execution

Identify the test environment and its owners before mutation. Prefer a disposable data copy or fixture with complete required objects when a store references immutable files. Copying only a database can produce false failures if the content store is absent. Never use the owner's live database as a convenient resettable fixture.

## Resources

Give each test/run a unique namespace for files, database records, ports, processes and external fixture IDs where needed. Record the initial state and clean up only resources owned by that test. Do not kill all processes on a shared port, clear global caches used by another task or remove arbitrary temp directories.

Await asynchronous setup/teardown and the actual relevant completion. Use condition-based waits with bounded deadlines; a permanent socket can make network-idle inappropriate. Avoid sleeps that merely happen to fit the current laptop's speed. Fake clocks are appropriate for timeout policy tests, while real timer/event-loop tests may be necessary to verify scheduling integration.

## Real versus fake

A fake service can expose controlled success, rejection, malformed response and uncertain outcome. Keep fixtures aligned to the real contract and mark them synthetic. It cannot prove live credentials, quotas or provider availability. An in-memory store can isolate a rule but cannot prove the production engine's locking or crash behavior.

For concurrency, name the ordering/race being exercised and the invariant observed. Use synchronization points or actual competing connections as appropriate. A single-threaded fake that serializes every call by construction may hide the bug. Keep stress and fault trials bounded and record nondeterministic outcomes honestly.

## Parallel execution

Parallelize tests only when mutable resources are independent or isolation is enforced. Shard by stable ownership and use deterministic fixture setup. Resource pressure can change latency and expose races; do not solve it by multiplying timeouts blindly. A sequential rerun may diagnose interference, but it does not prove the parallel configuration is fixed.

## Privacy and effects

Use synthetic users, text and identifiers in logs. Redact credentials and minimize captured payloads. Disable external write paths through the intended fixture mechanism, not by bypassing service permission logic. If a meaningful test requires a real external action, record that prerequisite and complete independent local checks first.
