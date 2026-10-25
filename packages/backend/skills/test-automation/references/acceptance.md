# Automation behavioral briefs

These are future evaluations, not tests executed by adding this file.

## Meaningful regression

Given a versioned update service and a known stale-write bug, add a focused test in the existing runner. Acceptance: the original bug is caught, correct behavior passes, persisted state and unrelated fields are checked, and a harmless internal rename does not break the oracle. No assertion that merely matches source text.

## Concurrent reservation

Given a supported local database fixture with one item and two actors, test the actual invariant under competing writes. Acceptance: correct maximum effect, useful loser outcome, clean teardown and no substitution of an always-serialized fake for engine behavior.

## Intermittent suite

Given first-failure logs and order-sensitive fixtures, diagnose the cause and fix the relevant ownership/wait. Acceptance: preserve original evidence, reproduce, change the cause, rerun the relevant configuration and report residual uncertainty. Increasing retries until green is insufficient.

Review test code and actual results. Do not infer suite quality from test count, coverage alone or the existence of this package.
