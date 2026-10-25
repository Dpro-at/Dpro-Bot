# Metric definitions and consumer contracts

A reusable metric needs a name, business purpose, numerator/denominator or aggregation, grain, eligible population, filters, units, timezone, event date, attribution rules and owner. Identify whether it is additive, semi-additive or non-additive. Keep percentage-point change distinct from relative percentage change.

For a semantic layer, inspect the actual platform's supported entities, relationships, measures and dimensions. Do not assume a successful model compile validates every downstream metric query. Test representative slices and compare the same definition against a trusted baseline. A dashboard label can hide a different filter or time basis; investigate before declaring a data discrepancy.

## Change impact

Inspect internal lineage and the known external consumer inventory. Code references alone may miss downloaded reports or separately managed BI systems. State this coverage limit. For a consumed field change, choose a transition compatible with the platform: additive field, versioned model, retained alias or coordinated consumer migration. A deprecation notice needs an owner and real migration path.

Do not apply a hardcoded waiting period as a universal rule. Let consequence, consumer ownership and the approved release process determine the window. Record which consumers were actually checked and which require confirmation. A change request does not grant production deployment rights.

## Deliverable

Provide the model contract, relevant source changes, meaningful test evidence, output samples without sensitive values, consumer impact and release status. Describe unresolved semantic choices in terms a business owner can answer. Avoid hiding an assumption in SQL while describing the output as authoritative.
