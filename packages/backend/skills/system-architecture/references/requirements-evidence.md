# Requirements and evidence

Define the decision before collecting a technology catalog. Name the affected user outcome and the boundary under review. Inventory facts from actual code, configuration, contracts, incidents and permitted telemetry. Record source/revision/time and confidence. A README claim or remembered stack may not match the deployed path.

## Quality scenarios

For a material requirement, specify stimulus, environment, affected operation, expected response and observable measure. Examples include a burst of authorized imports with a bounded queue age, a dependency failure with preserved edits, or a revoked membership preventing a later write. Use the owner's real targets; do not manufacture universal latency or uptime numbers.

Identify the consequence of failure and distinguish availability, data durability, consistency, confidentiality, recovery and user experience. A service can be available while returning stale or unauthorized content. A retry can improve completion while increasing duplicate effects. Make the required semantics explicit.

## Capacity reasoning

Start from estimated active users, request/event rates, payload sizes, retention and peak shape. Show units and assumptions. Approximate storage from volume and retention, then account for indexes, replicas, backups and working space where relevant. Approximate concurrency from arrival rate and service time only under the stated steady-state assumptions; a burst or queue can violate them.

Use ranges and sensitivity analysis where inputs are uncertain. Identify a bottleneck hypothesis and how to measure it. Do not use one synthetic benchmark as a deployment sizing guarantee. Team expertise, operational access, cost budget and delivery horizon are constraints as real as throughput.

## Evidence gaps

Classify unknowns by decision impact. A missing minor implementation detail need not block a design; an unknown authority owner or impossible recovery promise can invalidate the architecture. Ask or record the specific decision needed while finishing independent parts. Avoid filling gaps with a vendor default.

Separate exploratory examples, measured prototypes and accepted operational evidence. Keep private telemetry and credentials out of portable architecture records. Document the narrow conclusion each piece of evidence supports and what it does not establish.
