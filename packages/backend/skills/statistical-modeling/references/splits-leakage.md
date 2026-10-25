# Splits, feature availability and leakage

## Match the intended use

Specify the prediction moment, horizon and entity population. A random split can be appropriate for exchangeable observations, but can leak future or repeated-entity information in temporal/grouped tasks. Group exclusion is not universal: a system forecasting returning customers may legitimately see their earlier history. State the desired generalization and apply the corresponding boundary.

## Training-only learned steps

Fit scaling, imputation, encoding, feature selection and learned aggregation only within the allowed training portion of each fold. Compute historical features as of the prediction timestamp. A feature derived from an eventual payment, resolution, refund or post-outcome status may leak the target even if its field name looks innocuous.

Deduplicate or group according to actual identity and task semantics before comparing candidates. Copies with different row IDs can still leak. A sample-ID disjointness check cannot detect near-duplicates, shared histories or semantic leakage automatically.

## Temporal evaluation

Define training end, validation/test start, label horizon and any embargo needed by overlapping outcome windows. Use rolling or expanding windows when they match the task, with the same policy for all candidates. A chronological timestamp check establishes ordering in that manifest only; it cannot prove that a feature or label was available then.

## Final evaluation

Use validation for tuning and threshold selection. Keep the final test set from becoming another tuning surface through repeated manual inspection. If it has been used in selection, record that limitation and obtain a genuinely new evaluation route where appropriate. Do not rename the same exposed data to “holdout” and claim independence.

## Mechanical helper

scripts/audit_splits.py reads an explicit local JSON manifest, does no networking and does not train a model. It checks sample IDs, optional group overlap and strict timestamp ordering when requested. It prints aggregate finding counts without raw identities. It does not inspect feature matrices, source provenance, near-duplicates, embargo windows, labels or code. Missing group/timestamp fields in a requested strict mode are errors rather than silently passing.
