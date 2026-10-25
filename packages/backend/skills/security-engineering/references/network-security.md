# Network security

## Model required communication

Identify assets,zones,trust boundaries,management planes and required traffic flows,including cloud,remote access,third parties and operational dependencies. Compare diagrams with available deployed rules/routes and telemetry. A VLAN label is not proof of isolation,and a private address is not inherently trusted.

Define source,destination,protocol,port,direction,identity/context where supported and business owner for each required flow. Include return traffic,stateful behavior,name resolution,time services and recovery access. Avoid a deny-all proposal that omits the dependencies needed to keep a service usable.

## Assess effective paths

Review firewalls,security groups,ACLs,routing,proxies,remote access and administrative exposure together. Rule order,implicit defaults,overlapping ranges and alternate paths can change effective access. Distinguish network reachability from application authorization and inspect both where relevant.

Examine encrypted transport and termination boundaries using actual protocol/configuration evidence. Do not infer end-to-end protection from one TLS endpoint. Review monitoring for relevant allowed/denied flows with privacy,volume,retention and response considerations. Packet capture can contain credentials or personal data;capture only under actual authorization with bounded scope.

## Validate and change safely

Start with offline policy/path review. Scanning,packet capture,traffic generation and live device changes require explicit applicable scope. For approved tests use known synthetic endpoints and bounded rates. A failed connection can result from DNS,service state,host policy or routing;it does not by itself prove a firewall rule is correct.

For proposed segmentation provide exact intended flows,dependency impact,change order,management fallback and rollback. Verify both denied undesired paths and preserved required connectivity after authorized changes. Record stale diagrams,unqueried regions or incomplete telemetry. Deliver a rule/flow matrix and prioritized findings;no written design or finite probe proves complete network isolation.
