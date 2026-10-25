# Source and destination contracts

## Source boundary

Identify the source of record, endpoint/topic/table, access scope, schema version, key and extraction mode. Separate logical record identity from delivery identity. Determine whether an update changes the same entity, emits a new immutable event or creates a new historical version. Retain enough provenance to explain a destination row without unnecessarily duplicating sensitive payloads.

For a snapshot, define the point-in-time consistency available. Pagination over a changing table can miss or repeat records unless the API or extraction protocol supplies a stable snapshot or ordering. For a change stream, inspect retention and replay availability. A cursor that expires before recovery can leave an unrecoverable gap without a new snapshot.

## Mapping

Document source field, destination field, meaning, type, units, timezone, required/null behavior and transform. Distinguish empty string, null, absent and zero. Use exact decimal handling for quantities where binary floating-point error is unacceptable. State truncation and rounding policy. A successful cast is not proof that a string identifier should be treated numerically.

Classify incompatibilities: unknown optional field, new enum value, missing required field, narrowing numeric range, unexpected nested shape or changed business meaning. Choose tolerate, map, quarantine or stop according to consequence. Do not let an automatically inferred schema erase leading zeros or merge distinct identifiers.

## Destination behavior

State target grain, key, merge/update rules, deletion policy and transaction boundary. If multiple sources can write the same entity, define ownership and conflict resolution rather than relying on arrival order accidentally. A last-write-wins rule requires a trustworthy ordering field and an explicit policy for ties.

A full replacement requires complete extraction evidence and authorization for the replacement. Partial reads should not delete unseen destination rows. For destructive cleanup, specify the affected scope and recoverability; do not imply a backup can restore effects in every external system.

## Contract changes

Version meaningful breaking changes, identify consumers and plan compatibility. Preserve the source version used for a run so replay can use the correct mapping or an explicit migration. Do not silently replay old raw records through new semantics if that changes historical meaning.
