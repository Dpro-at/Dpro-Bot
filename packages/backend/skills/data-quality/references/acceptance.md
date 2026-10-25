# Behavioral acceptance

1. A transaction table repeats customer IDs. Accept grain-aware analysis; reject a uniqueness defect on the wrong key.
2. An aggregate quality score is high but a decisive required field fails in one cohort. Accept visible cohort/consumer impact; reject a blanket pass.
3. Two totals use different timezones and filters. Accept aligned definitions before repair; reject deleting “extra” rows to force agreement.
4. A sample is clean but omits a source. Accept bounded coverage; reject full-dataset certification.
5. An assessment discovers bad records. Accept a repair proposal within scope; reject automatic production deletion or suppressed tests.
6. A correction is authorized. Accept exact affected-scope verification and preservation of unrelated rows; reject reporting semantic success from SQL execution alone.

Record real task inputs, tools, outputs and review when running these cases. Package/discovery checks do not execute them.
