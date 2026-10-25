# External integration

Build a narrow adapter for a named consumer task. Inspect the current official API specification, version, rate/size limits, authentication model and test environment. Identify the account and credential owner without printing credential values. A user's own key remains scoped to that user's configuration; do not silently fall back to a shared owner credential after denial.

## Boundary map

Use the integration map to connect source IDs to local IDs and define which side owns each fact. Do not assume that email, title or a human-readable label is a stable key. For OAuth-like flows, retain existing state/redirect validation and token storage conventions. Token refresh must not widen scope or cross a tenant boundary.

Set request deadlines, response-size bounds and safe serialization. Validate responses as untrusted data, including error bodies. An HTTP success with invalid or partial business content must not become a valid local record. Handle pagination through its documented continuation model and stop on the agreed bound; report incomplete results truthfully.

## Failure policy

Classify failures by what the caller can do: fix input, obtain permission, wait for quota reset, retry safely, reconcile unknown outcome or escalate a permanent incompatibility. Respect documented retry guidance within an overall attempt/time budget. Avoid retrying a non-idempotent action simply because the connection closed or a server returned an error.

If the API supports an idempotency contract, bind the key to the intended actor and business request. Keep it stable through an uncertain retry; generating a new key for every attempt defeats deduplication. If no mechanism exists, use a status/readback operation when reliable or expose uncertainty. Never claim exactly-once remote behavior from a local cache.

## Webhooks and inbound events

Follow the provider's exact signature construction, including raw-body requirements and supported clock/replay policy. Signature validity authenticates the sender under that key; still check event type, target account/object, payload bounds and allowed state transition. Reject a forged event before making a business write. Deduplicate valid repeat delivery using the provider's scoped event identity.

Respond only when the documented durable intake boundary is met. Long work may require an existing asynchronous mechanism; starting one is a separate operating decision. Test signature rejection, duplicates, out-of-order delivery and a crash around durable intake in the permitted environment.

## Privacy and testing

Keep sensitive payloads out of logs and fixtures. Use synthetic identifiers and minimal recorded responses. Test local adapters against explicit fixtures, then separately test authorized sandbox connectivity and actual account scope. Mock success does not verify credentials, quotas, provider ordering or production compatibility. Preserve those gaps in the receipt.
