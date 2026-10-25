---
name: game-production
description: Develop and verify a playable game feature in the existing engine, including simulation, input, state, assets and target performance. Use for gameplay slices, save/load, level interactions and game debugging.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; uses installed project runtimes and available tools without mandatory vendor services.
metadata:
  agent-player:
    version: 1.0.0
---

# Game production

Deliver a playable behavior with a clear starting state, player action, feedback and outcome. Work in the existing engine and version. A static scene or compiling script does not demonstrate a playable loop, frame-rate independence, reliable saves or target-device performance.

Read [Runtime contract](references/runtime-contract.md) in a new host. Inspect the relevant game subproject, version metadata, scene/state organization, input actions and existing test/build path. Do not identify an engine from a generic language file alone or migrate a project because a tutorial uses another engine. When no engine is chosen, proceed with engine-independent design and resolve the material choice before generating incompatible project files.

## Define the slice

Use [Playable slice brief](assets/playable-slice.md) to name the player goal, controls, core loop, success/failure/restart, target platform and performance budget. Keep the first slice small enough to verify. Distinguish requested gameplay from optional polish. Preserve existing art direction and licensed assets; generated or placeholder art should be labeled and cannot imply distribution rights.

Read [Simulation and interaction](references/simulation-interaction.md) for movement, state, collision, camera and input. Read [Persistence and networking](references/persistence-networking.md) when progress survives a session or clients share a world. Read [Content and performance](references/content-performance.md) for assets, levels, profiling and packaging.

## Implement and observe

Reuse the current scene/entity/component conventions and actual engine APIs for the pinned version. Keep important rules visible and testable: one damage application, valid state transitions, bounded spawning or a saved inventory invariant. Use the installed runtime and official engine documentation to confirm version-sensitive behavior; do not invent nodes, properties or editor commands.

Separate simulation state from presentation where it improves correctness. Visual interpolation should not create extra gameplay effects. Treat input as intentional actions with appropriate device/focus behavior rather than hard-coded keys scattered through entities. Preserve accessibility preferences relevant to the feature, including remapping, reduced camera motion and readable feedback.

## Verify the loop

Run the relevant automated checks when available, then play the changed path in the intended runtime. Include start, core action, failure, restart and any save/reload transition. Use [Playtest receipt](assets/playtest-receipt.md). A headless logic fixture can test an invariant but cannot judge visual readability, feel, audio balance or controller usability.

Measure performance in the representative scene and target configuration; diagnose CPU, GPU, allocation, draw or loading cost before optimizing. Development-editor FPS is not a packaged target-device result. Do not claim networking or crash durability from a single local session.

## Deliver

State what is playable, controls, actual tests/builds, asset provenance and remaining target acceptance. Packaging and publication are separate outcomes. No engine/model installation, store upload, paid asset service or public release is implied by this skill. [Acceptance briefs](references/acceptance.md) define realistic future trials. [Design notes](references/design-notes.md) record comparison scope.
