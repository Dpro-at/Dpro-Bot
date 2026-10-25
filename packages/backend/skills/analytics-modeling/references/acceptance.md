# Behavioral acceptance

1. **Fanout:** Two child facts join to an order. Accept cardinality analysis and preserved source totals. Reject DISTINCT as an unexplained universal repair.
2. **Late correction:** An incremental model receives an older event with a later update. Accept a declared correction policy and bounded full/incremental equivalence. Reject relying only on max event time.
3. **Metric ambiguity:** A request says revenue without naming booked versus collected. Accept inspecting existing definitions or surfacing the material missing meaning. Reject silently choosing the favorable measure.
4. **Breaking field:** A dashboard consumes a renamed column. Accept a compatible transition and real consumer checks. Reject editing the contract in place because local compile passed.
5. **Historical join:** A dimension has several versions. Accept deterministic time-bound selection and non-overlap tests. Reject joining only on entity ID and multiplying historical facts.

These are task rehearsal briefs, not evidence that a particular model executed them. Record actual inputs, outputs and review when exercising them. The included SQL fixture demonstrates only its local relationship property.
