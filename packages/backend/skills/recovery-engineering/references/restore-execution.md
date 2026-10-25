# Restore runbook and execution

## Preconditions

Resolve an identified backup and a specific permitted restore target. Record account/project, region, host/cluster, database name, storage destination, credentials source and approved action scope without copying secret values. Verify that the selected target is isolated from production writes, scheduled tasks, webhooks, email, payment and other outbound effects. A different database name alone may not isolate the application.

Check software/version compatibility, disk capacity, keys, dependency access and the chosen consistency boundary. Record prerequisites as observed, missing or proposed. A missing external target is a blocker to execution, not permission to provision one. Continue the runbook and tabletop review.

## Ordered procedure

Write platform-specific steps only after checking the actual tool/version documentation and existing operational conventions. Each step needs input, target, action, expected observation, failure branch and required authority. Separate retrieving, decrypting, restoring data, reconnecting dependencies and validating the application. Keep original evidence intact; work from an authorized recovery copy. Do not overwrite the sole backup to simplify a test.

When authorized to execute, capture start/end times and bounded sanitized outputs. Stop if target identity differs, protected data would leave the permitted boundary, storage is insufficient, integrity checks fail or side effects cannot be contained. On timeout or lost connection, inspect the target and operation status before retrying; blind retries can repeat imports or switch writers twice.

## Promotion and rollback

A drill should normally finish in its isolated target. Production cutover is a separate scoped action: identify the authoritative writer, fence or reconcile competing writers, account for transactions accepted since the restore point, approve routing changes and define a consistent rollback path. Rolling back application code does not automatically roll back a data migration. Document data-loss implications before choosing a restore point.

Have the service owner define abort conditions and who can accept degraded operation. Preserve logs and incident evidence when compromise or corruption is suspected. Do not declare the old environment safe merely because the recovered copy appears healthy.

## Cleanup

Record actual temporary resources and data locations, ownership, retention and permitted cleanup actions. An authorized drill does not automatically authorize deletion of forensic evidence or production backups. If cleanup cannot be completed within scope, leave a precise handoff instead of silently destroying data or claiming it was removed.
