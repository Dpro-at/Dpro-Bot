# Encryption and key lifecycle

## Define the security objective

Identify which data or transaction needs confidentiality, integrity, authenticity or key establishment, against which attacker and for how long. Map actual cryptographic uses and boundaries: transport, stored records, backups, tokens, signatures and application secrets. Storage-layer encryption may protect stolen media while leaving data exposed to an authorized or compromised application. Specify what the proposed layer can and cannot protect.

Distinguish passwords, API credentials, encryption keys, signing keys, certificates and public verification material. They have different handling and recovery properties. Do not substitute reversible encryption for an appropriate password-verification design or invent a new primitive to avoid a maintained library.

## Review the implementation boundary

Use maintained, supported cryptographic interfaces appropriate to the platform and current requirements. Verify exact library/version and protocol context before recommending parameters. Understand authenticated-encryption boundaries, associated data, nonce/IV requirements, randomness and error handling. Algorithm choice alone does not prove correct integration; repeated nonces, missing authentication or exposed keys can defeat intended protection.

For envelope designs map data keys, wrapping keys, access roles and key-version metadata. Keep cryptographic operations and key custody within the intended platform boundary where practical. Record who can decrypt, administer policy, export material or destroy versions. A key vault's presence does not prove separation of duties or appropriate effective grants.

## Design lifecycle and recovery

Define generation, provisioning, use, audit, rotation, compromise handling, retirement and destruction. Track key identifiers and versions without recording secret values. Rotation must distinguish future encryption, rewrapping existing data keys, re-encrypting data and retaining old versions for necessary reads/backups. Changing an alias does not automatically migrate all ciphertext.

Plan for lost access, service outage, region/account failure and emergency recovery. Validate restore with the actual required historical key versions in an isolated environment. Do not destroy a key because it is old before understanding encrypted backups, legal holds and archival signatures. Separate retired encryption use from retained decryption/verification obligations.

## Validate and hand off

Use synthetic data for round-trip, tamper rejection, wrong-context/key behavior and version-transition tests. Check error paths and avoid leaking sensitive material through logs, crash reports or temporary files. Managed runtime memory clearing is best effort unless a supported lower-level mechanism and actual evidence establish more. Do not claim reliable zeroization from assigning null.

Deliver a lifecycle record, concrete integration findings and a migration/recovery plan with decision owners. Live rotation, revocation, export, key deletion or provider policy changes require their actual authorization. No algorithm/parameter list in this package overrides current platform guidance or specialized requirements, and no written review certifies cryptographic implementation security.
