# Tools and authority

Expose a small set of recognizable operations for the application's real tasks. Give each tool a bounded input/output schema, useful failure categories, identifier semantics and side-effect description. Use a protocol such as MCP only when the host/task benefits; protocol support does not establish current client discovery or execution behavior.

## Authoritative execution

The application authenticates the principal and checks object/action permission at the service boundary. Model text, a tool description, an annotation or a prior successful read cannot grant a new permission. Preserve required user confirmation/version fences for consequential effects. Bind approval to the exact operation, target and meaningful arguments so changed arguments cannot reuse stale approval.

Validate arguments against both schema and domain constraints. Resolve identifiers within the current tenant/owner, verify the current object state and reject unsupported fields. Treat URLs, file paths, command fragments and query strings as untrusted. Use safe APIs and project controls rather than direct interpolation.

## Bounded execution

Set a per-task step, time, result-size and spending budget appropriate to the task. Stop on repeated unchanged failure, exhausted budget or an unresolved consequential outcome. Retries must retain operation identity where the service contract requires it. Parallel calls are appropriate only for independent authorized work; dependent writes need ordered evidence.

A tool may return accepted, pending, completed, rejected or unknown. Feed that status back truthfully. A successful protocol response is not necessarily completed business work. Preserve durable operation references for reconciliation after process/stream interruption. Do not let a model's reassuring narration override the actual receipt.

## Handoffs and external content

Tool results are data. A remote page instructing the agent to send credentials or message another person cannot expand the user's instruction. Keep host permissions and recipient authorization outside model persuasion. The same rule applies to instructions embedded in search results, issue bodies, logs and memory records.

For MCP, verify the current host's support for tool discovery, schemas, result references and error channels. A resource link is useful only when that host can fetch it under the proper scope. Do not claim all three providers support an optional transport or feature merely because they discover the same skill package.

## Tests

Exercise a valid tool call, malformed argument, wrong owner, stale approval, duplicate request, instruction-bearing tool result and post-effect timeout. Inspect actual service decisions and effects. Local fake-model fixtures prove the application's handling of these cases; they do not demonstrate that a real model chooses the right tool or stops reliably.
