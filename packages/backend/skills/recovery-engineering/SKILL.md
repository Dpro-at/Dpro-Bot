---
name: recovery-engineering
description: Design backup coverage, recovery objectives and evidence-based restore exercises for stateful systems. Use for backup reviews, restore runbooks, recovery drills or recovery readiness questions.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; use host-authorized tools and actual platform documentation.
metadata:
  agent-player:
    version: 1.1.0
---

# Recovery engineering

Turn a recovery requirement into a scoped plan, then report only what the available evidence proves. A backup job, readable archive, restored database and functioning recovered service are different outcomes. Work with the existing platform and owner-defined priorities; do not introduce a backup provider or require a production drill for routine source work.

## Intake and route

Identify the service, state owners, failure scenario, current backup methods and requested deliverable. Ask for missing information only when it changes the decision; continue the independent inventory and runbook work meanwhile. Record unknowns without inventing recovery targets or retention rules.

1. Establish the recovery contract and objective boundaries with [scope and objectives](references/scope-objectives.md).
2. Review state coverage, consistency and access dependencies with [backup design](references/backup-design.md).
3. Write the exact platform-specific sequence using [restore execution](references/restore-execution.md). Bind every proposed command to the authorized target before execution.
4. Select checks and collect evidence with [validation](references/validation.md).
5. Hand off risks, remediation and next ownership using the [recovery plan](assets/recovery-plan.md) and [exercise receipt](assets/exercise-receipt.md).

## Work contract

Prepare the requested design or runbook directly. A proposed restore target is not an authorized provisioned environment. Honor host approval, privacy, network, installation and cost rules. Do not restore over live data, change retention, enable replication, rotate keys, delete backups or switch traffic merely because this workflow describes them. When execution is authorized, stop on target ambiguity, an unexpected writer, an unverified destructive step or unexplained partial results; reconcile state before retrying.

Keep evidence in the user's approved private location. Share identifiers and sanitized findings, not database contents, credentials or encryption material. A reusable plan should point to controlled secret-recovery procedures rather than embed secrets.

## Finish

Deliver the requested artifact, inventory gaps, objective assumptions, scoped measured results and concrete next actions with owners. Separate proposed checks, executed checks, failed checks and unobservable checks. Mark tabletop and isolated subsystem evidence as such. Never certify whole-service recovery from checksum agreement alone. Read [future acceptance briefs](references/acceptance.md), [design notes](references/design-notes.md) and [runtime contract](references/runtime-contract.md) when evaluating or adapting this package.

## Disaster recovery and continuity mode

For a multi-system outage, region/account loss or coordinated recovery exercise, read [disaster recovery](references/disaster-recovery.md). Use the [continuity decision record](assets/continuity-decision.md) to connect service dependencies, activation decisions, safe degraded operation and recovery/failback evidence. This extends the same recovery workflow; it does not create a second backup procedure or grant incident/failover authority.
