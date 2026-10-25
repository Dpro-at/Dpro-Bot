# Collection,transport and data handling

## Trace the actual path

Map producer/SDK or exporter,agent/collector,receivers/processors,transport,backend storage,query and visualization. Identify service/environment resource attributes and tenant boundaries. Check which components actually run,which configs they load and which routes/selectors match the workload. A collector file not referenced by a deployment is a proposal,not active collection.

Read version-specific receiver,processor,exporter and backend schemas before making a candidate. Identify authentication/TLS,endpoint identity,network egress and data residency requirements. Treat secrets as controlled references. Do not print complete environment or header dumps to troubleshoot connectivity.

## Loss,delay and resource pressure

Inspect scrape/ingest failures,export queues,retries,drops,backpressure,rate limits and storage capacity using the existing supported telemetry. An exporter accepting a batch does not necessarily prove it is queryable in the intended tenant. Follow one permitted synthetic or sanitized correlation marker through the actual path when execution is authorized;do not send real private payloads as a test.

For traces state where sampling happens and how it biases coverage. Missing spans can reflect sampling,propagation,clock skew,export loss or query scope. Logs may be rotated or expired;metrics can be stale or relabeled away. Preserve these explanations as hypotheses until evidence distinguishes them. Do not turn off sampling or raise retention globally to get one missing trace.

## Privacy and retention

Review attributes and payloads at collection,including library defaults. Prefer not collecting unnecessary sensitive fields to relying only on downstream redaction. Hashing predictable identifiers does not automatically anonymize them. Review free text,URLs,SQL bodies,headers,baggage and exception messages for the actual context. Keep access controls and purpose/retention requirements explicit without universal compliance claims.

Separate operational retention,security/audit requirements and legal holds. Apply the actual owner-approved policy and cost envelope;do not prescribe one fixed number of days for every log. A proposed lifecycle policy can delete data and requires its actual authority. Monitor telemetry cost/capacity and failure visibility proportionately.

## Change receipt

Record intended source/backend/tenant,configuration revision,activation scope and actual received/queryable evidence. Package/schema validation is useful but does not prove collection,privacy filtering or retention execution. Keep live credentials,data and raw query exports outside portable skill artifacts.
