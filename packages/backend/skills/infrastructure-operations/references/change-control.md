# Identity, scope and controlled change

## Resolve the intended environment

Record repository/revision, owning team, environment, cloud account/project/subscription, region, cluster/context/namespace or DNS zone as applicable. Use immutable identifiers alongside friendly names where possible. Check current authenticated identity through authorized read-only means; shell prompt labels and saved CLI defaults are insufficient evidence. Explicitly scope commands to the verified target rather than relying on ambient context.

Define desired behavior, blast radius, dependencies, permitted action and owner. Separate editing source, validating locally, querying remote metadata and applying a change. If a required target or action authority is missing, complete independent source/planning work and state the exact remaining prerequisite. Do not repeatedly ask for authority already granted in the session, and do not manufacture a mandatory approval ceremony for a reversible local edit.

## Reviewable change

Inspect existing conventions, versions and ownership before choosing a new abstraction. Name the actual resources affected and any deletion, replacement, public exposure, permission, recurring cost or data migration. Include preconditions, rollback limitations, stop conditions and success observations. Preserve unrelated changes; do not rewrite a whole configuration to solve one setting.

Bind the reviewed plan to the relevant source, variables, provider/module versions, state/workspace, account identity and expiry assumptions. Changes to those inputs can invalidate a previous review. A plan that shows no action is scoped evidence about the evaluated resources, not a proof of the entire system's security or absence of drift.

## Concurrent and uncertain actions

Use the existing state lock, deployment concurrency control or DNS edit/version mechanism. Do not override a lock merely because it delays the task. A timeout can mean an accepted operation with an unknown final state. Read operation/resource status and reconcile before retrying; avoid duplicate provisioning, migration or publication.

If a permitted emergency manual repair is necessary, record actual commands, targets and observations, then reconcile the intended configuration and state under the normal process. Do not hide manual divergence or insist that an abstract all-code rule overrides incident authority. Never hand-edit live state or broaden roles as a convenience.

## Completion

Report artifact change, executed verification, remote effects and unresolved operational acceptance. Keep rollback resources until the authorized owner and retention policy permit cleanup. A local successful test, provider acceptance and end-user availability are distinct states.
