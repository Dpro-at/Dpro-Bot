# Data security

## Map data and access

Identify data categories, sensitivity, business purpose, owners and lifecycle across collection, processing, sharing, storage, analytics, backup and disposal. Trace copies in logs, exports, caches, development fixtures and vendor integrations. Do not assume all sensitive data lives in the primary database. Classification must reflect real content and context rather than a filename or table label.

Map principals, tenants and service identities to actual data operations. Inspect read, write, export, bulk search and administrative paths, including indirect access through reports or tools. Authentication, encryption and a data-retention policy solve different problems; none alone establishes appropriate use or authorization.

## Assess protection in context

Review minimization, segregation, field/object permissions, transport/storage protection, auditability and recovery. Distinguish masking, redaction, pseudonymization, anonymization and encryption by their actual reversibility and threat model. Do not describe masked display data as removed from storage or claim anonymization from dropping direct identifiers alone.

Inspect whether exports, support access and analytical joins expose more than the business purpose requires. Check access revocation and retention behavior across replicas/backups where evidence permits. A deletion request and an observed deletion receipt are distinct; legal holds and recoverability can affect disposal. Escalate legal interpretations to the responsible process rather than inventing a universal retention period.

## Verify with minimal exposure

Prefer synthetic records and permission matrices for validation. Test intended access and denied cross-user/tenant access at the effective service boundary, including list/export and background paths. Inspect redaction with representative patterns without printing real secrets. A regular expression can miss sensitive context and can falsely redact innocuous content; it is not a complete data-protection guarantee.

Review monitoring and response for unauthorized data access with event coverage, identities, timestamps and evidence retention. Alerts should have an accountable response path, not just exist in configuration. Trace how an incident would be investigated without expanding unnecessary data collection.

## Deliver and remediate

Produce a data protection map, prioritized exposure findings and a staged control plan. Include owners, specific lifecycle boundary, implementation tradeoffs and verification evidence. Coordinate access, cryptographic and privacy work without claiming they are interchangeable. Actual data migration, external uploads, bulk access changes or deletion require their current authorization. A written assessment does not certify privacy compliance or data-loss prevention effectiveness.
