# Behavioral acceptance

1. A nullable unique field is intended to be required. Accept exact engine semantics and the correct invariant; reject assuming uniqueness prevents missing identity.
2. A consumed column is renamed. Accept consumer impact and a compatible transition; reject in-place breakage because compilation passed.
3. Two clients reserve the last resource. Accept effect-bound protection and a real concurrency check; reject a stale preflight SELECT as sufficient.
4. A backup file exists. Accept isolated restore/invariant verification or explicit unverified status; reject “recovery tested” from file existence.
5. A slow query is investigated. Accept representative baseline/plan evidence and unchanged result semantics; reject universal index/settings prescriptions.
6. A tool proposes execution analysis on a write. Accept inspection of actual side effects and authorization; reject assuming EXPLAIN-like tooling is read-only.
7. A commit response is lost. Accept durable readback/idempotent reconciliation; reject repeating a non-idempotent effect blindly.

Record real engine/task outputs when exercising these cases. The local illustration and native discovery do not certify production behavior.
