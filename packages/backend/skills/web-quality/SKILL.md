---
name: web-quality
description: Verify web application behavior through reproducible scenarios, browser observations and state readback. Use for feature acceptance, bug reproduction, regression checks and UI defect reports; not for claiming correctness from screenshots or a successful server response alone.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; use the assigned browser or installed test runner; optional Python3.10+ standard-library receipt audit.
metadata:
  agent-player:
    version: 1.0.1
---

# Web quality

Determine whether the requested behavior works, where it fails and what evidence supports that conclusion. Testing should expose uncertainty rather than turn a checklist into an automatic pass.

Read [Runtime contract](references/runtime-contract.md) in a new host. Maintain package artifacts, test code and reports in English. Do not require Python Playwright when the environment provides another authorized browser surface or an established test runner.

## 1. Establish what is under test

Identify the requested behavior, build or revision, environment, relevant user role and expected data state. Read existing acceptance criteria and recent changes. If the expected result is unclear, resolve the specific ambiguity that would change the verdict.

Locate the existing tests and runtime instructions. Reuse them before adding new infrastructure. A QA task does not require installing a browser, starting a second server or resetting user data when the necessary environment already exists.

Record whether the target is a disposable fixture, local owner workspace, staging or a shared service. Use the task's authorized scope. For destructive or consequential actions, prefer an authorized disposable environment; do not use live data merely because it is convenient.

## 2. Convert requirements into observable scenarios

Use [Scenario plan](assets/scenario-plan.md). Each scenario needs preconditions, a concrete action, an observable expected result and the data or artifact that will demonstrate it.

Prioritize scenarios by consequence and uncertainty:

- The normal path that completes the user's goal.
- A validation or empty-input case that could block ordinary use.
- A failure or stale-version condition where recovery matters.
- A permission boundary when the feature exposes privileged data or actions.
- A duplicate or uncertain request outcome for consequential mutations.
- A layout/keyboard condition relevant to the changed surface.

Do not test every combination blindly. Select cases that can distinguish a working implementation from a plausible failure. Existing focused checks may cover unchanged behavior; broaden only for a new failure or unresolved concern.

## 3. Prepare an isolated and recognizable state

Use fixture records with explicit test identities. Keep the owner and member roles distinct when testing authorization. Record the initial state needed to compare the result, including versions and assignments where relevant.

Do not print credentials, inspect browser session stores or bypass the application's intended authentication. Use the provided login/session path and authorized tools. Separate test data from genuine user content in reports and screenshots.

If a mutation cannot safely be exercised in the available environment, state that exact limitation and verify independent non-mutating behavior. A blocked mutation is not a pass or proof that the backend works.

## 4. Observe before interacting

Inspect the current rendered page or supported accessibility/DOM snapshot. Select controls by observed role, label or stable identifier. Reinspect after navigation or a significant state change; selectors guessed from old markup can test the wrong element.

Wait for the specific expected state, such as a named result, enabled action or completed request indicator. Do not make a permanent network-idle wait the universal rule: real-time applications can maintain connections indefinitely. Arbitrary sleeps should not substitute for an observable condition.

Use the browser surface assigned by the environment. Do not move to another browser or launch a separate automation session merely to evade a tool limitation. Report capability gaps accurately.

## 5. Verify the result beyond the click

For a read operation, confirm that the data belongs to the selected object and role. For a write, distinguish draft state, pending state, server confirmation and persisted readback. Reopening or re-reading the object is often necessary to establish persistence.

Check failure recovery: does the draft survive, is the message useful, can the user retry safely, and is an uncertain result reconciled before another consequential request? A spinner disappearing does not establish success.

Inspect relevant browser/runner errors when available. Correlate them with the scenario rather than reporting every unrelated warning as a new failure. An HTTP200 response can still carry the wrong data or a failed business outcome.

## 6. Review interaction and presentation

Use [Browser review](references/browser-review.md) for keyboard, focus, layout and asynchronous state checks. Exercise the actual changed controls, not merely a visual snapshot.

Inspect supported widths and themes. Check long names, empty states and visible error messages. In this workspace, the normal review widths are1280,1440,1728 and about800px; other products should use their own support targets. Restore temporary viewport or theme overrides after testing.

A screenshot records appearance at a moment. Pair it with the scenario, build and observed state. A lack of horizontal overflow does not establish readable hierarchy or accessible focus.

## 7. Diagnose and report a failure

Use [Defect report](assets/defect-report.md). Describe the smallest reliable reproduction, expected versus actual behavior, affected role/state and evidence. Separate observation from suspected cause. State whether the issue reproduced again and whether it blocks the user's goal.

Classify significance by impact: lost or incorrect data, unauthorized access, blocked primary task, recoverable functional problem or presentation issue. Do not inflate severity merely because an error appears in a console.

If asked to fix the defect, change the narrow cause, then rerun the failing scenario and the relevant neighboring regression. Do not claim a fix until the original observation changes as expected.

## 8. Maintain an honest execution receipt

Record pass, fail, blocked or not-run for each planned case. Preserve actual observations and evidence references. Read [Receipt format](references/receipt-format.md) if using the optional `scripts/audit_receipt.py` helper.

The helper checks that receipts have meaningful fields and that relative evidence files exist under the supplied root. It cannot tell whether a screenshot proves the claim or whether a test was honestly executed. Inspect evidence substantively before accepting the result.

Do not manufacture pass receipts to satisfy an audit. In a Markdown-only host, maintain the same information manually. Keep untested parts explicitly open.

## 9. Close the verification loop

Report the user-visible outcome, tested build, principal checks, real failures and material limitations. Explain what was restored or left as a test artifact. Preserve a short handoff for unfinished work in the project's established location.

Use [QA acceptance](references/acceptance.md) to review the test effort itself. A focused, reproducible finding is more useful than a long list of unsupported passes.

## Design reference

[Design notes](references/design-notes.md) identify the reviewed upstream reference and the scope of the comparison.
