# Delivery pipeline engineering

## Trace one change to one artifact

Inspect the repository's current build, checks, artifact registry, environment promotion and release ownership. Map trigger, source revision, dependency resolution, build output identity, verification, approval if required, deploy and observation. Reuse working jobs and avoid introducing a new orchestrator for one missing check.

Pin supported actions/tools and dependency versions according to repository policy. Record artifact digest and provenance so promotion can use the tested artifact rather than silently rebuilding a different one. Reproducibility is a property to measure under declared conditions, not a claim derived from a lock file alone. Keep build and runtime configuration boundaries clear.

## Trust and credentials

Limit job permissions, credential lifetime and environment access to the task. Use the platform's supported identity federation where available; verify trust conditions bind the intended repository/ref/environment. Never expose protected secrets to untrusted pull-request code. Treat dependency installation, build scripts, cache restoration and action execution as executable code paths, not harmless metadata parsing.

Review artifact/cache integrity and cross-branch trust. Avoid embedding secrets in command arguments, logs, artifacts, container layers or portable settings. A masked variable is not guaranteed absent from every output. Keep test credentials isolated and least privileged.

## Gates and rollout

Select checks that prove the changed behavior: relevant unit/integration tests, build/schema checks, scoped security controls and deployment smoke tests as appropriate. Do not add redundant gates that merely echo implementation. Distinguish a check that was skipped from one that passed; preserve meaningful failure status through shell pipelines.

Serialize conflicting deployments or use the platform's actual concurrency controls. Separate approval from execution, bind it to the artifact/environment, and reconcile interrupted or timed-out operations before retrying. A deployment accepted by an API may still fail later. Observe actual rollout and the intended service behavior within authorized limits.

## Recovery and handoff

Document rollback artifact, configuration/data compatibility and who owns a failed release. Rolling back a binary may be unsafe after an irreversible migration. Keep release notes, deployment receipts and remediation concrete. Preparing a workflow file does not authorize pushing it, publishing a package, enabling schedules or starting a production deployment. Report what was edited, what ran locally/remotely and what still requires target acceptance.
