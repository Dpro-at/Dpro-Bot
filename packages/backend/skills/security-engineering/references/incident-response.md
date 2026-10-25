# Security incident response

## Establish the incident context

Record incident identifier,time zone,detection source,current impact and known evidence. Distinguish a security alert,suspected incident and confirmed compromise. Use the organization's severity and escalation criteria;do not assign outage-based severity to every confidentiality incident. Identify the incident lead,technical responders,communications owner and legal/privacy contacts without silently paging or assigning people.

Separate observations,hypotheses and decisions in a timestamped timeline. Record clock skew,source coverage and conflicting reports. An absence of alerts may reflect telemetry gaps rather than absence of activity. Keep operational restoration and evidence preservation visible as distinct objectives.

## Investigate and choose containment

Determine affected assets,identities,data and likely entry/impact paths from authorized evidence. Bound queries to the case and collect minimally necessary artifacts with source/time/integrity context. Avoid overwriting volatile evidence or triggering destructive cleanup before understanding forensic needs and the incident owner's direction.

Propose proportionate containment options with expected benefit,availability impact,evidence risk,dependencies and rollback. Isolating a host,revoking credentials,blocking traffic and disabling a service have different effects. Active containment follows actual incident authority;the skill does not authorize executing every plausible response. If a command times out,inspect actual state before repeating it.

## Recover and communicate

Track actual actions and outcomes with owners. Validate recovery using business/service behavior and relevant security checks,not a green dashboard alone. Distinguish service restored,containment achieved,eradication assessed and monitoring complete. A restarted process does not prove the attack path is closed.

Prepare factual internal/customer updates with confirmed impact,current actions,unknowns and next update time. External notification,regulator contact and customer messages follow the responsible authorized process and current applicable requirements. Do not invent legal deadlines or claim that every incident requires notification.

## Learn and close

Reconstruct the timeline and contributing conditions from evidence. Allow multiple causes and unresolved questions instead of forcing five answers to a single root-cause chain. Produce accountable improvements with owners,priority and verification. Close only against actual incident criteria,retaining evidence per policy. This package does not run live response or establish that a system is clean.
