# Service acceptance briefs

These are future behavioral exercises, not executed tests.

## Backend: competing inventory reservation

Input: an existing service, two authorized buyers, one remaining item and a versioned reservation endpoint. Deliver a bounded implementation in the installed stack. Acceptance: at most one reservation commits; denial/conflict is intelligible; the item cannot go negative; stale state cannot bypass authority; focused tests inspect durable rows. Include a failure during the transaction and verify rollback. A mutex in a single mock process does not demonstrate multi-process correctness.

## Integration: uncertain order request

Input: a fixture-backed remote order API with idempotency keys, a timeout after remote acceptance, quota rejection and a status endpoint. Acceptance: stable scoped request identity, no new order from the timeout retry, bounded attempts, truthful unknown state when readback is unavailable and no shared-credential fallback. Sandbox acceptance remains separate.

## Full-stack: editable workspace setting

Input: a current screen and revisioned endpoint. Acceptance: reuse the existing entrypoint, actual current values, recoverable draft, save/reopen persistence, stale revision conflict and object/session switch protection. Verify keyboard operation and the supported narrow layout. No new application page for a setting that already has one.

Review both the outcome and trace. Record which scenarios were actually run, fixture/environment limits and open cases. Do not claim these briefs were completed just because they are bundled.
