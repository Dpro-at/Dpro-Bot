# Measured query and workload performance

## Baseline

Identify the user-visible slow operation, query/ref, representative parameters, result size, data distribution and concurrency. Record latency distribution, throughput and resource evidence where available. A single warm-cache timing cannot establish production improvement. Keep baseline and candidate conditions comparable.

## Plans and execution

Inspect the actual engine's plan tools. Estimated plans describe optimizer choices/estimates; execution analysis can run the statement and consume resources or mutate data. A transaction rollback may not undo external effects, so inspect the query and tool semantics before executing it. Prefer an authorized representative test environment when possible.

Compare estimated versus actual cardinality when available. Investigate stale/missing statistics, skew, joins, predicates, sorts, spilling, lock waits and excessive result transfer as supported by observations. Do not interpret every scan as a defect; for some queries and table sizes it is the appropriate plan.

## Index and query changes

Match indexes to the actual predicates, ordering, joins and workload. Consider selectivity, leading-column behavior, expression/collation semantics and maintenance cost in the relevant engine. An index that helps one SELECT can slow writes and increase storage. Check correctness and representative write/read impact before broad adoption.

Avoid changing query semantics to obtain a faster result. LIMIT, approximate aggregation or cached results require the task's actual acceptance. Pagination needs stable ordering and the intended consistency; a quick page is not useful if rows disappear or duplicate across pages unexpectedly.

## Configuration and validation

Do not copy universal memory, connection or parallelism settings. Use workload evidence, environment limits and current official guidance. A proposed configuration change needs a scoped effect, recovery route and actual permission. Record a candidate as proposed until applied and measured.

Re-run the relevant workload with comparable data and cache/concurrency conditions. Report both improvements and regressions. Avoid a precise percentage lift from incomparable runs or a statistically noisy microbenchmark. Production acceptance remains separate from an isolated example.
