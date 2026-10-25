# Data and metric checks

## Observation grain and keys

Write what one row represents before counting it. A user can have many sessions, a subscription many invoices and an order many lines. Joining these tables without controlling multiplicity can make a valid query produce the wrong answer.

Inspect key uniqueness and null keys. Check join cardinality and unmatched records. Compare counts before and after joining; explain expected expansion rather than assuming every extra row is an error. Aggregate at the needed grain before joining where appropriate.

## Missing and malformed values

Null, empty text, zero and a coded missing marker may have different meanings. Do not assume that a string such as NA or NULL is always missing; it can be a real category. Choose a documented missing-value rule from the dataset's semantics.

Preserve the original values and explain transformations. A formatted currency string is not automatically a numeric value; identify currency, decimal separator and units before conversion. Mixed date formats can be ambiguous even when a parser accepts them.

## Time and cohorts

Identify the timestamp, timezone and event used to define a period. An incomplete current month is not directly comparable to a complete prior month. Distinguish a cohort's entry date from the date its later activity occurred.

Check gaps, duplicate timestamps and eligibility windows. A retention calculation needs a cohort definition, observation horizon and denominator consistent with that horizon. Do not count a user who could not yet reach the horizon as a failure without the chosen definition stating that.

## Rates and change

A rate needs a numerator and denominator from the same eligible population. Aggregate rates from counts when possible. Averaging percentages without their bases can give a misleading total.

For example, a change from20% to25% is5percentage points or25% relative growth. These describe different quantities. A zero baseline makes ordinary relative growth undefined; report counts or another justified comparison.

## Extremes, sampling and causality

Inspect outliers before excluding them. A high value can be a real event, a unit error or a duplicate. Report exclusions and sensitivity when they change the conclusion.

A sample can be non-representative even if large. Correlation can arise from common causes or changing composition. A before/after comparison without controls rarely establishes causality by itself. Present plausible explanations as hypotheses unless the design supports stronger claims.

## Reproducibility

Keep the extraction or snapshot identity, explicit filters, transformations and final calculation. Reconcile subgroup totals only when categories actually partition the population. Record sampling, truncation and unavailable columns. Do not expose unnecessary personal values in the analytical receipt.
