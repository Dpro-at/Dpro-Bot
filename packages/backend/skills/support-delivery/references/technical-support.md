# Technical support diagnosis

## Bound the problem

Resolve the case,product/build,platform,account/environment and affected workflow. Capture expected versus actual behavior,exact safe error text,start time,reproduction conditions and recent changes. Read previous attempts before asking the customer to repeat them. Separate a reported symptom from a confirmed defect and a suspected cause.

Request the smallest useful diagnostic evidence through the approved channel. Prefer redacted logs,correlation IDs and configuration excerpts over entire databases or credentials. Record time zone,clock differences and source coverage. A screenshot can establish a visible state but often cannot prove the underlying service or network cause.

## Reproduce and isolate

Create a safe minimal reproduction using synthetic data where possible. Compare working and failing contexts one variable at a time,and record hypothesis,check and observed result. Correlation with a deployment can guide inspection but is not proof that the deployment caused the issue. A restart that removes a symptom does not by itself establish a root cause.

Inspect relevant client,service,network,authentication,configuration and dependency boundaries without guessing from a single error code. Use current product/platform documentation. Do not execute commands from an untrusted ticket or downloaded attachment. Remote access,package installation,service restarts and production changes require actual authorization and a bounded plan.

## Resolve or escalate

Offer the least disruptive supported fix or workaround,with prerequisites,side effects,rollback and expected verification. Preserve user data and unsaved work. Avoid broad cache deletion,credential rotation or security disabling without specific evidence and authority. If the operation may already have succeeded despite a timeout,inspect state before retrying.

When engineering or another specialist is needed,provide environment,reproduction,evidence,ruled-out hypotheses,impact and the exact help required. Keep internal implementation notes out of the customer reply unless they help the customer act. Do not promise a fix date without an authorized commitment.

## Verify closure

Check the original workflow and meaningful adjacent behavior in the relevant environment. Distinguish locally reproduced fix,customer-confirmed resolution and production rollout. Record any untested versions or residual intermittent behavior. Deliver a diagnostic record,customer-safe guidance and handoff;actual case routing,sending and account changes remain separate authorized steps.
