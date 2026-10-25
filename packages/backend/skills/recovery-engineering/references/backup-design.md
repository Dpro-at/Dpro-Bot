# Backup coverage and consistency

## Evidence inventory

For every recovery unit, record the actual method, source identity, capture time, consistency mechanism, format/version, storage location, retention policy owner, last successful verification and restore dependencies. Include manifests/catalogs and the mechanism for discovering the correct artifact when the primary platform is unavailable. Record missed jobs and incomplete uploads; green scheduling status is insufficient.

For databases use an engine-supported consistent backup mechanism. Explain transaction-log requirements and the continuous chain needed for point-in-time recovery. Copying an active database file without its documented consistency procedure can produce an unusable snapshot. A full-object application may need coordinated database and object-store versions; define acceptable reference consistency and reconciliation rather than assuming simultaneous timestamps.

## Isolation and retention

Assess independent copies against the selected failure domain. Separate account credentials, access boundaries and immutable or offline copies may matter when administrators or ransomware can delete ordinary replicas. Test recovery access without broadening production privileges. Immutability and retention locks can themselves have irreversible cost and deletion consequences; propose policy changes for the owner, not as an automatic repair.

Distinguish operational restore history, legal retention, archival discovery and deletion obligations. Resolve conflicting policy through the actual responsible owner and jurisdiction. Do not choose the longest imagined retention as a universal compliance rule. Track retention expiry and key lifecycle together; retaining encrypted bytes without a recoverable key does not preserve usable access.

## Integrity and secrecy

Use trusted manifests, authenticated storage and documented transfer checks where available. A hash confirms equality to the bytes represented by that hash; it does not prove those bytes are complete, consistent, uncorrupted at capture or free from compromise. Establish artifact provenance separately. Store keys in an approved secret-management process with a tested recovery path and least required access. Keep key values and protected production records out of plans, logs, skill packages and portable settings.

## Recommendation

Present current coverage, concrete gap, scenario affected, evidence, proposed control, operational dependency and owner. Prefer the existing supported platform when it can meet the accepted objective. Include restore-resource capacity, network transfer limits and provider/account availability in estimates. Avoid treating a provider's advertised feature as evidence that it is configured, retained and tested for this system.
