# Model and conversation boundary

Inspect the active adapter and request lifecycle. Record provider/model identifier, installed SDK or protocol version, supported input modalities, streaming, tool-call and structured-output features actually used. Provider-neutral application logic still needs an accurate adapter for each capability; claiming interchangeability from a common string parameter is misleading.

## Credentials and configuration

Resolve credentials by authenticated owner and approved configuration scope. Keep secret values in the established secret store. Exports, browser state, telemetry and error messages must omit them. A failed user credential should produce an actionable configuration error; fallback to another account or paid provider requires the intended policy and authorization.

Validate model selection against the adapter's actual supported configuration. Do not invent a model name or copy a tutorial's latest name into a stable contract. Preserve versioned settings and clear precedence among project, agent and request overrides. Report effective non-secret configuration so the user can understand which model handled a task.

## Context and streaming

Associate each generation with conversation, owner, request and cancellation identity. Build context from authorized history under the current identity, not a global last conversation. Bound context by the model's verified limits with a documented truncation/summarization policy. Preserve current instructions and relevant source provenance; do not silently drop the user's active constraint while keeping stale trivia.

For streaming, distinguish provisional text, tool-call fragments and terminal completion. Buffer partial structured arguments until valid; do not execute a fragment that merely looks like JSON. A disconnected stream can leave the generation outcome unknown. Keep client cancellation, provider cancellation and any already-committed tool effects distinct. Do not retry the whole tool-using turn without reconciliation.

## Output handling

Treat model output as untrusted application input. Validate expected schemas, sizes, enums and references before writing settings or calling services. Render text safely under the product's markup policy. If required fields are missing, surface a bounded validation failure or make an explicitly budgeted repair request when authorized; do not fill consequential fields with guessed defaults.

Keep protocol errors, provider refusal, tool rejection, unsupported feature and application failure distinguishable. Log correlation and aggregate usage without secret prompts by default. Do not report a full answer when only a truncated generation arrived. Synthetic adapter fixtures exercise parsing/state handling, not provider compatibility or model quality.
