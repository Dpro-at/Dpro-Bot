# Publishing, uncertain results and learning

## Before an external action

Confirm the authorized channel/account, exact content revision, media, target time and timezone. Use the service's supported capabilities and current official contract. A drafted plan or granted read access does not grant publish permission. A user who explicitly authorized a specific publish action need not approve it again unless the reviewed content or target materially changes.

Prefer the provider's supported idempotency key when available. Store the local item ID, attempt ID and provider receipt. Distinguish saving a draft, scheduling and immediate publication. Check the result the service returns rather than assigning a success status because the request did not throw.

## Uncertain outcomes

If a response is lost after submission, inspect provider status using the receipt or a narrow account/time/content query. Do not submit again until duplicate risk is resolved. If readback is unavailable, mark uncertain, preserve the attempt details and ask the authorized operator to reconcile. Keep retries bounded by the task and provider guidance. Authentication/permission failures require fixing the actual access problem, not repeatedly resending content.

Cancelling or editing an external schedule is another mutation; apply the existing authorization scope. A local row deletion does not cancel a platform job. Reconcile both records and retain the cancellation result. Do not remove history needed to explain a previously published item.

## Measurement

Define the numerator, denominator, attribution window, timezone and source for each metric. An engagement rate based on reach cannot be directly compared with one based on impressions. Keep organic and paid results separate unless the analysis explicitly combines them. Record delayed conversions and missing channel data rather than treating a partial report as final.

Avoid a universal “best posting time.” Use account-specific evidence where available and label uncertain recommendations as experiments. For a test, state the hypothesis, comparison, intended metric, observation window and relevant confounders. Do not claim causal lift from two different posts shown to different audiences without qualification.

## Handoff

Report what was produced, reviewed, scheduled, verified published, failed or left uncertain. Link the updated calendar and relevant receipts. State the next action and who can take it. Keep private analytics exports and account identifiers out of public packages.
