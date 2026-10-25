# Reliability and CI

Treat an intermittent failure as an observation to explain. Preserve the first failing command, build, runtime, seed/order, fixture identity, logs and relevant timing. A green rerun is additional evidence, not a replacement for the failure.

## Diagnosis

Classify likely causes from evidence: application race, asynchronous test assertion, leaked state, order dependence, external variability, device/resource pressure or runner defect. Do not assume every failure is a test problem. Reproduce the smallest useful case and vary one meaningful condition at a time.

Control clock/random sources for policy logic where possible. Await real ownership and completion. Fix shared fixtures or resource lifecycles rather than hard-coding the one order that passes. When testing actual timers, network or database behavior, retain that real seam and bound the harness rather than mocking away the property under investigation.

Retries can be a temporary diagnostic or operating choice with explicit bounds and separate first-attempt/final result metrics. They must not repeat unsafe external effects or convert critical authorization/data-loss failures into a quiet pass. Quarantine needs an owner, reason, tracked risk and review condition; do not delete a critical test solely because it is old, always green or inconvenient.

## CI fit

Reuse the project's existing commands and artifacts. Pin relevant runtime/dependencies through established lockfiles and document the environment matrix that matters to the change. Caching must not hide missing build steps or contaminate tests across incompatible versions. Sharding should preserve fixture isolation and report failures from every shard.

Choose gates from risk and evidence. Code coverage indicates executed code, not asserted correctness; one percentage is not a universal release decision. Duration, first-attempt failure, retry frequency and escaped defects can inform investment, but define denominators and compare like environments.

## Reporting

Distinguish passed, failed, skipped, blocked and not run. Record the specific checks and their scope. A parse/discovery pass is a package compatibility result, not application acceptance. A local run is not CI acceptance until the actual CI environment ran it. Do not install a device farm or activate a paid runner to fill a report without authorization.
