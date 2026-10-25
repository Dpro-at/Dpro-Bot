# Identity and access

## Map effective identity

Identify human,service and workload identities,identity providers,federation boundaries,local accounts and privileged management paths. Trace provisioning,authentication,authorization,session lifetime,recovery and deprovisioning. A directory membership list does not fully describe effective access across local accounts,resource policies and cached sessions.

Build an access matrix using actual business roles,resources,actions and conditions. Distinguish authentication strength from authorization scope. Review privilege elevation,delegation,service credentials,emergency access and separation of duties. A successful MFA prompt cannot justify an unrelated administrative action,and a role name does not prove least privilege.

## Review lifecycle and enforcement

Inspect joiner/mover/leaver processes,approvals,time-limited grants,inactive identities and ownership of nonhuman credentials. Check revocation across sessions,tokens,downstream applications and background workers. Do not declare termination complete from disabling one directory account if local or delegated access remains unknown.

Assess federation trust,token audience/issuer validation,account linking,recovery factors and administrative changes in the actual platform context. Use maintained provider documentation for implementation choices. Avoid recommending blanket session expiration or identity deletion without accounting for operational dependencies and recovery.

## Validate and deliver

Use synthetic principals to verify intended access,denied unauthorized access,expired/revoked credentials and privilege-change propagation where authorized. An exported policy can support review but does not prove effective enforcement. Record collection scope and unresolved group/resource intersections.

Deliver a reviewed access matrix,prioritized gaps and a staged change plan with owners,rollback and emergency-access continuity. Live grant/revocation,role assignment,account deletion or federation changes require actual authority. Keep secret material outside the report. No role template authorizes privilege escalation or certifies identity security.
