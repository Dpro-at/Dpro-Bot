# Host and server administration

## Establish the actual system

Identify host/VM identity, environment, operating system/version, boot/time interval, init/service manager, workload and management access. A path or process number without host/namespace/time context may identify the wrong object. Use supplied evidence or authorized target inspection; a diagnosis request does not by itself permit new remote connections, privileged access or repairs under a restrictive host policy.

Find the owner of persistent configuration and runtime state. A generated resolver file, managed unit or configuration-management output should be changed through its actual source. Detect the installed network, package and service managers rather than inferring them from a distribution family alone. Container and host namespaces may expose different mounts, processes and listeners.

## Localize a symptom

Record impact, onset, recent relevant changes and a falsifiable hypothesis. Collect the smallest evidence that distinguishes service, resource, storage, access, network or application causes. Treat access-denied or unavailable readings as unknown. Compare application execution identity/context with shell behavior; success as root is not proof the real service works.

For CPU or memory pressure, distinguish utilization, saturation, leaks, workload change and resource limits before tuning. For file errors resolve the affected mount and distinguish blocks, inodes, quotas, read-only state, I/O faults and descriptor exhaustion. A broad cleanup may erase evidence without stopping the producer. Capture relevant process/object identities, retention requirements and a supported recovery action. Do not truncate logs, recursively change permissions or kill processes simply to make a graph green.

## Service lifecycle

Read the exact unit instance, effective drop-ins, dependencies, activation sockets/timers, main process and relevant logs. Distinguish installed configuration, manager-loaded settings and the running process. systemd enablement is different from current service activation; daemon-reload rereads unit definitions, while the daemon's reload protocol may apply a different configuration layer. Consult the installed version's manual and daemon validator before proposing activation.

When authorization covers a change, prepare a minimal candidate, syntax/version checks, required drain/reload/restart behavior, disruption window and rollback copies. Do not hide an unknown activation choice behind a generic reload-or-restart command. Verify the actual intended process and fresh client behavior, then observe stability over a meaningful window. A successful control command or active state alone does not prove the application adopted the setting.

## Access, packages and maintenance

Resolve service user/group, path traversal, ownership, ACLs, mandatory access control, capabilities, namespace and mount restrictions before altering permissions. Preserve least required privilege; chmod 777, blanket sudo or disabled policy is not an explanation. Keep secrets out of command outputs and environment dumps.

For packages, inspect current source/version, repository trust, dependency impact, disk headroom and reboot/service effects. Installation/update authority is separate from inspection. Prepare pinning and rollback according to the actual manager and policy; do not run a full unattended upgrade during unrelated diagnosis. For maintenance document timing, ownership and actual persistence. Proposed timers, backups or monitoring are not activated schedules.

## Completion

Record before/after evidence, exact source/resource changes, runtime activation and client validation. Preserve unrelated work and operational evidence. If reboot persistence, production load, target access or cleanup is untested, name the limit. Server work outside a supported OS/version should produce a scoped plan or route to the appropriate specialist, not fabricated Linux commands.
