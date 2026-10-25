# Platform interaction

Work from the current screen and native capability contract. Keep the application's navigation hierarchy and design system coherent rather than wrapping an unrelated web layout in a mobile shell.

## Navigation and links

Identify the entrypoint, back behavior and restoration route. Deep links and notification targets are untrusted inputs: validate scheme/host/path/parameters according to the actual app contract, resolve object IDs under the current principal and wait for authentication/navigation readiness. A valid-looking link must not bypass access checks or open a stale object from a previous account.

Test cold start, warm start, denied access, missing object and repeated link delivery where relevant. Preserve an understandable recovery route when authentication or target loading fails. Do not open an external URL merely because a pushed payload asks for it.

## Permissions and device features

Use the current platform permission model and existing rationale UX. Request the minimum capability at the moment it is meaningful. Handle not-yet-asked, granted, denied, permanently restricted and later-revoked states as the platform supports them. A permission response can become stale before resource use; handle actual access errors too.

For camera, microphone, location, files and media, define session ownership, cleanup and private-data handling. Test unavailable hardware and interruption where the feature needs it. Simulator stubs are useful for UI behavior but cannot establish real hardware quality or background access. Do not add a new entitlement or telemetry service without task justification and applicable authorization.

## Layout and accessibility

Check safe areas/insets, keyboard appearance, orientation or window resizing where supported, long text and localization. Avoid fixed screen coordinates as the main interaction contract. Preserve semantic labels, focus/navigation order, text scaling and relevant screen-reader feedback. Touchable controls need usable target geometry under the product/platform guidance; a screenshot cannot verify assistive interaction.

Respect reduced motion, contrast and the supported theme. Test action feedback at the actual input device, including interrupted gestures or duplicate taps for consequential commands. Accessibility and localization acceptance require the relevant target runtime, not only a source-level checklist.

## Delivery boundary

Signing, provisioning, store privacy declarations and submission requirements are platform/version specific. Inspect current official requirements when those tasks are assigned. This package prepares implementation and verification decisions; it does not upload binaries or make external policy assertions from a remembered checklist.
