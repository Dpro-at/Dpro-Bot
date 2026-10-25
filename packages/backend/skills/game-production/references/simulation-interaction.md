# Simulation and interaction

Start with the engine's update/physics lifecycle and the existing entity/scene ownership. Read the project's pinned version and relevant official documentation before selecting callbacks or physics APIs. Do not manually integrate a body in a way that fights the engine's physics solver.

## Time and state

Distinguish real elapsed time, simulation time, paused time and visual interpolation. Apply time scaling once at the intended layer. A movement value may be distance per second while an impulse is already an instantaneous change; multiplying both by delta time can alter the intended physics. Verify the engine's actual units and API semantics.

For a fixed-step loop, bound catch-up work and define the policy when the process falls behind. Otherwise a long frame can trigger unbounded simulation work. Rendering between simulation states should not advance cooldowns, spend inventory or emit damage again. If deterministic replay is required, identify random seeds, input ordering and other nondeterministic sources; a seeded generator alone does not make a physics engine deterministic across platforms.

Represent meaningful gameplay modes with explicit transitions: active, stunned, dead, paused or another domain-appropriate set. Define which inputs and effects are allowed in each state. Avoid independent flags that permit impossible combinations. Clear owned timers/subscriptions on despawn or scene change so old objects cannot act on a new session.

## Input and focus

Use the existing action mapping for keyboard, pointer, touch and controller where supported. Define pressed/held/released semantics and the conditions for buffering or coyote time if the mechanic needs them. Test focus loss, pause/menu entry, reconnect and remapping. UI navigation and gameplay input should not accidentally trigger the same action twice.

## Collision and feedback

Name collision layers/masks and authoritative contact handling. Test repeated contact callbacks, fast motion and spawn overlap under the actual engine settings. A projectile should not apply damage twice because multiple colliders report the same intended hit. Bound invulnerability windows and effect ownership where the mechanic requires them.

Connect player action to understandable feedback through animation, sound, UI or camera. Preserve readable silhouettes and actionable warnings. Screen shake and flashes need appropriate comfort controls; extra polish cannot repair unclear rules or unresponsive input. Test camera limits and occlusion in the real level rather than only a blank scene.

## Verification

Compare the relevant behavior at representative frame rates and pause/resume boundaries. Use headless tests for rule invariants where possible and actual play for input/feel. Record device, build and engine versions. Do not declare all movement frame-rate independent from one arithmetic example.
