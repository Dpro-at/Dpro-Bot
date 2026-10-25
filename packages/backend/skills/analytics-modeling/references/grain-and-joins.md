# Grain, relationships and reconciliation

## Declare the row

Write “one row per …” with the complete temporal qualifier. One row per customer now differs from one row per customer per day or one row per customer version. Identify natural/business keys and any surrogate key policy. A generated unique ID can conceal duplicate business records; uniqueness of that ID alone does not prove correct grain.

Keep facts at their intended event or snapshot level. A daily inventory balance is not additive across time in the same way as daily sales. A financial amount needs currency and conversion-date rules. Ratios need their underlying components retained when downstream consumers aggregate them.

## Prove relationships

Profile the proposed join key on both sides. Record uniqueness, nulls, unmatched rows and expected relationship type. Check whether a dimension has multiple historical versions and whether event time or processing time selects the correct one. Temporal boundaries must be explicit, including how an exact boundary timestamp is assigned.

For one-to-many joins, show which measure belongs to which side. Joining order-level totals to line items repeats the total; summing that repeated value inflates revenue. Joining multiple independent child tables can multiply both counts and amounts. Pre-aggregate the child facts independently, use a correctly scoped bridge, or retain separate models according to the intended query.

Many-to-many relationships can be valid. If allocating a measure, document weights, rounding and how totals are preserved. Do not invent equal allocation when business semantics are missing. Deduplicating after an incorrect join can discard valid repeated values while leaving the conceptual error intact.

## Handle missing references

Check whether unmatched facts are late-arriving, invalid or legitimately optional. Preserve an unknown member where that is the agreed contract and surface the unmatched rate. Reject or quarantine invalid rows when the task's policy requires it. Never silently convert an unknown amount to zero merely to simplify a chart.

## Reconcile at the same scope

Compare input/output counts at compatible grain and filters. Count distinct business keys separately from rows. For measures, retain the source window, currency, exclusions and rounding. An unexplained difference must remain a failure or open question; it should not become an arbitrary tolerance. For a rate, compare the numerator and denominator before the final percentage.

The bounded [fanout fixture](../assets/fanout-fixture.md) demonstrates why an apparently valid join can produce a wrong total. Adapt its relationship checks to actual sources; the fixture does not validate a live warehouse.
