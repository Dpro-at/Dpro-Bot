# Connectivity and data

Define the offline promise per action. A read-only catalog may use a bounded stale cache. A private record can require access revalidation or expiry. A purchase, permission grant or destructive action may require an online authority decision. Offline-first is a design choice, not a rule that every operation must appear successful immediately.

## Authority and local state

Name which side owns each fact and how the screen communicates freshness. Keep owner/tenant, object ID, schema/version, update provenance and relevant expiry alongside cached data. Scope caches and pending commands to the correct account. On logout or access change, follow the product's retention policy and prevent stale privileged display or dispatch.

Distinguish local draft, pending command, server-confirmed record and conflict. Optimistic state can improve interaction when replay and reconciliation are defined; it must not be presented as a completed remote effect. If offline dispatch is unsupported, retain the draft and explain the exact prerequisite without fabricating confirmation.

## Pending writes

For supported deferred commands, persist a bounded queue with stable operation identity, principal/object binding, meaningful request equivalence and terminal/error status. Preserve ordering only where the domain requires it. Define retry budget and permanent rejection behavior. A network reconnect signal is a hint to attempt work, not proof that the intended API is reachable or the user still has permission.

Use the service's current idempotency and revision protocol. A timeout after dispatch can be unknown. Reconcile with an operation/status lookup before repeating a consequential command. Conflict resolution follows domain meaning; last-writer-wins can lose edits or violate an invariant and is not a universal default.

## Reads and storage

Choose cache freshness, maximum size, eviction and refresh rules appropriate to the data. Display stale/partial status where it changes a decision. A cached price or permission value may be unsafe after an expiry even when ordinary reference content remains useful. Avoid caching secrets in general-purpose blob stores or exported settings.

Handle response validation and schema evolution. Preserve a recovery route for an incompatible local database or pending queue; do not silently delete user drafts to resolve a migration failure. Use backups in the authorized disposable environment before migration trials.

## Tests

Exercise available, delayed, rejected and unavailable remote responses; queued replay; duplicate delivery; stale revision; and account switch as relevant. Inspect final local and remote-fixture state. Then separately validate actual device connectivity loss/recovery and the live/sandbox API when authorized. Fixture coverage cannot verify radio state, captive portals, real provider quotas or background scheduling.
