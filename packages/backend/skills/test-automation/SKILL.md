---
name: test-automation
description: Build and maintain meaningful automated tests in the existing runner, choosing the correct boundary, isolated fixtures, useful assertions and diagnosable execution. Use for regression harnesses, suite reliability and CI test improvements.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; actual device, browser, audio and external capabilities depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Test automation

Create tests that can distinguish a real regression from a working implementation. Begin with a user-visible behavior or system invariant and the existing runner. Avoid a new framework, brittle text assertions or large suites that merely restate implementation details.

Read [Runtime contract](references/runtime-contract.md) in a new host. Inspect project test commands, fixtures, recent changes, failure reports and environment ownership. Preserve the existing QA acceptance process; automation supports it rather than replacing human/visual/target evaluation.

## Select the boundary

Read [Test design](references/test-design.md). Name the failure the test should catch and choose the cheapest layer that can observe it faithfully. A domain rule, actual database invariant, protocol contract, component interaction and connected end-to-end flow have different evidence needs. Do not enforce a universal pyramid percentage or single-layer rule when complementary checks catch different failures.

Use [Automation plan](assets/automation-plan.md) to map behavior, environment, input, oracle and effect. Reuse existing test builders and fixtures where they support isolation. Do not write a test for every reversible trivial edit merely to increase a count.

## Implement reproducible fixtures

Read [Isolation and execution](references/isolation-execution.md). Give data/resources explicit owners, use synthetic identities and scope cleanup. Control time/randomness where it improves determinism, but retain real concurrency/engine behavior when that is the subject of the test. A mock that returns the desired answer cannot verify the dependency seam.

Assert observable outcomes and meaningful absence of unintended effects. Verify a durable mutation with readback or the actual receipt, not a disappeared spinner. Protect secrets and user data. Never reset the owner's database or install new tools to simplify a test without authorization.

## Diagnose instability

Read [Reliability and CI](references/reliability-ci.md). Preserve first-failure evidence and distinguish application races, test races, shared state, environment/resource problems and genuine external variability. Retries may gather information under a bound; they do not erase the failure. Do not declare success from the last green attempt alone.

## Deliver evidence

Use [Execution receipt](assets/execution-receipt.md). Record actual command, runtime, fixture, test result, retry/skip state and remaining acceptance. Run focused checks appropriate to the change, then broaden only when failures or unresolved concerns justify it. Written scenarios and discovered packages are not executed application tests.

[Acceptance briefs](references/acceptance.md) evaluate test usefulness. [Design notes](references/design-notes.md) record upstream scope. Native device, browser and external-service tooling depend on the host; use the assigned surface and do not bypass its restrictions.
