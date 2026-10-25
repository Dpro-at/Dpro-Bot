# Cloud security assessment

## Establish the cloud boundary

Identify provider, accounts/projects/subscriptions, regions, organization hierarchy, workload types and shared-responsibility boundaries. Clarify whether evidence is architecture, infrastructure-as-code, an export or effective deployed configuration. A secure template does not prove the live environment matches it. Use read-only scoped access where authorized and record excluded services/regions and collection time.

Map identity federation, administrative paths, workload identities, network exposure, data stores, control-plane logging and recovery dependencies. Separate provider-managed controls from customer configuration. Do not claim that a managed service removes responsibility for application access, data policy or identity lifecycle.

## Inspect effective exposure

Review grants and role trust conditions, resource policies, public endpoints, ingress/egress, storage sharing, secrets distribution and deployment permissions. Evaluate combined identity and resource policy effects rather than reading one permission document in isolation. Distinguish an allowed action from an actually reachable cross-account path, and record denied or unavailable evidence.

Assess workloads and supply-chain boundaries: image provenance, build credentials, runtime identity, metadata access and separation between deployment and application roles. Check whether logs and alerts capture relevant control/data-plane activity with retention and access suited to the risk. Enabled logging alone does not prove delivery, useful coverage or response.

For data and recovery inspect backup isolation, restoration dependencies, key access and deletion protections. Multi-region replication is not a substitute for a recovery strategy; an account-level compromise can affect replicas. Evaluate cost and availability implications before proposing broad logging, network or encryption changes.

## Plan and verify changes

Prioritize concrete attack paths and business assets. Show current/effective configuration, proposed change, dependency impact and rollback. Avoid blanket public-access or network changes that can break a legitimate service without identifying its required clients. Treat cloud API mutations, policy enforcement and key actions as separately authorized operations.

Where authorized validate in a nonproduction fixture and inspect effective behavior, including intended access and rejected unintended access. State drift, eventual consistency and unavailable organization visibility. Deliver findings and a staged plan with owners; a posture score or checklist does not certify the tenant or prove absence of compromise.
