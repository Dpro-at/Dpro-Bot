# Network administration and path diagnosis

## Specify the conversation

Define source host/interface or client network, destination name/address, protocol, port, expected route and symptom/time. Identify the relevant network namespace, IPv4/IPv6 path, local manager, upstream device/cloud ownership and actual action scope. Avoid broad scans or public-resolver queries when a targeted permitted observation answers the question. Keep private names, captures and topology within the approved boundary.

## Layered evidence

Inspect link/address, route/policy routing, neighbor resolution, local listener, resolver view and the application transaction as relevant. A failed ping does not prove the application is unreachable; ICMP can be filtered. A successful TCP handshake does not establish authentication, TLS identity or application success. UDP probes often cannot establish service availability without a valid protocol response. DNS differences can reflect intended split views, search domains, hosts files or cache state rather than a broken public zone.

Follow the actual forward and return path. Review VLAN/bond/bridge membership, routing tables, tunnels, NAT, filters and upstream dependencies only where evidence points. Inspect MTU/path-MTU behavior and counters before choosing a lower number. Time synchronization affects certificates and distributed evidence; diagnose source/offset/state before a time step that may disrupt workloads. Do not force time changes from a read-only health request.

## Persistent host changes

Detect whether NetworkManager, systemd-networkd, Netplan, legacy scripts or another controller owns the connection. Use its supported validation and version-specific activation/rollback mechanism. Not every Debian-family host uses the same manager, and not every remote change can be reversed by a shell timeout.

Before altering the management path, identify the live connection and capture its prior runtime/persistent state. Require the applicable authority and a viable independent rescue path or supported recovery mechanism appropriate to the change. A second session through the same route can fail simultaneously. Do not schedule a destructive interface-down command as a purported rollback. Validate the candidate before activation and change one layer at a time.

For an authorized change keep the old access path until a fresh connection from the intended client path and relevant business traffic succeed. Check both address families if in scope. Confirm persistent configuration matches the intended state; a runtime route can disappear after reboot. Reboot tests need their own disruption authority and must not be claimed from static files alone.

## Network devices and cloud boundaries

For switches, routers or firewalls establish vendor/model/software, running versus candidate/startup configuration, management plane and existing commit/rollback process. Do not apply Linux host commands to an appliance. Review exact interfaces, address ranges, ACL/NAT/routing consequences and HA dependencies; obtain current official vendor syntax before proposing concrete commands. Remote cloud route/firewall controls retain cloud account identity and cost/security authority.

## Deliverable

Provide a path map, observed failing layer, evidence/hypothesis distinction, targeted configuration diff and safe execution/rollback sequence. After authorized work recheck the actual path and application outcome. Report unresolved upstream ownership or unavailable captures without claiming that a local change repaired the entire network.
