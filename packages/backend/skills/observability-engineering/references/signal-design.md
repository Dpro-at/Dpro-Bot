# Signal design

## Start with a decision

Name the service,environment,critical user journey and question:availability,latency,correctness,queue completion,resource saturation or diagnosis of an unknown failure. Define the consumer and decision the signal supports. Inspect application/platform collection and shared dashboards before declaring a missing local config a gap. Record where you looked and the evidence for centrally managed coverage.

Choose metrics for aggregate behavior,logs for relevant event detail and traces for causal request-path investigation when the system warrants them. Do not require tracing simply because two components exist,or dismiss it solely because the application is small. Use the actual diagnostic need,cost and correlation capability. A batch workflow can need completion/freshness evidence even when no person needs a midnight page.

## Measurement contract

For each signal define source,instrumentation point,event population,unit,dimensions,collection cadence,expected delay and missing-data semantics. Identify counters,gauges,histograms and event timestamps correctly. A request entering a proxy and a request completing at the service are different populations. Distinguish retries,health checks,internal traffic and partial failures according to the service question.

Use bounded dimensions that help real decisions. Avoid user IDs,raw URLs,request IDs or email addresses as unrestricted metric labels. Correlation identifiers can belong in appropriately protected logs/traces without becoming aggregation dimensions. Estimate series/ingest growth from actual dimensions and validate with observed cardinality when permitted;an estimate is not a measured bill.

## Coverage and usefulness

Map the journey to observable failure modes and dependencies. A healthy collector does not show that all required application events are instrumented. A CPU chart does not automatically measure user impact. Add only the missing signal needed for the task,including an explicit pipeline-health or freshness observation when absence could hide failure.

Give each proposed signal an owner and acceptance check. Document unsupported assumptions and sampling bias. Do not infer individual productivity,intent or behavior from operational telemetry unless the actual task,policy and evidence support that use.
