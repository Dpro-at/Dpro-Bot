# Local split manifest

Run scripts/audit_splits.py --help with Python 3.10+ before first use. Input is an explicit UTF-8 JSON file, at most 4 MiB and 50000 records. No external dependencies, networking, model training or mutation of the input.

```json
{
  "group_disjoint": true,
  "chronological": true,
  "splits": {
    "train": [{"id":"sample-a","group":"entity-a","time":"2025-01-01T00:00:00+00:00"}],
    "validation": [],
    "test": [{"id":"sample-b","group":"entity-b","time":"2025-02-01T00:00:00+00:00"}]
  }
}
```

The exact top-level keys are group_disjoint, chronological and splits. Split keys are train, validation and test; train and test must be nonempty, validation may be empty. Each record requires a nonempty string id (at most 200 characters); group and time are optional unless their corresponding mode is enabled. Record keys are limited to id, group and time. Groups must be nonempty strings when supplied. Timestamps, when supplied, must include an explicit UTC offset; Z is accepted.

Sample IDs must be unique within and across splits. Repeated groups within one split are allowed; overlap across splits is a finding only when group_disjoint is true. Strict chronological mode requires every record's timestamp and max(earlier split) < min(later split) for the nonempty ordered splits. Equal boundary timestamps fail this strict policy. Choose that policy only when it matches the study. The helper does not implement a task-specific embargo window.

Exit 0 means the declared mechanical checks passed, 1 means findings and 2 means invalid input. Output contains counts and split names, never raw sample or group identities. A pass does not prove semantic leakage is absent, that labels are correct or that the split is statistically suitable.
