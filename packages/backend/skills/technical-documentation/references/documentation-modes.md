# Documentation modes

## Quickstart and onboarding

Begin from a clean, realistic starting state. Name prerequisites before the first command, including supported runtime versions, access rights and resources that cost money. Give the smallest meaningful success and show the resulting observable state. Follow it with the next task rather than an exhaustive feature tour. Installation, account creation and running commands remain subject to the user's authorization.

Separate optional customization from the required path. If a dependency is unavailable, offer an existing alternative only when behavior is equivalent for this task; otherwise name the blocked step. Do not replace a real integration with a mock without making that distinction visible. Record whether cleanup removes temporary data or retains user work.

## API reference and integration guides

Anchor the document to an authoritative schema or inspected handler. List method/path, authentication, permissions, input constraints and response variants. For numeric values include units and valid bounds. For timestamps include timezone and format. Explain missing versus null values and incompatible changes. Never infer that an unlisted error status is impossible.

Give a minimal request and a realistic error example. Explain pagination termination and ordering stability where relevant; retry policy should distinguish operations safe to repeat from operations that need idempotency keys or status lookup. An integration guide should demonstrate the whole intended flow, including how callers recover after an uncertain network response, rather than concatenating isolated endpoint snippets.

## Operational runbooks

State trigger, scope, prerequisites and decision owner. Start with diagnostics that narrow the problem. Associate each mutating step with the expected result, stop condition and recovery action. Capture the exact target/environment before an instruction can alter it. Do not hide dangerous options in a copyable command block.

A rollback can itself lose data or fail after an irreversible migration. Describe actual reversibility and verification rather than writing “roll back” as a promise. If required privileges or backups are missing, the safe branch is to stop that operation and escalate with collected diagnostics. Do not include private incident material in a general runbook.

## Architecture and decision records

Distinguish the current implemented system from proposed architecture. Show boundaries, state ownership, failure paths and the important trust assumptions. Link a diagram to concrete modules or interfaces. Record the decision, constraints, alternatives considered, consequences and what would justify revisiting it. A decision record does not need a fabricated numerical scorecard.

## Maintenance and migrations

Inventory old entrypoints and inbound links before restructuring. Keep stable terms aligned with the interface and schema. State source and destination versions, compatibility window, rollback limits and a check for completion. A changelog describes what changed; a migration guide tells a reader what to do. Update both when the release requires both.
