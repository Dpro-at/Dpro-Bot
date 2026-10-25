# Complete application slice

Trace one user outcome from visible control through client state, network contract, service authority and persistence, then back to confirmed UI. Name the source of truth at each stage. Inspect the existing navigation and screen first; avoid adding a second route or parallel settings model for the same object.

## Contract to screen

Agree request/response/error shapes before connecting the view. Use shared schemas or generated types when the project already does so, but retain runtime validation at trust boundaries. Avoid fabricating defaults that make a missing field look saved. Keep credentials on the authorized server or approved user credential boundary rather than in rendered HTML or a public bundle.

Define the meaningful states: loading versus empty, filtered-out versus denied, selected object, recoverable draft, pending submission, confirmed save, conflict and dependency failure. A spinner cannot be the terminal state for an unsupported capability. Preserve the list context when editing one item and expose the real specialty/personality/configuration rather than generic decorative labels.

## Asynchronous identity

Tie requests and mutations to the active object/session. If the user switches accounts or selection while a response is pending, prevent the stale response from replacing the current object's data. Clean up only owned subscriptions. Server authority remains necessary even when the client invalidates old responses correctly.

Choose an explicit or automatic save model consistent with the product. Disable duplicate submission only while appropriate, retain failed drafts and show saved status from confirmed data. For uncertain mutation outcome, reconcile with the operation contract before offering an unsafe retry. Optimistic rendering needs rollback/reconciliation and must not represent a denied operation as complete.

## Interaction

Use semantic controls, accessible names, focus order and visible errors tied to fields. Check supported narrow/wide layouts, long values and translated/mixed-direction content when relevant. Reuse tokens and components; a connected feature request does not authorize a redesign. Do not hide the only object identifier in a truncation with no recovery.

## Proof of completion

A representative connected path includes opening the real entrypoint, reading current state, changing a value, receiving authoritative confirmation and reopening to observe persistence. Test the most important rejection or stale-state case. Use disposable fixtures where possible and preserve user data. Record actual browser/runtime and data source. A component render plus an endpoint unit test does not prove the flow is connected.
