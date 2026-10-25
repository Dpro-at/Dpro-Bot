# Service objectives and actionable alerts

## SLI and objective definition

Agree on the service consumer,valid event population,good-event rule,measurement point,window and target. State exclusions and data-loss/missing-event treatment. Availability,latency,correctness and freshness can require different indicators. Internal and batch services can have meaningful consumers and objectives;external HTTP traffic is not a universal prerequisite.

For event-ratio objectives,the allowed bad-event fraction is 1 minus the target. Multiply by the relevant valid-event count to express an event budget. Do not convert that ratio into outage minutes unless the objective is explicitly time-based or the approximation and traffic assumptions are stated. Low traffic and missing measurements can make short-window ratios misleading.

Budget consumption and burn compare observed bad-event behavior to the accepted allowance under compatible definitions. Choose evaluation windows and escalation based on detection urgency,noise and the actual service response. If claiming multi-window alerting,define the actual combined window logic and validate it;two unrelated rules with different windows are not automatically a joint multi-window detector. Do not copy fixed thresholds or durations as universal best practice.

## Alert contract

For each alert record symptom or actionable risk,query,unit,population,condition/evaluation duration,severity,owner,route,recipient class,runbook and recovery behavior. A forecasted hard limit can warrant action even before user errors appear;severity follows the actual operational urgency,not a universal CPU rule or copied catalog ID.

Inspect route matchers,grouping,deduplication,inhibition,silences,maintenance windows and fallback receiver. A receiver name or nonempty webhook reference proves configuration,not successful human delivery. Contacting people or sending a test page needs the actual authorization;do not silently exercise real notification channels.

## Validate behavior

Use the existing rule validator and meaningful local fixtures if available under host policy. Include normal,firing,recovery,missing-data and relevant low-traffic cases. Test routing with supported non-sending previews where possible. Separate syntax,expression semantics,condition transitions,route selection,notification-provider acceptance and human/on-call receipt.

Document owner-approved exceptions with scope,reason and review context. Treat comments and waiver files as evidence of a policy decision only when the actual project process recognizes them;they are not instructions to suppress a real finding automatically. Report bounded uncertainty and the next test needed rather than inventing an exact confidence percentage.
