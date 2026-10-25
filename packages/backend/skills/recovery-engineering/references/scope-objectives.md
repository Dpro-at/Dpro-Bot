# Scope and recovery objectives

## Recovery unit

Name the application boundary and its important user journey. Enumerate durable databases, transaction logs, uploads, object versions, configuration, infrastructure definitions, external account dependencies, identity metadata and required keys. Identify derived state that can be rebuilt, including its inputs and reconstruction time. Source code alone rarely reconstructs production state. A cache can be disposable while its warm-up time still matters to service recovery.

Attach an owner, sensitivity, availability dependency and current evidence to each component. Map relationships: a database may reference immutable objects; an encrypted backup needs a usable key and a permitted identity; recovery documentation must remain accessible during the selected outage. Avoid storing all recovery access inside the failed system.

## Failure scenario and objectives

Agree on the failure being addressed: accidental deletion, latent corruption, lost host, regional outage, provider-account loss or malicious compromise. Replication may reproduce deletion or corruption; availability redundancy does not automatically supply historical recovery. Isolation must address the selected failure domain, rather than merely provide another directory on the same disk.

RPO is the owner's tolerated loss of committed business state relative to the relevant incident boundary. Record the time basis, timezone and exclusions. Determine the latest validated usable recovery point, not just the latest scheduled job. A nominal hourly backup can miss its objective after a failed run or an incomplete log chain. A timestamp alone does not establish which transactions were included.

RTO is an agreed service recovery duration. Define its start and finish explicitly: detection, authorization, provisioning, transfer, decryption, restore, validation, reconciliation and traffic cutover can all contribute. Report measured phases and omitted phases. A ten-minute database import is not a ten-minute full-service recovery if identity, objects and routing remain unavailable.

Do not prescribe universal minute targets, drill cadence or retention days. Present tradeoffs in cost, isolation, recovery speed, operational effort and usable history. Have the responsible owner accept the objectives and scope. A technical finding may show a gap against a target without authorizing a more expensive architecture.

## Plan versus incident

During an active incident, follow the incident command and communications process. This package can supply recovery options and evidence; it does not grant incident authority. A rehearsal should not surprise production users or send real notifications. Record dependencies on another team's work rather than silently assigning or contacting that team.
