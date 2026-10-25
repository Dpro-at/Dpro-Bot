# API agreements

Start with examples of the consumer's intended task and current callers. Document the endpoint or message name, version, actor, object ID namespace, request schema, success representation and action-relevant failures. Choose the transport already appropriate to the project; switching REST to GraphQL is not a requirement for a better contract.

## Data meaning and collection behavior

Name the owner of each field. Specify immutable versus mutable values, required versus optional fields, absent versus null, units, currency and time conventions. An opaque resource identifier is distinct from a display label. Validate nested objects and arrays with explicit bounds rather than trusting generated static types. Where precision matters, use the project's established representation rather than silently converting to floating-point.

Collections need a maximum size, supported filters and stable ordering. For cursor pagination, define the tie-breaker and whether the cursor describes a snapshot or moving collection. A continuation token is opaque and scoped to the authorized query. Returning one page without saying it is incomplete can mislead both human and automated consumers. Avoid returning sensitive internal fields merely because the ORM row contains them.

## Mutations

Identify the business precondition and concurrency token. Carry the expected revision from the edited object through to the authoritative write. A read-then-unconditional-write does not protect a stale update. Test two writers against the supported isolation/constraint behavior. Return a recoverable conflict without silently discarding the user's draft.

For retried commands, define the key namespace, authenticated principal/object binding, request equivalence and retention period. Reusing a key with different meaningful input must not return unrelated success. Store the receipt with the durable effect when the system supports that boundary. Scope the guarantee honestly when another service participates.

Distinguish accepted work from completed work. A queued operation needs a durable operation ID, permitted status lookup, terminal outcome and cancellation semantics when cancellation exists. Lost client connectivity does not imply rollback. Return only a safe error category and correlation handle; keep stack traces and secrets out of public responses.

## Evolution

Inspect real consumers, generated clients and validators before changing schemas. New enum values, nullability, ordering and defaults can change behavior even when fields are only added. Stage compatibility where required: readers that tolerate the new form, then writers, then obsolete-path removal after evidence. Record rollback compatibility for both old and new data.

For HTTP details, check the current applicable standard and framework before implementing method/status/cache behavior. Do not infer business replay safety solely from a status code or verb. Test the operation's actual application semantics. A contract review describes required enforcement; it does not prove the enforcement exists.
