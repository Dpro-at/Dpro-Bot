# Evaluation and operations

Define success in task terms: a supported answer with usable citations, an accurately saved setting, or a correct refusal to act without authority. Avoid scoring only fluent style or exact wording when multiple valid answers exist. Compare candidates under the same relevant data/tool/budget conditions.

## Test layers

1. Deterministic application tests: parsing, schema bounds, owner filters, conversation identity, cancellation, idempotency and tool dispatch. Use fixtures to isolate failures.
2. Retrieval evaluation: source availability, authorized candidate selection, relevance and evidence coverage on labeled questions. This can run without model generation where the existing retrieval system supports it.
3. Actual model-task trials: realistic requests through the intended adapter and tools, measuring task outcome, grounding, authority compliance, latency, spend and failures. Run only with authorized inference and record configuration.
4. Connected acceptance: real user entrypoint, streaming behavior, persistence and operational recovery in the target environment. A command-line demo is not installed-app acceptance.

## Cases and scoring

Include a straightforward task, ambiguous input requiring a narrow clarification, an unsupported request, missing evidence, a malicious source instruction, revoked access and an uncertain tool effect. Set critical failure conditions before running: private-data exposure or unauthorized effect cannot be averaged away by several good answers. Record disagreements and uncertainty in human scoring.

Use repeated trials where variation matters and budgets permit; report trial count and distribution rather than one cherry-picked response. A schema-conforming answer may still be wrong. A fixture refusal may reflect deterministic application rejection rather than model judgment. Attribute evidence to the layer that produced it.

## Operating behavior

Instrument request IDs, model/configuration identifiers, durations, usage and outcome categories while minimizing sensitive content. Set bounded context/output and tool budgets. Define fallback behavior explicitly: a cheaper or alternate provider can change data exposure, capability and cost, so it must follow the intended configuration rather than silently activate.

Version prompts, tool schemas and evaluation cases alongside implementation when the repository supports it. Preserve old conversation compatibility or a clear migration boundary. Deployment, background activation and newly paid services remain separately authorized. Deliver unresolved cases with a next diagnostic step; do not claim production reliability from discovery or a local parse test.
