# Reliability engineering and operational improvement

## Decision and ownership

Define the service,consumer,reliability question and actual responsibility. Use the agreed SLI/SLO and measurement quality;do not invent an objective or declare a universal budget freeze. If the team lacks a policy,prepare options with consequences and an owner decision. Reliability investment competes with product,cost and operational constraints;make the tradeoff reviewable rather than unilaterally deciding the roadmap.

Assess current risk from actual user impact,dependency health,capacity,changes and recovery evidence. A remaining error budget is not permission to ship an unsafe change,and an exhausted budget does not itself grant authority to stop every release. Apply the actual policy and escalate unresolved tradeoffs through the responsible owner. Maintain event versus time units and missing-data semantics from the objective reference.

## Readiness and capacity

For a new service or material change assemble proportionate evidence for ownership,critical journeys,observability,dependencies,capacity,load/failure behavior,rollback/data compatibility,access and recovery. A low-impact source change may not need a full production review. Record which evidence is current,representative and actually exercised;templates or self-attestation alone do not prove readiness.

Use measured workload and saturation trends to propose headroom or load-management changes. Include quotas,queue growth,dependency bottlenecks and the effect of retry behavior. Averages can hide burst or tail behavior. Load tests and failure injection require a bounded authorized environment and stop conditions;do not run them against production from a planning task.

## Toil and sustainable response

Identify repetitive operational tasks,their actual frequency,time,interruptions and error exposure. Separate necessary expert decisions from automatable steps. Rank improvements by measurable impact,implementation effort,maintenance burden and permission boundary. Do not prescribe a universal percentage cap or reassign real staff automatically. A script that moves effort to another team is not proven toil reduction.

Review alert actionability,ownership,runbook usability and response load. A proposed rota or notification route is not consent to contact people or change on-call schedules. Validate routing/delivery only within applicable authority. Track improvement with comparable before/after evidence;avoid claiming causation from one quiet week.

## Incident learning

During an active incident follow the actual incident command and evidence process. Distinguish observation,hypothesis,mitigation,root-cause confidence and unresolved contributing factors. Afterward prepare a factual timeline with time/source uncertainty,user impact,what helped or hindered recovery and concrete owned actions. Avoid personal blame and unsupported causal certainty.

Each remediation needs a mechanism to verify closure,not just a completed ticket. Reuse infrastructure and recovery workflows for actual changes/exercises. Report proposals,executed checks,remaining operating risks and responsible decisions. No package parser or library store trial proves production reliability.
