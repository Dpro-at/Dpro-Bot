# Persistence and networking

Load this reference only when the feature stores progress or coordinates clients. Do not add online services to a local prototype without need.

## Save contract

Define persistent identity, schema version and the minimum durable state. Save meaningful domain values rather than arbitrary live object pointers. Distinguish preferences, local progress and server-authoritative inventory. Keep file/account scope explicit and avoid overwriting another profile because a display name matches.

Use the engine/platform's supported atomic or transactional storage mechanism where available. Plan for partial writes, interrupted saves, unavailable storage and corrupted content. A temp-file rename may provide useful local behavior but does not by itself prove durability across every filesystem, platform or cloud-sync conflict. Retain a recovery path appropriate to the product.

Validate schema, sizes, numeric bounds and supported version before loading. Do not execute arbitrary serialized code or instantiate unrestricted types from untrusted saves. For migration, preserve the source save and test old-to-new transformation on fixtures. A checksum detects some corruption; it is not protection against intentional editing unless the platform's security model provides that authority.

Define checkpoint frequency and the player-visible saved state. If a save fails, communicate the failure without pretending progress is durable. Test multiple slots, reload, invalid/version-unsupported files and interrupted writes in an authorized disposable environment. Never destroy real player progress to obtain a test result.

## Network authority

Name the authoritative owner for movement, score, inventory and match state. A client request is intent, not proof of a valid state transition. Validate ownership, current state, rate and bounds on the server/service where that design requires it. Do not accept a client-supplied final score as authoritative simply because it arrived on an authenticated connection.

Document message identity, ordering, duplicate policy and session generation. Late packets from a previous match must not mutate the new match. Separate client prediction and interpolation from authoritative effects and reconciliation. Test latency, loss, duplication, reconnect and host/session termination under realistic bounds; a same-process two-player test is preliminary evidence.

## Scope

Matchmaking, anti-cheat, economy policy, platform authentication and managed hosting require their own task and operating decisions. Implement the requested seam in the existing architecture and record unresolved service requirements. Do not activate servers or purchase hosting to make the package appear complete.
