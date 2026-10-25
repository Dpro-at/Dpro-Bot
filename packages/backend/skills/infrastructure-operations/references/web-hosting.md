# Web hosting administration

## Map one intended request

Identify the domain,public/private environment,listener/address family,TLS endpoint,virtual host or site,reverse-proxy hops,application pool/runtime,document root or artifact and backend dependencies. Read the actual active configuration and service/version layout. Do not impose a particular Nginx/Apache/PHP/Node/IIS chain or distribution path on an existing host.

For diagnosis record the reproducible request,time,expected response and actual status/body behavior without exposing sessions or private data. Trace the first failing hop with relevant bounded logs,listeners,sockets and application evidence. A 502 can involve upstream availability,protocol,socket access,timeouts or application failure;restarting every service is not causal diagnosis.

## Site and tenant boundaries

Check hostname/SNI/binding selection,document-root ownership,service identity,filesystem permissions and isolation between sites. Distinguish CLI runtime from the actual worker serving requests. Keep private configuration,uploads,source maps,debug endpoints and secrets out of public roots. Review forwarded host/protocol/client identity and trust only the actual proxy boundary. Do not weaken certificate validation or disable access controls to make a probe succeed.

For TLS inspect intended hostname,certificate chain,expiry and actual endpoint within authorized query scope. DNS answers and successful TCP connections do not prove HTTPS routing or certificate correctness. Certificate issuance/renewal can contact services and alter public validation records;follow the actual authority and provider workflow.

## Minimal change and activation

Reuse existing deployment ownership,artifact layout and configuration conventions. Prepare a focused candidate and validate syntax using the installed daemon/tool. A config test may access referenced files and does not automatically establish live behavior. Determine whether the affected layer needs reload,worker replacement or restart;preserve connection/drain and downtime assumptions. Do not patch runtimes or install modules without applicable installation/maintenance authority.

For runtime updates review supported compatibility,extensions,application dependencies,capacity and rollback artifact/data constraints. Worker tuning needs measured request/memory/queue behavior,not a universal memory formula. A successful reload does not prove every worker adopted the intended version or that unrelated sites remain healthy.

## Verification and handoff

After authorized activation verify the intended hostname/TLS/path,dynamic behavior,required static assets and relevant authentication/API journey with approved minimal data. Check other sites sharing the changed resource proportionately. Preserve rollback configuration and distinguish proposed,applied,verified and uncertain outcomes. Publication,external probes,certificate actions and production release remain bounded by host/task authority.
