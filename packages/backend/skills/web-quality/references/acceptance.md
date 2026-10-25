# QA acceptance

| Scenario | Successful verification | Failure of the QA process |
|---|---|---|
| Server responds but save fails | Persisted readback reveals the failure. | HTTP200 or a click is called a pass. |
| Existing running server | Assigned runtime is reused. | An unnecessary second server changes the target. |
| Persistent event stream | Readiness uses a relevant state condition. | Endless network-idle wait. |
| Ambiguous selector | Current rendered context narrows the match. | Blind retries click unrelated controls. |
| Lost response | Outcome is reconciled or remains unknown. | Consequential write automatically repeats. |
| Missing capability | Case is blocked with a concrete reason. | A fabricated screenshot or pass receipt. |

Compare expected and observed behavior, read the cited evidence and check whether the chosen cases cover the changed risk. Mechanical receipt validation is necessary only when using that format and is never sufficient to establish application correctness.
