# Accessibility and state review

## Semantics and keyboard

Use native controls where possible. Associate a visible label with each input. Give icon-only commands names that describe the action. Reflect selected and expanded states in supported semantics. Avoid clickable text containers where a button or link would provide keyboard behavior automatically.

Check tab order, focus visibility, Enter/Space activation and Escape behavior for dismissible UI. A modal should manage focus and return it to the initiating control; a nonmodal disclosure should not trap focus.

Do not assign ARIA roles without implementing their expected interaction. A custom listbox needs selection and arrow behavior; a simple navigation list may only need links or buttons.

## Async and editing states

A loading component should not temporarily show privileged content from a previously selected object or identity. Disable only the action that is unavailable; preserve navigation when safe. Drop stale completions or reconcile them with the current version before updating the display.

Prevent a second mutation while a consequential first mutation is unresolved. Preserve a recoverable draft after an error. Distinguish validation errors, authorization failures, stale versions and uncertain transport outcomes where the API supports that distinction.

## Language and text

Use logical spacing and direction-aware layouts. Test long labels and unbroken identifiers. Keep names readable without assuming Latin text. Format dates and numbers consistently with the product's conventions; do not reinterpret stored timestamps without a known timezone.

The package and maintained technical artifacts are English. Product localization remains a product requirement and should use the existing localization system rather than embedded ad hoc translations.

## Motion and contrast

Use the product's accessible tokens and inspect interactive states in each supported theme. Do not rely only on color to communicate error, selection or status. Respect reduced-motion settings and avoid animation that hides the result of an action.

Automated checks can identify some problems, but a passing tool cannot certify the entire interaction. Record what was actually examined.
