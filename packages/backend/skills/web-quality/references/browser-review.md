# Browser review

## Readiness

Wait for the result needed by the scenario. A dynamic application can be ready while streaming events continue; a static page can load while an important API request still fails. Use a relevant rendered condition and a bounded timeout.

Inspect actual roles, labels and enabled states. When a selector matches several controls, narrow it using observed context. Repeatedly clicking a guessed match can create data and hide the real problem.

## Input and navigation

Check required fields, meaningful invalid input and preservation of valid draft data after an error. Test keyboard activation for the changed flow. Confirm focus returns to a useful control after closing a modal/menu and that a nonmodal panel does not trap focus.

For list/detail screens, switch objects while data loads and verify that stale completions cannot replace the selected object's state. Check session or role changes when privileged data is involved.

## Persistence and uncertain outcomes

A local input changing is not a saved record. Re-read the object using the application's normal path or an authorized service readback. For timeouts and connection loss, distinguish a confirmed rejection from an unknown outcome.

Use documented idempotency or reconciliation before retrying a consequential action. Never issue repeated writes solely to make the UI eventually display success. Keep an uncertain outcome visible in the report.

## Layout and accessibility

Review widths, themes, long text and meaningful empty/error states. Inspect horizontal scrolling at both the page and component level. A table can have its own controlled overflow while the surrounding page remains usable.

Verify visible focus, names for icon actions, associated labels, sensible tab order and appropriate selected/expanded semantics. Use reduced-motion settings when the changed behavior contains motion. Automated accessibility output is evidence for the checks it runs, not blanket certification.

## Evidence handling

Tie screenshots, logs and readbacks to a scenario and actual build. Redact secrets and unrelated personal information before sharing evidence. Preserve enough context to reproduce the result without dumping all browser or server state.
