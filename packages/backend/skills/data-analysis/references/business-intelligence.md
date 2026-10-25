# Business intelligence delivery

## Define the decision before the dashboard

Identify the audience, decision cadence, KPI meaning and action a result should support. Inspect existing metric definitions and reports before building another dashboard. A visually polished display of an ambiguous measure is not a reliable BI deliverable. Record the source, grain, time basis, timezone, units, eligible population, numerator/denominator and filters for each important metric.

Separate a snapshot from a live report. Display the actual data-as-of time, refresh method and coverage. If data is missing, use an explicit empty/unavailable state rather than zeros or synthetic values presented as observations. Sample data is appropriate for a requested design demonstration when the entire artifact makes that status clear.

## Validate aggregation and interaction

Reconcile headline values to a trusted query or supplied data at the same scope. Check join fanout, distinct entity counts, null categories, currency and temporal aggregation. Calculate rates from their components at the selected filter scope; averaging already calculated percentages can produce a misleading KPI.

Filters must update every relevant chart, KPI and detail view consistently. Explain exclusions where some panels intentionally use a different cohort. Validate boundary dates, timezone interpretation, empty results and reset behavior. A sorted table should preserve row identity and avoid numeric values being ordered as strings accidentally.

## Choose a usable visual form

Match the chart to the question: time change, category comparison, composition or distribution. Label units and periods. Avoid axes or scales that exaggerate a small change; give context for truncated axes where they are useful. Use accessible labels, readable contrast and a meaningful non-color encoding when categories or states matter. Large or sensitive raw data should not be embedded into a public HTML snapshot just because it is easy to share.

For an existing BI platform, follow its semantic model, permissions and deployment path. For an authorized portable HTML report, inspect the dependency footprint: a CDN-loaded library is an external dependency and is not guaranteed to work offline. Use existing local assets or a truly bundled implementation when offline operation is required. Do not promise offline behavior without a network-disabled rehearsal.

## Sharing and governance

Determine the audience and permitted data granularity. Apply existing access policy to exports, including detail tables and downloadable files. Row-level restrictions in a BI service do not automatically follow a separately exported file. Keep private identifiers, small sensitive groups and credentials out of a broadly shared artifact.

## Deliver and evaluate

Deliver the actual report/dashboard, metric dictionary, source/refresh limits, meaningful interaction checks and unresolved decisions. A screenshot does not prove filtering or data correctness. A working local snapshot does not prove live warehouse access. If the report drives an ongoing decision, identify its owner and change trigger.

Acceptance cases: KPI totals reconcile before/after a filter; a rate uses the correct filtered denominator; empty data remains distinct from zero; a snapshot is labeled with actual freshness; an exported artifact respects its audience; a claimed offline dashboard works with network disabled. Record actual task results when testing these cases.
