# Container platform review and operations

## Workload contract

Identify the actual orchestrator and version, cluster/account, namespace, workload kind, runtime identity, image artifact and traffic path. Kubernetes, ECS and other orchestrators have different models; do not translate field names blindly. Check supported official schemas for the selected platform. Reuse the existing deployment/chart/controller conventions.

Review image provenance and immutable digest, architecture compatibility, entrypoint, configuration/secret sources and filesystem requirements. A tag can move; a digest identifies content but does not certify it as safe. Set resources from observed or explicitly estimated workload demand. Include startup, steady-state, spike and termination behavior rather than copying universal CPU/memory values.

## Kubernetes-specific checks

Inspect selectors/labels, service target ports, ingress/gateway routes, namespace boundaries, service accounts/RBAC, network policy assumptions and admission requirements. Namespace naming alone is not a security boundary. Review privilege, user/filesystem needs and capabilities against actual application requirements; avoid granting cluster-admin to fix a deployment error.

Distinguish startup, readiness and liveness. Startup gates the other probes until success; readiness indicates ability to serve traffic; liveness can trigger restarts. A downstream dependency failure should not automatically kill a healthy process and amplify an outage. Some workloads need no liveness probe. Tune thresholds using measured startup and failure behavior, not arbitrary defaults.

For persistent volumes examine access modes, topology, reclaim behavior, snapshots, backups and application consistency. An orchestration rollback does not undo a database migration or restore deleted volumes. Examine replica availability, disruption budgets, node draining, rollout surge/unavailability, autoscaling metrics and quota together; a manifest can request more capacity than the cluster can supply.

## Diagnose a rollout

Read status, recent events, controller decisions and bounded relevant logs before changing settings. Separate image-pull, scheduling, permission, admission, config, probe and application failures. Avoid dumping secret-bearing logs. A ready replica is useful evidence, but verify service routing and the critical application journey when authorized. Do not delete/recreate resources repeatedly to clear unknown conditions.

## Change and recovery

Specify artifact/version, rollout method, concurrency, observable success window and abort threshold. An authorized canary or staged rollout needs meaningful traffic/health observations and a consistent rollback path. Preserve the prior artifact and data compatibility assumptions. State exactly which cluster actions ran and which remain proposed.
