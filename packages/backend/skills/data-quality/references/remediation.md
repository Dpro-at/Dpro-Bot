# Remediation and operating controls

Assessment, proposed repair and executed correction are separate states. Clarify the authorized target and affected scope before mutation. A failed check does not authorize dropping rows, changing business meaning or weakening access controls.

## Repair plan

Identify the source version, record predicate, intended values, owner, dependencies and recovery limits. Avoid a broad predicate when stable identity is available. Concurrent updates can make an old correction overwrite newer valid information; use the existing transaction/version mechanism and recheck the target at the effect boundary.

Prefer fixing the causal transformation or source process and then applying a bounded repair when appropriate. Replacing bad values with defaults can destroy evidence or introduce biased data. Quarantine can be useful when it preserves recoverable identity, reason, owner and replay route; an unowned error folder is not a complete recovery plan.

## Verification

Check that the specific defect is corrected, the intended aggregate reconciles, unrelated valid records are preserved, and repeat execution has the declared effect. Record actual changed-row scope and evidence. A successful update statement proves execution, not semantic correctness or downstream adoption.

For a backfill, define source range, mapping version, current-ingestion concurrency, rate/cost limits and consumer visibility. A full refresh can be expensive or destructive. Follow the actual project's deployment and data-repair process rather than treating full replacement as routine cleanup.

## Monitoring

Connect an implemented check to an owner and response. Record last successful observation, freshness, scope, threshold and runbook. Alert on meaningful sustained conditions rather than every expected fluctuation. Keep changes in sampling and business definitions visible when interpreting trends. Do not call a check active because its configuration file exists.
