# Storage administration

## Identify the data and allocation path

Resolve the affected application path to its actual filesystem,volume,device or managed storage service. Record host/account,namespace,mount identity,filesystem/version,encryption,key access and owner. Distinguish logical volume size,filesystem capacity,allocated blocks,inodes,quota,reserved space and application-visible availability. A large directory on another mount may not explain the failing write.

Inspect relevant growth,latency,errors and workload evidence with bounded queries. Files deleted from a directory can remain allocated while processes hold them open. Snapshots,thin provisioning,replicas and remote shares can have capacity or metadata constraints beyond the visible client path. Explain the observed mechanism before proposing cleanup or expansion. Do not infer data safety from a storage device's healthy status alone.

## Capacity and retention

Separate immediate headroom from sustainable growth control. Identify the producer,retention owner,actual deletion authority and evidence-preservation obligations. Preview exact candidates when deletion is authorized;age or a temporary-looking name is not permission. Do not truncate logs,remove backups or prune package/application directories as an automatic response. Record what capacity the proposed action can actually recover and whether it addresses blocks,inodes or a different limit.

For growth or migration inspect every layer:provider/device,partition,volume manager,filesystem and application. Use supported operations for the actual versions. Never assume shrinking is supported because growing is;consider downtime,backup/recovery,metadata and encryption implications. A snapshot sharing a failed device/account is not necessarily an independent backup. Restore acceptance belongs to the recovery workflow.

## Mounts and shares

For NFS,SMB or another shared service identify server/export/share,client identity,permission mapping,protocol/security requirements and network dependencies. Keep credentials in approved controlled references,not command arguments,public plans or mount-table exports. A successful mount does not prove intended ownership,read/write semantics,locking or application behavior.

Review persistent mount/automount configuration,boot ordering,timeouts and unavailable-peer behavior against the actual workload. Options that allow boot to continue can also let an application write into an unmounted local directory;prevent that failure through the correct service dependency and validation. Do not run a broad mount-all command as a harmless syntax check. Activation and reboot tests require applicable authority.

## Change and evidence

Prepare exact layer targets,capacity/data assumptions,supported commands,stop conditions and a recoverable rollback/migration plan. Reconcile partial resizes or uncertain remote operations before retrying. After authorized work verify allocation,mount identity,permissions and representative application I/O,then observe relevant headroom or latency. Report persistence,reboot,failover and workload limits that remain untested.
