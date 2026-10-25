# Quality, lineage and remediation

## Useful lineage

Start from the business decision or sensitive dataset and trace the relevant upstream/downstream path. Label whether each edge is declared, parsed from code or observed at runtime. Dynamic SQL, spreadsheets, exports and separately managed tools can fall outside automated coverage. Represent unknown edges as unknown instead of declaring that no dependency exists.

Record transformation/version and dataset identity at the level needed for impact analysis. A table-level edge may not explain a changed field definition. Column lineage is useful when supported by actual evidence; do not fabricate detail because a diagram looks more complete with it.

## Quality tied to use

For each check, specify the property, measured population, expected rule, threshold rationale, cadence, owner and response. Uniqueness should use the intended business key, not only a generated identifier. Completeness should distinguish required versus optional fields. Timeliness should use the time basis the consumer needs rather than only job execution time.

Reconciliation must compare compatible scopes and units. A complete row count can conceal incorrect identities or inflated measures. A composite score can hide a critical missing field, so keep decisive failures visible. Thresholds should follow business consequence and evidence, not arbitrary percentages copied into every dataset.

## Remediation and incidents

Capture detected condition, affected period, consumers, scope, owner, containment, correction plan and verification. Preserve uncertainty when the affected population cannot yet be bounded. Correcting the current table may not repair already exported reports; identify downstream follow-up where relevant.

Differentiate a quality alert, an investigated incident, a resolved cause and a verified repaired consumer. A closed ticket is not proof of corrected data. Use actual observations and record what remains outside coverage.
