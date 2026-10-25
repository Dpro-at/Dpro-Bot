# Claim-map format

The optional helper accepts UTF-8 JSON, at most2MB:

```json
{
  "brand": "Example brand",
  "channel": "newsletter",
  "claims": [
    {"id": "c1", "text": "The guide contains three exercises.", "status": "supported", "sources": ["Approved guide, exercises section"]}
  ]
}
```

Statuses are supported, inference, fictional or unresolved. A supported claim needs a non-empty source reference. The helper reports every unresolved claim. Other statuses still require editorial review, especially when fictional text could be mistaken for customer proof.

```text
python3 path/to/content-studio/scripts/audit_claims.py claim-map.json
```

Exit0: no mechanical issues found. Exit1: review findings. Exit2: unreadable or malformed input. The helper cannot discover undeclared claims in prose, establish permission to publish, or validate the sources themselves.
