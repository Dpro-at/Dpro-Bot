# Recovery validation and result boundaries

Choose checks that correspond to the stated recovery unit and scenario. Record both the expected result and actual evidence. A command's successful exit is one observation, not the whole acceptance decision.

## Validation layers

- Artifact: identity, provenance, transfer integrity, readable format, required volumes and log-chain continuity.
- Engine: supported recovery completion, integrity checks, schema/version compatibility and actual transaction boundary.
- Application state: important counts and invariants, database/object references, permissions, configuration and representative business records using approved minimal data.
- Service behavior: critical read/write journey, background processing, identity, dependent services and required observability in an isolated environment.
- Security and containment: intended identities only, no recovered stale production tokens in public outputs, no accidental outbound effects or competing writers.
- Objectives: validated usable recovery point and elapsed phases compared to the agreed RPO/RTO boundary.

Counts alone cannot prove semantic completeness. Compare representative content and application invariants appropriate to the system; explain sampling and unavailable evidence. Retain enough version and artifact identity to reproduce the result without exporting protected records.

## Exercise classes

A tabletop checks sequence, people and missing prerequisites. It does not measure transfer throughput or restored service behavior. A technical partial exercise proves only the restored subsystem under its test conditions. A complete isolated recovery can provide broader evidence but still excludes unexercised production cutover, load or external dependencies. Choose a failure variant only with explicit permission for its bounded effects; do not inject production failures from a plan request.

## Receipt

Use pass, partial, failed or blocked with a precise reason. List which checks were executed, which failed, and which were not observed. Report elapsed phase measurements and recovery-point evidence separately from estimates. Assign remediation owners and next verification scope. A failed objective does not justify editing the target after the fact to mark the drill successful. Preserve the original measurement and record the revised requirement as a new decision.
