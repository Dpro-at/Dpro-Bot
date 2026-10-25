# Queries and dashboards

## Query contract

Record backend/tenant,service/environment selectors,timezone/time window,step or resolution,output limit,expected unit and data freshness. Start with a bounded instant or narrow-range query appropriate to the question. Avoid unbounded regex scans or entire-log downloads. Do not expand privileges or cross tenants because a panel is empty.

Verify actual metric/label names and types. Apply rate/increase to suitable counters with reset behavior understood. Match aggregation labels and vector joins to the intended population. Ratios need compatible numerator/denominator filters and defined zero/no-traffic handling. A parseable query can still calculate the wrong quantity.

For distributions use the backend's actual histogram/summary model. Review bucket boundaries,units and aggregation before quantiles. Averaging per-instance percentiles is not the fleet percentile. Downsampling,query step and sparse traffic can change what a panel shows;record these limits instead of inferring false precision.

## Empty and contradictory results

Distinguish no matching series,stale series,an explicit zero,partial backend response,query error,expired retention,permission filtering and data delay. Compare source/collector/backend evidence under the same time and tenant scope. Use a small representative event or known series only within authorization. Do not replace missing data with zero simply to make the chart look healthy.

For logs bound stream selectors,time and line count;protect payloads and account for truncation. For traces compare sampled coverage,propagation and timing before concluding a dependency was never called. Correlation supports investigation but does not by itself prove causation.

## Dashboard design

Build panels around actual operational decisions:current user impact,traffic/load,relevant bottlenecks and a route to diagnosis. Show units,window,freshness and meaningful thresholds;keep environment and population visible. Include no-data/error states rather than defaulting to green. Make drilldown links preserve the selected service/time/tenant without exposing credentials.

Validate queries separately from rendering. Confirm representative normal,failure and no-data conditions where permitted. A provisioned dashboard JSON is not evidence the intended audience can access it or that its data sources and variables resolve. Deliver useful layout/query artifacts with explicit remaining integration checks.
