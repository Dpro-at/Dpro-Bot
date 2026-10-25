# Verification selection

Choose checks for the changed invariant rather than a universal test count. Run existing relevant tests before adding a redundant harness. Small reversible presentation changes may need direct inspection; shared authorization or durable-write changes need meaningful regression evidence.

| Concern | Useful evidence | Insufficient substitute |
|---|---|---|
| Business transition | Inputs, resulting state and prohibited branch | Matching implementation text |
| Object/tenant authority | Actual handler with two principals and distinct objects | Button hidden in UI |
| Transaction guard | Actual local engine with competing or stale write | Stub repository returning true |
| External adapter | Valid/invalid/error/partial fixtures plus separately scoped sandbox result | One mocked success |
| Full-stack save | Observed connected action and reopened state | Screenshot before save |
| Unknown outcome | Controlled post-dispatch interruption and reconciliation | Blind retry until green |

Keep fixtures synthetic and bounded. Exercise the important negative case, not every imaginable condition. State what a test asserts and which environment it covers. If a required runtime is absent, finish static/local work and record the exact missing capability rather than installing or activating services without authorization.

A delivery receipt should include commands, relevant versions, pass/fail result, artifacts and unresolved acceptance. Never convert not-run into pass. Compare a baseline and candidate on the same meaningful task if claiming improved agent quality. Schema/discovery tests establish loading, not that a model followed the workflow.
