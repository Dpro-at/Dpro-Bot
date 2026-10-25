# Game behavioral acceptance briefs

These scenarios are prepared exercises, not evidence of executed engine or play tests.

## Existing-engine movement feature

Provide a pinned engine project with input mapping, a platform edge and pause menu. Add a requested jump/cooldown behavior. Acceptance: reuse input/state conventions, no double trigger from held input, coherent pause/focus behavior, stable relevant behavior across representative frame rates and observed restart. Inspect actual collision at the level edge.

## Versioned progress save

Provide a local inventory and an old-schema save fixture. Add one field without losing prior progress. Acceptance: bounded validation, source fixture preserved, explicit unsupported/corrupt handling, successful save/reload and an interruption/recovery check in disposable storage. No real user save overwritten.

## Representative performance regression

Provide a repeatable scene with a documented spike and target budget. Acceptance: actual profiler evidence, one justified correction, same-scene before/after results and intact gameplay. Record target/editor differences and do not call a compiler pass a performance improvement.

For online changes, additionally test wrong ownership and late messages from an earlier session under an authorized harness. No multiplayer reliability claim from a single client.
