# Content, performance and delivery

Build a representative scene before judging the feature. A mechanic tested against one empty floor may fail in a dense level, with animated characters or under the target camera.

## Content contract

Record source/license and intended use for art, fonts, audio, shaders and plugins. Keep placeholders distinct from cleared deliverables. Agree units, orientation, pivots, collision shapes, animation naming and import scale for the engine pipeline. A visually correct imported object can still have wrong bounds, expensive materials or unusable collision.

Use existing asset conventions and import settings. Reimport through the engine and inspect animation, texture/color handling, draw cost and collision. Do not edit generated/import-cache files as the source of truth. Keep references stable where scenes depend on IDs; replacing files casually can break linked resources.

For level changes, name player route, gating, checkpoints, encounter pacing and recovery after failure. Check camera visibility, traversable collision and restart behavior. Procedural content needs seed/provenance where useful, validation for unreachable states and a bounded generation policy rather than endless retries.

## Profiling

Set a target frame budget and memory/loading constraints from the intended platform. Measure frame-time distributions and spikes in a representative build, not only average FPS. Distinguish CPU simulation, GPU rendering, allocation/collection, asset streaming and shader compilation. Optimize the measured bottleneck and remeasure the same scene/configuration.

Pooling, batching, reduced updates and lower asset detail each have tradeoffs. Pooling can retain stale state and memory; test reset/despawn behavior. Reducing tick frequency can change gameplay. Lowering texture size can affect readability. Keep a before/after receipt and avoid global quality reductions without task justification.

## Delivery

Verify the actual target build when the toolchain is available and authorized. Check startup, input, scaling, audio, save paths and essential gameplay after packaging. Web exports may have browser input/audio/storage constraints that editor play does not exercise. Native/mobile builds require the relevant installed toolchain and target-device acceptance; record absence plainly.

Deliver controls, entry scene/build command, asset provenance, observed playtest and remaining platform issues. A build archive is different from store publication or an installed release. Preserve the user's distribution and activation permissions.
