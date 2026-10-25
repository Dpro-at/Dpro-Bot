# Investigating discrepancies

## Reproduce at compatible scope

Pin the source/extract version, time range, timezone, filters, keys, units and transformation ref. Compare identities and selected values, not only counts. Distinguish observed, estimated and expected totals. A rounded presentation can differ from exact stored values without a source defect.

Trace source → extraction → normalization → transformation → consumer. At each boundary, inspect the earliest mismatch the available evidence supports. Check partial pagination, tied cursors, late corrections, timezone shifts, invalid casts, duplicate deliveries and relationship fanout. Do not assume every discrepancy needs a source-data edit.

## Conflicting metrics

Write down both definitions. Gross and net amounts, event time and ingestion time, user count and session count can legitimately differ. Identify exclusions, deduplication rules, currencies and attribution windows. A glossary name alone does not establish equivalence. Resolve material ambiguity with the definition owner or leave the result explicitly conditional.

## Cause and impact

Separate the immediate failed property from its suspected cause and downstream consequence. Evidence that a defect began near a release is a lead; a controlled reproduction or trace can strengthen causality. Where history is missing, state the gap and the most useful next observation.

Bound the affected population and decisions. If the boundary is uncertain, keep that uncertainty visible rather than inventing a precise number of impacted users. A source correction may not repair previously exported outputs, so identify known downstream copies and ownership.

## Stop condition

Stop when the requested fitness decision is supported or a decisive gap requires unavailable evidence. Deliver the useful partial result and exact next check. Do not continue collecting profiles that cannot change the decision or claim a cause merely to close an incident.
