# Cloud infrastructure and IaC

## Understand before changing

Map the resource dependency graph, existing environment boundaries and shared resources. Identify stateful services, network routes, identity relationships, quotas, capacity, billing and recovery dependencies. Recommend the smallest architecture that meets the stated requirement; do not migrate providers or add managed services without a concrete need. For a new proposal state cost assumptions and availability tradeoffs rather than inventing current prices.

Read the existing Terraform, Pulumi, CloudFormation or equivalent project and lock/version files. Reuse established modules and naming. Separate environment values and state boundaries according to the actual ownership and blast radius; identical source code across all environments is not always appropriate. Explain deliberate differences and avoid uncontrolled copy/paste divergence.

## Plan interpretation

Use supported validation and plan commands within the permitted tool/network scope. Initialization can download providers/modules and must respect installation authorization. A Terraform plan ordinarily refreshes remote information; even a preview may require real account access. Inspect create/update/delete/replace operations and their dependent effects. Check changed defaults, address changes, for_each/count identity, provider aliases and unexpected imported/manual resources.

A saved plan is sensitive material and can contain values hidden by display redaction. Protect it like state and keep it outside public artifacts. A speculative plan can become stale. Recheck source/state/target and concurrency assumptions before an authorized apply; apply the reviewed artifact only under the actual compatible tool/provider environment.

## State and data controls

Use the project's supported state backend, locking, access control and recovery procedure. Local state may be appropriate for a bounded isolated experiment; production shared state needs a deliberate durability/concurrency design. Never commit state or raw plan outputs. Do not assume a sensitive display flag removes a value from persistent files.

Treat import, move, remove and backend migration as explicit state operations with identity and backup checks. Deletion protection and lifecycle rules help but do not make every failure or removal path impossible. Review data-bearing replacement with the recovery owner and current platform documentation. Reuse a specific database/recovery workflow for engine-specific restoration rather than inventing shell recipes here.

## Deliverable

Provide resource-level diff, plan observations, dependencies, budget/capacity assumptions, data/identity exposure and the next permitted action. If no live account was queried, label estimates and proposed checks. A valid HCL file does not establish deployability, sufficient quota, least privilege or service readiness.
