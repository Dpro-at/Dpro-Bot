# Test design and oracle

State the expected behavior independently of the implementation. A useful test fails when the relevant observable contract breaks and remains stable through a harmless internal refactor. Avoid assertions that only mirror the same algorithm or match generated wording.

## Choose the evidence boundary

Use a unit test for pure rules, calculations or state transitions. Use a contract test for request/response meaning and compatibility. Use the actual supported local database engine for constraints, transaction rollback or contention. Use a component test for interaction state and a connected flow for cross-layer wiring. Use physical/target tests for behavior a simulator or mock cannot establish.

The same feature can need complementary tests at different boundaries. Minimize duplication that adds no signal, but do not remove an authority check because a unit test already covered the business branch. An authorization test with only one principal cannot show cross-owner isolation.

## Fixtures and assertions

Create explicit normal and consequential negative cases. For a versioned setting, include a stale revision and verify the original value survives rejection. For an external command, include post-dispatch timeout and check replay behavior. For a collection, assert identity/order/completeness where meaningful rather than only count.

Choose an oracle from the domain contract, a trusted independent computation, known fixture outcomes or preserved before/after state. Snapshot assertions can help stable serialized/visual output but require substantive review; updating snapshots until green is not verification. A screenshot of one state does not test persistence or keyboard behavior.

For properties, define meaningful input bounds and invariants, retain the seed/failing case and shrink when the existing tool supports it. Do not generate unbounded load or invalid combinations with no useful interpretation. For compatibility, test the supported old/new forms and actual consumer behavior rather than trusting a schema diff alone.

## Test the test

When justified, make a controlled temporary defect in an isolated fixture or vary the input to show the test can detect the intended failure. Do not damage the working tree or live data. A mutation technique is optional evidence, not a mandatory tool installation. Review whether a passing test would still pass if the feature were disconnected; if so, strengthen the relevant boundary rather than adding wording checks.
