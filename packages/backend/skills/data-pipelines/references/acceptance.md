# Behavioral acceptance

1. **Repeat batch:** Deliver the same source records twice. Accept a declared repeat policy and unchanged business state when duplicates are intended to be ignored. Reject random retry keys or inflated facts.
2. **Crash after write:** Interrupt after a durable effect but before progress acknowledgement. Accept readback/idempotent replay and a consistent final checkpoint. Reject checkpoint deletion followed by blind replay.
3. **Tied cursor:** Supply records with equal update timestamps across pages. Accept a supported tie/ordering policy and complete reconciliation. Reject max-timestamp-only progression that drops ties.
4. **Partial snapshot:** End extraction halfway. Accept incomplete status and preservation of unseen target records. Reject deleting rows because they were absent from an incomplete snapshot.
5. **Drift and quarantine:** Change a required field's type. Accept a clear stop/quarantine policy with recoverable identity. Reject silent lossy conversion to make the job pass.
6. **Lost external response:** Lose the write response. Accept target readback or retained uncertainty before another effect. Reject assuming transport failure means no effect.
7. **Bidirectional echo:** Mirror an update back to its source. Accept explicit origin/conflict handling. Reject an infinite update loop or resurrection of a tombstoned entity.

These are realistic acceptance briefs. Log actual generated artifacts, engine inputs and effects when executing them. Package parsing and host discovery do not exercise these cases.
