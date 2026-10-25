#!/usr/bin/env python3
"""Audit declared course-map references and coverage, not instructional quality."""
import argparse
import json
from pathlib import Path
import re
import sys

MAX_BYTES = 1024 * 1024
MAX_OBJECTIVES = 1000
MAX_ITEMS = 3000
MAX_FINDINGS = 100
ID = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}\Z", re.ASCII)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate object key")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError("nonfinite constant")


def valid_id(value):
    return isinstance(value, str) and ID.fullmatch(value) is not None


def validate(document):
    if not isinstance(document, dict) or set(document) != {"objectives", "activities", "assessments"}:
        raise ValueError("invalid root")
    for kind in ["objectives", "activities", "assessments"]:
        records = document[kind]
        limit = MAX_OBJECTIVES if kind == "objectives" else MAX_ITEMS
        if not isinstance(records, list) or len(records) > limit:
            raise ValueError("invalid collection")
        if kind == "objectives" and not records:
            raise ValueError("missing declared objectives")
        seen = set()
        for record in records:
            fields = {"id"} if kind == "objectives" else {"id", "objectives"}
            if not isinstance(record, dict) or set(record) != fields:
                raise ValueError("invalid record")
            identifier = record["id"]
            if not valid_id(identifier) or identifier in seen:
                raise ValueError("invalid or duplicate record identifier")
            seen.add(identifier)
            if kind != "objectives":
                refs = record["objectives"]
                if not isinstance(refs, list) or len(refs) > MAX_OBJECTIVES:
                    raise ValueError("invalid reference list")
                if not all(valid_id(ref) for ref in refs) or len(set(refs)) != len(refs):
                    raise ValueError("invalid or duplicate reference")
    return document


def audit(document):
    objectives = {r["id"]: index for index, r in enumerate(document["objectives"])}
    coverage = {kind: set() for kind in ["activities", "assessments"]}
    findings = []
    count = 0

    def finding(code, collection, index):
        nonlocal count
        count += 1
        if len(findings) < MAX_FINDINGS:
            findings.append({"code": code, "collection": collection, "index": index})

    for kind in ["activities", "assessments"]:
        for index, record in enumerate(document[kind]):
            refs = record["objectives"]
            if not refs:
                finding("unmapped_item", kind, index)
            for ref in refs:
                if ref not in objectives:
                    finding("unknown_objective", kind, index)
                else:
                    coverage[kind].add(ref)
    for ref, index in objectives.items():
        for kind in ["activities", "assessments"]:
            if ref not in coverage[kind]:
                finding("missing_" + kind, "objectives", index)
    return {
        "scope": "declared_references_and_coverage_only",
        "counts": {kind: len(document[kind]) for kind in document},
        "findingCount": count,
        "findings": findings,
        "truncated": count > len(findings),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        with args.manifest.open("rb") as stream:
            raw = stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("byte limit")
        document = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object,
                              parse_constant=reject_constant)
        result = audit(validate(document))
    except (OSError, ValueError, RecursionError):
        print(json.dumps({"error": "invalid_unreadable_or_out_of_bounds_manifest"}))
        return 2
    print(json.dumps(result, separators=(",", ":")))
    return 1 if result["findingCount"] else 0


if __name__ == "__main__":
    sys.exit(main())
