---
name: mobile-delivery
description: Implement and verify mobile application features in the existing iOS, Android or cross-platform stack, accounting for lifecycle, device state, connectivity and platform capabilities.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; actual device, browser, audio and external capabilities depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Mobile delivery

Deliver a usable feature in the project's actual mobile runtime. Start with its platform targets, installed toolchain, pinned dependencies, navigation and state ownership. A responsive browser page is not automatically a native mobile implementation, and a simulator screenshot is not target-device acceptance.

Read [Runtime contract](references/runtime-contract.md) in a new host. Maintained source and reports remain English. Inspect repository instructions, project manifests, lockfiles, build flavors, current screen, permission handlers and tests. Preserve the existing stack unless migration is explicitly part of the assignment. Do not install an SDK, boot a new service, change signing or upload a build merely to make progress appear complete.

## Define the mobile outcome

Use [Feature and device contract](assets/feature-device-contract.md). Describe the user action, data/effect boundary, supported device/OS range, input/accessibility needs and offline promise. Identify capabilities that require a native permission, background entitlement or external account. Reuse existing components, navigation and service adapters.

Read [Lifecycle and restoration](references/lifecycle-restoration.md) for state that crosses foreground, background or process death. Read [Connectivity and data](references/connectivity-data.md) when cached reads or deferred writes are involved. Read [Platform interaction](references/platform-interaction.md) for permissions, deep links, layout, keyboard, media and device features.

## Implement through the existing path

Tie screen state and asynchronous work to the current account, object and lifecycle owner. Keep business authority in the service boundary. A local cache or hidden button cannot grant permission. Represent pending, cached, rejected, expired and confirmed data truthfully rather than labeling all local writes as synchronized.

Use the installed framework's lifecycle and resource ownership mechanisms. Check version-sensitive APIs against current official documentation for that pinned environment. Native platform requirements differ; do not copy an Android callback into iOS semantics or assume a plugin exposes every native behavior.

## Verify the relevant environments

Read [Device validation](references/device-validation.md). Select meaningful tests for logic, platform adapter, state restoration, connected UI and actual device behavior. Include the interrupted/resumed path when lifecycle affects correctness, and use synthetic accounts/data for stateful checks.

A mocked network flag is not a verified radio/network outage; an overridden status icon is not an offline test. Record how connectivity was actually controlled. A simulator can verify many flows but cannot establish real camera, battery, background scheduling or low-end performance behavior.

## Deliver

Use [Mobile receipt](assets/mobile-receipt.md) to distinguish source implemented, build passed, simulator observed, device observed and store/installed acceptance. Preserve credentials/signing keys and unrelated user data. Packaging, store submission and recurring background activation retain their own authorization. [Acceptance briefs](references/acceptance.md) are future behavioral tasks. [Design notes](references/design-notes.md) state source comparison and limitations.
