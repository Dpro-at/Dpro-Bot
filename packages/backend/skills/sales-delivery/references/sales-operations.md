# Sales operations and pipeline integrity

## Define the dataset

Establish account/team scope, snapshot date, reporting period, source object, currency and metric definitions. Inspect actual stages, categories, required properties and associations. Distinguish a complete pipeline export from a filtered activity report. Check stable IDs and duplicate rows before computing totals; repeated contact associations must not multiply opportunity value.

Reconcile the population: opening records, additions, movements, wins, losses and removals where snapshots support them. A record missing from a newer extract is not automatically won or lost. If stage history is unavailable, do not infer stage age from last-modified date. Prefer native forecast categories when their semantics are known, and record any deliberate mapping.

## Audit with contextual rules

Check missing/invalid amounts, date consistency, unclear next actions, ownership gaps, associations, stale activity and evidence for stage criteria. Zero can be a valid placeholder or a real no-charge opportunity; flag according to the organization's process rather than declaring every zero critical. Choose staleness thresholds by motion and actual policy; arbitrary fourteen-day rules are not universal.

Separate invalid data, missing evidence and commercial risk. The absence of a proposal in an inaccessible document source is not proof that no proposal exists. Prioritize corrections by reporting or execution impact, and include source evidence plus proposed before/after values. Do not manufacture a close date from a median sales cycle or mark a deal committed because the stage sounds advanced.

## Produce reproducible reporting

For pipeline and forecast summaries state inclusion/exclusion, category overlap, count, amount definition and currency conversion treatment. Do not sum multiple currencies without a stated rate/date/method. Distinguish closed-won, open commit, upside and total pipeline so overlapping buckets are not added twice. A probability-weighted figure is a calculation using stated inputs, not a calibrated prediction by default.

For conversion, win rate, cycle time and velocity, define the cohort, denominator and observation window. Open opportunities can censor cycle estimates; small cohorts and changing process definitions limit comparisons. Reuse data-analysis for deeper calculations when available. Provide the formulas or transformation steps needed to reproduce important totals.

## Apply and monitor

Deliver a ranked exception list, reconciled summary and a narrow correction plan with owners. Actual CRM changes follow the operating contract with current-schema validation, conflict handling and readback. Keep forecast submission and record hygiene distinct. A clean database does not prove a healthy pipeline, and an operations report does not authorize reassignment, bulk deletion, campaign enrollment or commercial commitments.
