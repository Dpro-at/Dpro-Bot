---
name: technical-documentation
description: Create and maintain task-oriented technical documentation grounded in source, observed behavior and a named product version. Use for API guides, quickstarts, runbooks, architecture records and documentation migrations.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; tools and access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Technical documentation

Produce documentation that lets its intended reader complete the task and recover from predictable failures. Establish which product version and environment it describes. Source code establishes an implementation detail; a successful reproduction establishes the behavior of the tested build. Neither establishes every supported deployment.

Read [Runtime contract](references/runtime-contract.md) in a new host. Read [Documentation modes](references/documentation-modes.md) for the selected document type, [Verification](references/verification.md) before claiming executable examples work, and [Acceptance](references/acceptance.md) when reviewing a completed result. Use [Document brief](assets/document-brief.md) to track a substantial change without adding process to a small edit.

## Define the reader and outcome

Identify whether the reader is an end user, integrator, operator or maintainer; their starting knowledge; and the action they need to finish. Record the product/ref, operating system, authentication context and required privileges. A quickstart needs a visible first success; a reference needs stable lookup; an explanation needs the reasons behind a design. Do not blend all three into a sprawling introduction.

Inspect the existing documentation, style, navigation and source of truth before creating another page. Keep a working route available during a migration. Preserve existing inbound links or provide an explicit redirect plan. Do not relocate or delete material merely because a new arrangement looks cleaner.

Treat existing documents as claims to verify. Match examples to the actual checked-out version, API schema, CLI help or observed interface. Where implementation and published contract disagree, record the disagreement and its user impact. Do not silently choose the more convenient behavior. Ask only for missing information that changes the audience, supported version or authority to execute a consequential step.

## Build a usable path

Start with the task outcome, prerequisites and the shortest complete sequence that achieves it. Place explanations at the point where they affect a decision. State where a command runs, what inputs it expects, what files it changes, and the recognizable success result. Use clear placeholders that cannot be mistaken for real credentials. Avoid copying a developer's personal paths, tokens, user IDs or internal hostnames into examples.

Show complete requests when integration is the task: method, path, headers, body and the relevant response. Distinguish required, optional, nullable and omitted fields. Use schema-backed examples; a valid JSON sample alone does not prove the endpoint accepts it. Explain pagination, retries, idempotency and failure handling when they alter correct client behavior.

For procedures, separate observation from mutation. A read-only status command can precede a restart instruction, but the document must not imply authorization to restart a live service. State a reversal or recovery route for destructive operations and a stopping condition when the result becomes uncertain. Prefer a supported safe sandbox for example execution. Do not use production or live accounts as convenient test fixtures.

## Make exceptions actionable

For each likely failure, supply a symptom, a discriminating check and the next action. Distinguish invalid input, missing permissions, unavailable dependency, unsupported version and transient service failure. A troubleshooting table should help the reader choose a branch; repeating “try again” for every symptom is inadequate.

Label assumptions and unknowns near the affected step. If the task requests a draft from incomplete input, write the supported sections and expose the missing contract without inventing endpoints, flags, defaults, limits or service guarantees. An unverified example can still be useful when clearly marked and separated from observed behavior.

Use accessible structure: meaningful headings, descriptive link text, text alternatives that convey an image's purpose, language-tagged code blocks, and tables only when the relationship benefits from comparison. Keep code samples copyable. Explain platform-specific shell syntax and do not present a Unix command as universally portable. When separate Windows and Unix variants are needed, verify them separately or mark the unavailable platform as untested.

## Verify the published path

Create a check receipt for meaningful executable instructions using [Verification receipt](assets/verification-receipt.md). Bind it to the source ref, command or request, environment and actual result. Run only authorized commands in the intended sandbox. Capture useful evidence without private values. A build, link check or syntax check proves only its particular property.

Inspect relative links against the page's eventual rendered location. Confirm navigation reaches the new page. Check code fences, duplicate headings and generated anchors using the documentation toolchain already present. Do not install a linter solely to claim validation. If the site cannot build, report whether a pre-existing failure or this change blocks it, supported by a bounded check.

For examples, verify the success path and the failure behavior most likely to strand a new reader. Where a step has side effects, include cleanup or explain the retained state. Re-run affected examples after changing flags, field names or prerequisites. A screenshot of the final page cannot substitute for following the instructions.

## Maintain and deliver

Keep related contracts synchronized: renamed configuration keys, API fields, navigation labels and migration steps should not disagree across pages. Update a generated file through its generator when the project requires it; do not patch a generated artifact while leaving its source stale.

Deliver the actual pages and a short account of what changed, what was executed, what remains unverified and which version the result covers. Assign ownership and a review trigger when the document describes a changing operational dependency. Triggers such as a schema revision or release are usually more useful than an arbitrary freshness badge.

Do not claim the documentation is complete because it is lengthy. The acceptance question is whether the intended reader can perform the named task and recognize both success and the important failure cases.

[Design notes](references/design-notes.md) record the independently reviewed source and limits of the comparison.
