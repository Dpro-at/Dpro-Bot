# Machine learning engineering delivery

## Artifact contract

Carry the study's target, feature availability, split and evaluation rules into the engineered artifact. Record model/data/code versions, training configuration, preprocessing, feature schema, output meaning and selection history. A registry entry is a reference to an artifact, not evidence that the model is suitable or deployed.

Define input types, required/optional fields, units, null/unknown-category behavior, ordering, batch shape and output schema. A serving wrapper must apply the same intended preprocessing and label mapping as training. Test representative inputs and boundary cases against the offline path. A matching score on one happy-path record does not prove parity across the supported input contract.

## Reproducible pipeline

Use the existing project/runtime instead of requiring an orchestration platform. Keep component boundaries around meaningful recoverable artifacts: validated input/ref, training-only transforms, model, evaluation receipt and proposed release. Cache keys need the actual data/config/code dependencies; stale cached features can silently invalidate a run.

Record failed and partial stages distinctly. Re-running a stage must not overwrite an approved artifact with an unreviewed result under the same ambiguous identity. Keep source/raw-data rights and privacy separate from the ability to load a model.

Do not load untrusted serialized code-bearing artifacts merely because they have a model extension. Inspect the actual format, provenance and supported loader; deserialization can execute code. Use the project's approved artifact process and dependency environment. This workflow does not authorize installing frameworks, starting training services or paying for compute.

## Evaluation and serving

Compare a candidate against the relevant baseline under the same held-out population and input contract. Gate decisions should use task-specific quality and operating objectives, not copied universal accuracy thresholds. Inspect important error slices, calibration where probabilities are used, latency/resource limits and unsupported inputs. A passing structural split audit remains only a narrow check.

For an authorized serving implementation, test offline/online preprocessing parity, deterministic mapping, error behavior, batch/single input semantics and model/version readback. A local endpoint is not production deployment. A deployment receipt should identify the actual loaded artifact and environment, not only the requested registry name.

## Releases and operation

Separate created, evaluated, registered, staged, promoted and monitored states. Promotion, recurring training, live traffic and automated rollback require the applicable operational authority. A rollback needs a known compatible prior model and input/output contract; switching a version label may not restore a changed feature pipeline or downstream state.

Define monitoring from the real failure modes: input schema changes, missing features, latency/errors, data distribution and outcome quality when labels arrive. Drift is a diagnostic signal, not proof that the model is wrong or permission to retrain automatically. Record label delay, selection and coverage when interpreting production performance.

Deliver the artifact/implementation requested, schemas, reproducibility record, actual parity/evaluation checks, release state and remaining gaps. Do not present an architecture diagram, container build or model registry entry as a verified live service.

## Acceptance cases

An offline category mapping differs from serving: identify and repair the parity gap. A candidate uses a stale cached transform: bind the correct input/version or mark the result invalid. An unknown input arrives: follow documented error/fallback semantics. A registry write succeeds: record registered state without claiming deployment. A drift alert fires: investigate under actual authority instead of starting an unapproved paid retrain. Record actual task outputs when exercising these cases.
