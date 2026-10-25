# Quality check design

## Establish the rule

Define the population before the expected condition. A required customer ID on completed orders may be optional on an anonymous draft. Record the intended grain, time period, source coverage and denominator. A null rate without population or sampling context is difficult to interpret.

| Dimension | Useful assertion | Important limit |
|---|---|---|
| Completeness | Required fields exist for eligible records | Optional blanks are not automatically defects |
| Uniqueness | Intended business key is unique at the stated grain | A generated primary key can conceal duplicate facts |
| Validity | Values meet supported format/type/domain rules | Valid format does not establish truth |
| Integrity | References and temporal intervals follow the contract | Late dimensions may need an explicit unknown state |
| Timeliness | Relevant data arrives within the actual freshness objective | A green job can ingest no useful data |
| Consistency | Equivalent definitions agree across compatible scopes | Different business meanings need separate names |
| Accuracy | Values match an appropriate authoritative baseline | A second copy of the same faulty source is not independent proof |

## Segments and thresholds

Check the slices that could change the decision: new source, event date, platform, geography or transformation version. An aggregate can hide complete failure in one small but important cohort. Compare meaningful rates and volumes. Distinguish an actual distribution shift from changed sampling or a partial extraction.

Use contractual rules for hard invariants and baseline/consequence reasoning for softer alerts. A historical observation of zero nulls does not automatically make a field universally required. A sudden change warrants investigation, not immediate rejection of every changed record. Document threshold ownership and what an alert should cause.

## Automated checks

Implement checks through the existing project/framework when authorized. Make failures diagnosable with scope, counts and protected evidence references. Avoid dumping raw private rows into ordinary logs. Distinguish tests over a fixture from tests over the current source. If a check scans only recent partitions, label that scope instead of certifying the full history.

When a test is relaxed, record the semantic reason and owner approval as applicable. Changing the threshold until a dataset passes can hide an unresolved defect. Deduplicate alerts by cause where useful without suppressing decisive failure evidence.
