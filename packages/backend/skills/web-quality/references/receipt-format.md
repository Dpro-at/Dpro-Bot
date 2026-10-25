# Execution receipt format

The optional helper accepts a UTF-8 JSON file, at most2MB:

```json
{
  "build": "local-fixture-v1",
  "cases": [
    {"id": "save-1", "status": "pass", "action": "Save a changed label and reopen it", "expected": "The saved label is shown", "observed": "The reopened fixture contains the new label", "evidence": ["save-readback.txt"]}
  ]
}
```

Allowed statuses are pass, fail, blocked and not-run. Executed pass/fail cases require action, expected and observed text. A pass also requires at least one evidence path. Blocked/not-run cases need an explanation in observed. Case IDs must be unique.

Run with an explicit evidence root:

```text
python3 path/to/web-quality/scripts/audit_receipt.py receipt.json --root path/to/evidence
```

Evidence paths are relative to that root. The helper rejects absolute paths, traversal and symlink escape, checks regular-file existence and refuses empty files. It reads no browser state and starts no processes or servers.

Exit0: mechanical receipt checks pass. Exit1: findings requiring review. Exit2: invalid invocation/input. These checks cannot certify the scenario's truth, visual quality or completeness.
