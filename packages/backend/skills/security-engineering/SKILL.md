---
name: security-engineering
description: Review application, cloud, data and cryptographic security with evidence-backed findings, explicit test authority and practical remediation verification. Use for defensive security assessments and specifically authorized penetration-test planning.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; no scanner, cloud account or external service is required for document review.
metadata:
  agent-player:
    version: 1.2.0
---
# Security engineering

Establish the system, environment, owner objective and evidence scope. Read [assessment discipline](references/assessment-discipline.md) and the relevant full workflow:

- [Application security](references/application-security.md)
- [Authorized penetration testing](references/authorized-testing.md)
- [Cloud security](references/cloud-security.md)
- [Data security](references/data-security.md)
- [Encryption and key management](references/key-management.md)

Use [the assessment record](assets/assessment-record.md), [test authorization](assets/test-authorization.md), [data protection map](assets/data-protection-map.md) and [key lifecycle record](assets/key-lifecycle.md). Prefer current maintained platform documentation for implementation details. A role template does not authorize scanning a target or changing an account.

Report evidence, attack preconditions, realistic impact, remediation and verification separately. Absence of a scanner finding does not prove absence of vulnerabilities. Do not expose secrets or embed real targets, credentials or customer data in this package. Read [future acceptance](references/acceptance.md), [design notes](references/design-notes.md) and [runtime contract](references/runtime-contract.md).

## Governance and response modes

Use [identity and access](references/identity-access.md),[incident response](references/incident-response.md),[network security](references/network-security.md),[privacy operations](references/privacy-operations.md) or [security audit](references/security-audit.md) for the requested specialty. Use the [access matrix](assets/access-matrix.md),[incident timeline](assets/incident-timeline.md),[network rule review](assets/network-rule-review.md),[privacy assessment](assets/privacy-assessment.md) and [audit workpaper](assets/audit-workpaper.md). See [additional acceptance](references/governance-acceptance.md) and [comparison](references/governance-design.md).

## Continuous security work

Use [awareness training](references/security-awareness.md),[security operations](references/security-operations.md) and [vulnerability management](references/vulnerability-management.md) for these distinct roles. Maintain the [learning scenario](assets/awareness-scenario.md),[detection case](assets/detection-case.md) or [remediation register](assets/remediation-register.md). Read [continuous-work acceptance and comparison](references/continuous-acceptance.md).
