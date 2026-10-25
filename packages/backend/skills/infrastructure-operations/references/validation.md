# Validation and diagnosis

Use the smallest meaningful check that can resolve the current uncertainty. State its environment, inputs and exact scope. Static parsing detects malformed source; schema validation checks known structure; a provider plan evaluates selected resource differences; a remote API accepting a request and an application serving users are later, distinct observations.

## Bounded evidence

Before a check identify whether it reads local files, downloads tools, contacts a cloud API, invokes admission/webhooks or mutates a target. Honor host authority for each kind. Keep logs bounded and sanitized, preserve exit status and artifact identifiers, and avoid broad account scans when one resource is sufficient.

Test the plausible failure branch: a wrong namespace, stale state/plan, missing secret reference, incompatible image, unrelated DNS view or untrusted pipeline trigger may explain the problem more directly than changing resource sizing. Do not manufacture a successful output when the required CLI, target or credentials are unavailable. Provide the precise future command/check and missing prerequisite without installing or activating it implicitly.

## Diagnose before repair

Write the observed symptom and time window, competing hypotheses, evidence that would distinguish them and the next low-impact check. Follow the actual dependency path from client to DNS/routing/service/workload/data when relevant. Avoid attributing all failures to caching, network or permissions without evidence. Preserve the original error and source revision while making a targeted change.

## Completion receipt

Include intended behavior, concrete source/resource diff, tool and target identity, executed checks with outputs/evidence references, status and open assumptions. If a plan was not applied, say so. If deployment was accepted but not observed healthy, classify it as pending or uncertain rather than complete. Record remaining load, production, provider or live-user acceptance separately from this package's parser/discovery validation.
