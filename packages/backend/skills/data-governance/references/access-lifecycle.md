# Access and lifecycle controls

## Evidence of access

Map users/service identities to effective roles, inherited permissions and data surfaces within the review's scope. Check whether exports, derived tables and caches follow the same restrictions. A form requesting approval is not evidence that enforcement blocks unauthorized reads. Masking a UI does not necessarily restrict the underlying query path.

For a review, identify the access purpose, scope, owner, last relevant evidence and proposed action. Do not revoke or expand grants without the applicable authorization. Avoid broad collection of employee or customer details when metadata is sufficient.

## Lifecycle

Tie retention to approved purpose, applicable requirements and exceptions. The skill does not supply universal legal advice or a fixed retention period. Mark a proposed period as proposed and identify who can approve it. Legal holds or deletion exceptions must be grounded in the organization's authorized process.

Map copies and derived outputs as far as evidence permits: primary store, replicas, backups, exports, caches and downstream products. Deletion has different semantics and delays across these surfaces. A source-row deletion does not prove removal from every copy; a backup lifecycle may require a distinct policy. Do not promise immediate irreversible erasure without evidence.

## Control design and operating evidence

Separate policy, implementation and operating result. A scheduler configuration can show intent; a retained run receipt can show a particular execution; a sampled readback can show the affected state. None alone proves all historical periods or every dataset complied. Specify scope and observation dates.

For a lifecycle gap, document affected data, risk/use consequence, required policy decision, implementation owner, proposed control, validation and recovery limits. Keep destructive changes out of a documentation-only task. When approved implementation is requested, follow the existing operational process and verify the actual effect.

## Exceptions

An exception needs a verified owner, rationale, affected scope, compensating controls where applicable and an expiry or meaningful review trigger. Record actual approval separately from a request. Do not silently treat expired evidence as current approval. Preserve enough history to explain why data was retained or access continued.
