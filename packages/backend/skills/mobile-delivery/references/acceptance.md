# Mobile behavioral acceptance briefs

These are unexecuted exercises for future target validation.

## Draft restoration

Given an existing mobile form and permitted test account, add a recoverable draft without creating another state store. Acceptance: required fields survive the specified background/process-death path, account switch does not expose prior data, and stale network completion cannot overwrite the active draft. Distinguish configuration recreation from process termination.

## Deferred update

Given a fixture service with versioned writes and idempotency, implement the agreed offline update behavior. Acceptance: truthful pending state, stable operation identity, duplicate replay protection, conflict recovery and explicit permanent denial. Actual device outage and real provider acceptance remain separate from fixtures.

## Protected deep link

Given a current route and authentication flow, open a named object from a supported link. Acceptance: correct cold/warm navigation, validated inputs, access recheck, missing-target recovery and no accidental duplicate mutation. Test keyboard/text scaling and relevant device layout. Record actual environment rather than claiming every platform.
