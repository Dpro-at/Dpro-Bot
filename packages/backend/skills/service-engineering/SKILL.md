---
name: service-engineering
description: Implement backend services, API integrations and complete application slices with explicit contracts, authorization, durable effects and consumer recovery. Use for service endpoints, external clients and connected frontend/backend features.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; uses installed project runtimes and available tools without mandatory vendor services.
metadata:
  agent-player:
    version: 1.0.0
---

# Service engineering

Deliver a named application outcome through the existing service boundary. Begin with the repository's working architecture, contract and ownership; a route that returns a success code is only one part of a usable feature. Use this workflow for backend implementation, external API integration or a complete application slice. Do not replace the stack or provision infrastructure merely to follow an example.

Read [Runtime contract](references/runtime-contract.md) when changing hosts. Keep maintained code and records in English. Inspect the current implementation, caller, persistence schema and focused tests before deciding what to add. Search for an existing connector, endpoint, mutation controller and authorization check. Extend the right path rather than creating a competing writer.

## Establish the behavior

Describe the actor, object, intended state transition and visible result. Name the authoritative data owner and where the permission decision occurs. Identify request limits, compatibility constraints and whether the operation has an external effect. Use [Feature contract](assets/feature-contract.md) for a cross-layer task or [Integration map](assets/integration-map.md) for a remote boundary.

Read [API agreements](references/api-agreements.md) for representations, concurrency and compatibility. Separate client validation from the service's authoritative checks. Reject or normalize malformed inputs before domain work; field presence, null, zero and an empty string must retain their contract meaning. Do not pass caller-supplied owner IDs through as proof of ownership.

## Implement the smallest complete path

For backend work, read [Durable service behavior](references/durable-behavior.md). Keep business invariants and transaction scope visible. Use the existing framework's parameter binding, cancellation and resource cleanup. Choose abstractions that isolate actual change or test boundaries; a small endpoint does not require a new service framework.

For external APIs or webhooks, read [External integration](references/external-integration.md). Confirm exact API/version and credential scope without exposing secrets. Fixtures support local progress when the external capability is unavailable; label them as fixtures and preserve the live acceptance gap. Integrating a client does not authorize enabling a schedule, sending a message or spending money.

For full-stack work, read [Application slice](references/application-slice.md). Implement the backend contract and visible loading, empty, ready, editing, pending, error and stale-session behavior that matter to the user's task. Reuse the current frontend state owner and design primitives. Validate a connected flow rather than delivering unrelated endpoints and decorative components.

## Verify failure and recovery

Select tests from the actual failure boundary. A pure calculation needs a domain test; a transaction invariant needs the actual local database engine; a response contract needs a handler/client test; a cross-layer flow needs observed interaction in the authorized environment. Use [Verification](references/verification.md), then record [Delivery receipt](assets/delivery-receipt.md).

Exercise relevant wrong-object/wrong-owner denial, stale revision, duplicate submission, dependency rejection and uncertain timeout. Check persisted effects, not just status codes. Treat a deadline after dispatch as potentially unknown; do not repeat a consequential effect until the contract makes replay safe or reconciliation resolves it.

## Deliver

Report the changed behavior, exact checks and remaining external/environment acceptance. Preserve existing IDs and user data. Database migration, activation, deployment and publication retain their own authorization requirements. Distinguish code present, local fixture passed, connected development run and deployed acceptance.

[Acceptance briefs](references/acceptance.md) cover the three supported modes. [Design notes](references/design-notes.md) identify upstream comparison boundaries. The package is self-contained; installed frontend/data skills can deepen a task but are not mandatory dependencies.
