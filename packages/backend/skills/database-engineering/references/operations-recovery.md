# Operations, backups and recovery

## Establish actual state

Record engine/version, environment, topology, owner and operational objective. Inspect current health evidence: connections, active work, locks, space, replication state and relevant logs with private values protected. A dashboard status alone may not explain an incident. Choose a diagnostic that can distinguish plausible causes before mutating configuration.

## Backup evidence

Identify backup method, consistency boundary, included data/configuration and restore dependencies. A filesystem copy of an active database can require engine-specific coordination; use the supported mechanism. Encrypt/protect private backups according to the existing project policy and do not distribute them with skill packages.

A backup file proves only that a file exists until integrity and restore are checked. Rehearse restoration into an isolated target with compatible engine/configuration. Verify schema, representative data/invariants and the application path relevant to the recovery objective. Never restore over the live database to demonstrate that a backup works.

## Availability and maintenance

Differentiate planned maintenance, incident containment and permanent repair. Identify the effect of restart, failover, replica promotion, vacuum/reorganization or storage changes in the actual system. These actions may require authority and can affect availability. A written runbook is not authorization to execute it.

Replication is not automatically an independent backup: corruption or deletion can propagate. A promoted replica may lose data within the actual replication/recovery boundary. Record observed lag and recovery limits rather than promising zero loss.

## Recovery receipt

Record the source backup/log range, target identity, engine version, commands, actual restore result, data/invariant checks and remaining gaps. Distinguish estimated recovery objectives from observed rehearsal times. A restore that starts the database does not prove every external dependent service recovered correctly.

## Handoff

Deliver the current state, action taken, retained diagnostics, verified recovery route and next owner action. Preserve uncertainty if the durable state cannot be established. Do not delete logs, checkpoints or backups to make the incident appear resolved.
