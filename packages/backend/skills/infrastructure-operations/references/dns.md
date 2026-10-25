# DNS change and diagnosis

## Locate the responsible layer

Record the fully qualified name, zone, public/private view, registrar/delegation owner, authoritative provider and affected record set. Distinguish authoritative zone content from recursive cache and client behavior. A provider dashboard showing accepted configuration does not prove correct delegation or globally observed answers. Use the authorized query scope and current provider documentation for exact commands.

Inspect existing records and intended service behavior before editing. Capture type, owner, values, TTL and provider-specific proxy/alias behavior. Relative owner names, apex notation and trailing dots differ by tool. Review CNAME coexistence rules, MX/SRV priorities/targets, TXT segmentation and mail-authentication consequences as applicable. Do not overwrite a whole record set while intending to add one value.

## Plan a change

Use the DNS map template to record before/after values, dependencies, owner, observation points and rollback limits. Lowering TTL now does not shorten an already cached older TTL. Negative answers can also be cached; a newly created name may remain absent for some resolvers. Avoid promising one universal propagation deadline or repeatedly toggling records because one resolver has stale data. Retain previous values and measure time from actual authoritative publication.

For delegation or provider migration, inventory all required records, subdelegations, mail, validation and private-view dependencies. Review DNSSEC signing and parent DS continuity with the actual providers. A missing DS answer from one recursive resolver is not universal proof that disabling validation is safe. Do not automatically remove DS records or weaken DNSSEC to complete a migration; prepare a provider-supported sequence and obtain authority for the actual security/routing change.

## Validate the relevant outcome

Check syntax/provider preview if available, then authoritative answers at the expected servers, delegation and representative permitted recursive observations. Distinguish NXDOMAIN, NODATA, SERVFAIL and timeout rather than calling every failure propagation. Validate the expected service separately: an A record answer is not proof of TLS certificate, HTTP routing or mail delivery. Check both IPv4/IPv6 when both records are in scope and avoid leaking internal private names to public resolvers.

## Receipt and reversal

Record the actual zone/record identity, accepted change/version, observed authoritative result, resolver/time sampling and excluded views. Reverting values can still leave cached previous answers; rollback is not instantaneous. A deletion, nameserver cutover or public verification query must remain within host and task authorization. No global DNS or registrar action follows from merely loading this reference.
