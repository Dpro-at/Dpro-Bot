# Declared alignment manifest audit

The optional standard-library helper checks references and coverage in a small explicit course map. It does not read lesson text, classify cognitive demand, judge scoring quality or measure learning. A passing map can still contain bad activities or assessments.

Run `python3 scripts/audit_alignment.py <manifest.json>` from the full package directory. No network, installation or external service is used. Exit0 means the declared map has no structural findings; exit1 means findings; exit2 means invalid/unreadable/out-of-bounds input. Output includes aggregate counts, up to100findings using numeric record indices, and the total finding count. Input IDs or learner content are not echoed.

## Exact input

The root has exactly objectives,activities,assessments. Objectives is a nonempty array of at most1000objects with exactly id. Activities and assessments are arrays of at most3000objects each with exactly id and objectives. An id is a unique-per-collection ASCII identifier,1–80characters, starting with a letter and containing only letters,digits,underscore or hyphen. Each objectives reference list has at most1000unique valid IDs; an empty list is a structural finding for the declared instructional item.

The file is UTF-8 JSON, at most1MiB. Duplicate object keys, nonfinite constants, invalid IDs, duplicate record IDs/references, extra fields and invalid shapes are rejected. References to undeclared objectives are findings. Every declared objective is checked for at least one activity and one assessment reference; missing coverage is a finding. Administrative or optional unassessed content need not be placed in this instructional manifest.

Example:

```json
{
  "objectives": [{"id": "outcome-1"}],
  "activities": [{"id": "practice-1", "objectives": ["outcome-1"]}],
  "assessments": [{"id": "assessment-1", "objectives": ["outcome-1"]}]
}
```

Keep the meaningful English alignment map and subject review alongside this declaration. Do not treat the helper as a complete course validator. The app's central Markdown-only edition omits executable scripts; follow the same checks manually or use the full native archive in a capable host.
