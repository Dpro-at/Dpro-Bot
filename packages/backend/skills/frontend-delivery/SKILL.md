---
name: frontend-delivery
description: Implement or refine a real frontend flow using the existing product architecture, design system and data contracts. Use for working application interfaces, responsive states and accessible interaction; not merely a visual mockup or an unrequested redesign.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; uses the project's installed framework and available browser/test tools; no mandatory vendor SDK or external asset service.
metadata:
  agent-player:
    version: 1.1.0
---

# Frontend delivery

Build the interface the user needs to complete a task. The deliverable is working behavior with a deliberate visual hierarchy and truthful data, not a screenshot that hides missing states.

Read [Runtime contract](references/runtime-contract.md) in a new host. All maintained artifacts and code remain in English. Use the available capabilities for file inspection, editing, build and browser verification; do not assume a provider-specific browser API.

## 1. Inspect before adding

Identify the existing screen, route, navigation owner, components, tokens, state controllers and backend contracts. Read repository instructions and the user's latest design decisions. Search for an existing implementation before creating another page or source of truth.

Determine what the person is trying to accomplish, which object they are working on, the common action and the context that must remain visible. State a concrete success condition such as editing a selected item's settings without losing its list context.

Respect the product's surface. A desktop workspace, a marketing site and a mobile flow have different interaction needs. In Dpro, preserve the shared section-owned sidebar and persistent footer; avoid creating nested application navigation inside a page. Use the project's established icon and token system.

## 2. Define behavior and states

Use [Interaction contract](assets/interaction-contract.md) to identify the trigger, existing API, data shape, owner/permission boundary, pending state, success result, error recovery and persistence behavior.

Map the necessary states before styling:

- Initial or loading state with an honest indication of what is being fetched.
- Empty state that distinguishes no data from failed access or a filtered list.
- Ready state with the selected object and the relevant controls.
- Editing state with a clear save model and a recoverable draft.
- Pending mutation with duplicate submission prevented where needed.
- Success state based on confirmed data, not an assumed request outcome.
- Failure or stale-version state with a useful recovery path.
- Session/identity change that prevents stale privileged data or actions from continuing.

Do not invent API success, permission grants, prices, users or statistics to make a screen look complete. Clearly separate test fixtures from live behavior.

## 3. Plan the visual structure

Choose hierarchy, spacing, density and typography from the actual work. Use real content or representative fixtures whose limits are visible. Preserve an approved design direction; a request to improve usability is not permission to rebrand the product.

For a new visual direction, establish a small token set and one coherent composition. Use emphasis for meaning: the selected item, primary action or important change. Avoid arbitrary decorations that compete with the task.

Read [Product and visual review](references/product-review.md) when changing layout or visual language. Show a compact board or state sketch when it helps resolve a material design choice, following project rules. Do not turn routine edits into a mandatory design approval loop.

## 4. Implement with the existing architecture

Reuse state and backend controllers rather than fetching or mutating the same object through an unrelated path. Maintain version fences and request/response validation. Keep secrets out of rendered state and logs.

Treat asynchronous completion as potentially stale: verify that the component still represents the same object and session before applying a result. Clean up subscriptions and owned resources. Preserve existing permission checks in the service boundary; hiding a button is not access control.

Use semantic HTML and the project's primitives. A button performs an action; a link navigates; a label identifies an input. Keep component boundaries tied to a responsibility rather than creating a helper for every line of markup.

Avoid global CSS overrides when a scoped component rule will do. Inspect selector specificity and interaction with existing themes. Keep loading, empty and error layouts structurally stable where possible.

## 5. Make editing understandable

Choose an explicit or automatic save model appropriate to the existing product. Show pending and saved status truthfully. Protect drafts from navigation that would discard them, and offer a clear way to discard or recover changes.

A reversible local preference should not require a modal ceremony. A consequential overwrite, external action or permission expansion should retain its existing review. Do not remove backend confirmation tokens or version checks to simplify the interface.

Distinguish an unknown mutation outcome from a definite rejection. Use the API's documented idempotency/reconciliation behavior before retrying; do not automatically repeat a payment, hire, publish or install operation.

## 6. Support keyboard, language and resizing

Read [Accessibility and state review](references/accessibility-and-states.md). Check focus visibility, logical keyboard order, accessible names, selection state and error association. Restore focus after a dialog or menu closes.

Test long names, empty fields, large lists, mixed-direction text and translated labels when relevant. Use logical CSS properties for direction-sensitive spacing. Do not force all text to uppercase or truncate the only identifying information without access to the full value.

Decide pane minimums and collapse order. Check the project's supported widths and at least one narrow case; in this workspace use1280,1440,1728 and approximately800px. An inner table may need its own scroll area, but the entire application should not unintentionally overflow horizontally.

Respect light/dark themes, reduced motion and existing contrast tokens. State verification limitations if a relevant environment cannot be tested.

## 7. Verify behavior and appearance

Run checks appropriate to the change: type/build checks, focused state or contract regressions and actual interaction for the modified flow. Prefer tests that could catch a real user-visible failure over assertions mirroring implementation details.

Use the assigned browser surface. Inspect current rendered content before choosing selectors. Re-check after asynchronous transitions rather than relying on arbitrary long sleeps. A screenshot verifies appearance at one moment; it does not prove saving, permissions or keyboard behavior.

For stateful flows, test an actual successful path in an authorized disposable environment, plus the failure or stale-state case most likely to cause harm. Do not alter live user data merely to obtain a screenshot.

## 8. Review the final implementation

Compare the result to the task and existing navigation. Check that every visible control works or explains a real unavailable prerequisite. Remove duplicate entrypoints, repeated descriptions and empty decoration.

Use [Delivery review](assets/delivery-review.md) to record actual evidence. Explain what changed, the user consequence, the checks run and the relevant limitation. Do not call the entire application verified because one screen compiled.

## Acceptance

Use [Frontend acceptance](references/acceptance.md) on representative tasks. A successful implementation preserves the product's architecture, supports the required states, behaves accessibly and demonstrates the intended action through observed evidence.

## Design reference

[Design notes](references/design-notes.md) identify the reviewed upstream reference and the scope of the comparison.

## Interface design mode

For UI flows, component/state specifications and design handoff, read [Interface design](references/interface-design.md). Match the requested design or implementation scope and retain the shared product, accessibility, data-contract and verification boundaries above.
