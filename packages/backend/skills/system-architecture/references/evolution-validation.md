# Evolution and validation

Design the path from current to target, not only the final picture. Preserve IDs, business meaning, permission ownership and supported consumers unless the assignment explicitly changes them. Identify which change can be rolled back safely and which permanently transforms data.

## Compatibility sequence

For each seam, record reader/writer versions, schema, request/message contract and configuration precedence. Where coexistence is needed, make new readers tolerant before enabling new writers, then retire old paths only after evidence. Additive fields can still break strict decoders, enums, signatures or defaults; assess actual consumers.

Name the authoritative writer during transition. Dual-write without atomicity or reconciliation can create divergent truth. Shadow comparisons should not perform duplicate consequential effects. Backfill needs stable keys, progress/replay semantics and completeness checks. Keep cutover and removal criteria observable.

## Validation plan

Map each high-impact uncertainty to a bounded experiment. Examples: contention on the actual local engine; consumer compatibility with a captured synthetic schema; queue saturation under representative load; recovery after a controlled owned-process failure. Specify environment, input, expected invariant, budget and artifact before execution.

A proof of concept measures its fixture and configuration. Record actual numbers, source revision and assumptions. An in-memory mock cannot prove transaction locking; a local same-process test cannot prove regional failover. Keep designed, implemented, measured and operationally accepted states separate.

## Release and recovery

Define the exposure sequence, monitoring signals, stop condition, decision owner and reconciliation after a partial change. A rollback may require forward correction if the new format has already been written. Preserve a verified backup/recovery route appropriate to the authorized data-changing task.

Provisioning, deployment, service activation and live data migration need their applicable approval; the architecture task does not authorize them. When execution is unavailable, deliver the exact plan and remaining acceptance instead of a fictional green gate.

## Decision maintenance

Record consequences, open assumptions and revisit triggers. Useful triggers are a measured saturation threshold, changed ownership, a new consumer contract or an observed failure the design cannot contain. Avoid reviewing every decision on an arbitrary schedule solely to produce activity. Keep superseded decisions linked so the next person understands why the system changed.
