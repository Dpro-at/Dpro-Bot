# Windows administration

## Context and supported tools

Identify exact host/environment,Windows edition/build,domain or workgroup,installed roles,PowerShell edition/version,remoting endpoint and execution identity. Module support differs across Windows PowerShell and PowerShell editions;consult actual installed help and current Microsoft documentation. Do not assume modules are present or install them to make a proposed check run.

Use supplied evidence or authorized scoped inspection. Bound event-log channels,IDs,time and output rather than exporting every security record. Preserve diagnostic and incident evidence;do not clear logs as cleanup. Keep credentials,recovery keys,registry secrets and private directory attributes out of reusable artifacts and logs. A secure-string input does not make every subsequent use or export safe.

## Services,tasks and maintenance

Resolve service identity,dependencies,start mode,current process,configured executable and relevant failure events. Distinguish an installed/enabled definition,a started process and working application behavior. For scheduled tasks inspect principal,trigger,action,working directory,overlap policy and last result. A SYSTEM task creates lasting privilege and must not follow from merely drafting a maintenance plan.

Review update source,applicability,cluster/workload dependencies,available capacity,maintenance window,reboot requirements and rollback/recovery limits. Do not perform broad auto-reboot patching from a health check. Remote session loss can mean an accepted reboot or partially completed update;reconcile target state before retrying.

Use PowerShell object properties and explicit target IDs rather than parsing display tables when writing automation. Review error handling:non-terminating errors can leave a script continuing with partial results. For commands supporting ShouldProcess,WhatIf can preview intended actions,but it is not universal transaction simulation or proof that a real run is authorized/successful. Check actual command support;do not assume a preview suppresses every custom helper's side effects.

## IIS and directory scope

For IIS inspect site/application pool identity,bindings/SNI,certificate reference,physical path,runtime compatibility,logs and request behavior. Use the web-hosting mode for request-path diagnosis. Recycling a pool is disruptive and is not a universal repair for 503s.

For Active Directory identify the actual forest/domain,object stable identity,OU,group scope,replication context and authority. Account creation,password reset,group membership,GPO changes and domain-controller promotion have different consequences;never infer permission for all from administrator credentials. Review resultant policy and replication evidence rather than claiming immediate fleet-wide effect. Do not create a forest,disable protections or grant broad group membership as a convenience.

## Change and verification

Prepare a minimal diff,actual supported command sequence,data/access/availability effects and independent recovery path. Record which previews or observations ran and preserve actual error status. If execution is authorized re-read the exact target and relevant client behavior,then state remaining reboot,replication,failover or production acceptance. Cross-platform documentation is preparation;it is not a Windows runtime test on a macOS host.
