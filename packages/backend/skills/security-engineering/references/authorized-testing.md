# Authorized penetration testing

## Establish rules of engagement

Before active testing, obtain an unambiguous owner-authorized scope: exact assets and environments, ownership/third-party limits, permitted methods, test window/time zone, source identities, rate/concurrency bounds, data handling and emergency contact/stop conditions. A public address or accessible login is not authorization. Resolve ambiguity before interacting with a target; continue offline planning while waiting.

Separate application/network/cloud testing, authenticated versus unauthenticated access, and allowed test accounts. Clarify whether scanning, exploitation, credential attacks, social engineering, persistence, availability testing or data access are permitted; never infer broad permission from the job title. This package supplies planning and reporting, not automatic offensive execution.

## Plan proportionate validation

Build a target and hypothesis matrix from the supplied architecture and observed evidence. Choose a bounded technique that can establish the control failure with the least operational impact. Prefer a sandbox, synthetic account/data and reversible demonstration. Define expected safe outcomes, monitoring and stop criteria before the test. Do not run high-load or destructive payloads to confirm a finding when a lower-impact check suffices.

Document exact tool/version/configuration and destination controls for any authorized run. Review redirects, dynamic discovery and newly found hosts so the test cannot silently expand scope. An owned domain may contain third-party services excluded from permission. Tool defaults do not override rate limits, authentication boundaries or production safety requirements.

## Execute only the permitted plan

Stay within actual scope and stop on unexpected data, instability, lateral access or ambiguous authorization. Capture minimal redacted evidence sufficient to establish the result. Do not retain real credentials or bulk records as proof. If a step returns uncertainty, inspect state before retrying; avoid repeating an action that may already have changed a target.

Describe an exploit chain only to the extent supported by observations and permission. A version fingerprint, scanner banner or isolated error is not proof of compromise. Distinguish observed access, possible escalation and untested downstream impact. Keep tool output separate from analyst conclusions.

## Report and retest

Provide findings with target/revision, permitted method, reproduction conditions, evidence, impact and practical remediation. Include tested/not-tested inventory, limitations, actual interruptions and agreed cleanup. Retesting requires its own current scope and confirms the specific remediation, not every vulnerability class. Disclosure, remediation deployment, account cleanup and evidence destruction follow their actual approved processes. No active target testing has been performed by authoring or loading this package.
