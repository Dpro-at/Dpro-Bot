---
name: system-architecture
description: Design or evaluate software architecture using observed system boundaries, measurable requirements, explicit tradeoffs and migration/verification plans. Use for system designs and consequential technical decisions.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; actual device, browser, audio and external capabilities depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# System architecture

Produce a decision that an implementation team can use and revisit. Start from the user's problem, existing system and actual constraints. Do not select microservices, queues, vector stores or a cloud provider to make a diagram look sophisticated. Architecture work can conclude that the current structure is adequate.

Read [Runtime contract](references/runtime-contract.md) in a new host. Inspect repository/deployment documentation, interfaces, schema and representative request paths where available. Separate observed facts, owner requirements, estimates and unknowns. Use [Architecture brief](assets/architecture-brief.md) to define the decision and scope.

## Understand the system and requirement

Read [Requirements and evidence](references/requirements-evidence.md). Identify actors, essential flows, data classes, authoritative owners, consistency needs, failure impact and operational team constraints. Turn material quality requirements into scenarios that can be tested rather than adjectives such as scalable or secure. Bound load/capacity assumptions and name which evidence could invalidate them.

## Shape alternatives

Read [Boundaries and flow](references/boundaries-flow.md) for component, data, authority and failure boundaries. Compare a small set of genuinely viable alternatives, including the least disruptive fit. Follow the user's required stack and organization constraints. Reuse existing capabilities before proposing another service or source of truth.

Use [Decision record](assets/decision-record.md) for a consequential choice. Explain the causal tradeoff: which requirement improves, which cost/failure/operational burden follows and when the decision should be revisited. A score table can help but should not hide uncertain estimates behind precise totals.

## Plan change and proof

Read [Evolution and validation](references/evolution-validation.md). Identify compatibility windows, data migration, authoritative writer, rollout/reversal conditions and unresolved ownership. Specify proof for the risky seam: a focused prototype, realistic load trial, failure recovery test, contract experiment or observed operator workflow.

Prototypes must use authorized disposable resources and stay inside the task's budget. Writing a design is not authorization to provision infrastructure, migrate live data, start servers or deploy. Complete the independent design with explicit capability gaps when those actions are unavailable.

## Deliver

Provide the current/target view, chosen option, alternatives, contracts/invariants, change sequence and evidence. Use diagrams only where they clarify boundaries and failure paths. Link the authoritative records instead of duplicating changing schemas in several documents. State what is designed, implemented, measured and still assumed.

[Acceptance briefs](references/acceptance.md) exercise architecture judgment. [Design notes](references/design-notes.md) record source comparison. Provider-neutral instructions do not imply that every host can inspect production telemetry or execute a prototype.
