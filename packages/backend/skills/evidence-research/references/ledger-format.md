# Evidence ledger format

The optional audit helper accepts a UTF-8 JSON file of at most2MB:

```json
{
  "question": "Which documented plan meets the stated requirement?",
  "sources": [
    {"id": "s1", "origin": "vendor-policy-v2", "location": "https://example.invalid/policy#plans", "checked": "2026-10-25"}
  ],
  "claims": [
    {"id": "c1", "text": "The required feature is documented for the selected plan.", "kind": "fact", "sources": ["s1"], "independent_origins": 1, "gap": ""}
  ]
}
```

`location` is a source URL or a local document reference with a useful section/page. `origin` identifies the underlying evidence, not just a publisher. `checked` is a valid ISO calendar date; it does not replace a publication/effective date in the actual brief.

Claim `kind` is fact, inference or unknown. Facts require a supporting source or an explicit gap; inferences need a stated basis in the report. An unknown requires a non-empty gap. `independent_origins` counts distinct origins for the source references; use it only after a human or model has assessed actual independence.

Run from any working directory using the package's real path:

```text
python3 path/to/evidence-research/scripts/audit_evidence.py evidence.json
```

Exit0 means the ledger passed mechanical checks. Exit1 means review findings. Exit2 means the input could not be processed. JSON output includes `findings`; it never claims that a source was fetched or a statement was verified.
