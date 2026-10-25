#!/usr/bin/env python3
"""Audit a declared single-currency journal's arithmetic, not accounting policy."""
import argparse
from decimal import Decimal, localcontext
import json
from pathlib import Path
import re
import sys

MAX_BYTES = 1024 * 1024
MAX_LINES = 10000
MAX_FINDINGS = 100
AMOUNT = re.compile(r"(?:0|[1-9][0-9]{0,14})(?:\.[0-9]{1,6})?\Z", re.ASCII)
CURRENCY = re.compile(r"[A-Z]{3}\Z", re.ASCII)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate object key")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError("nonfinite constant")


def amount(value, scale):
    if not isinstance(value, str) or not AMOUNT.fullmatch(value):
        raise ValueError("invalid amount")
    if "." in value and len(value.split(".")[1]) > scale:
        raise ValueError("undeclared fractional precision")
    return Decimal(value)


def audit(document):
    if not isinstance(document, dict) or set(document) != {"currency", "scale", "lines"}:
        raise ValueError("invalid root")
    currency, scale, lines = document["currency"], document["scale"], document["lines"]
    if not isinstance(currency, str) or not CURRENCY.fullmatch(currency):
        raise ValueError("invalid currency label")
    if type(scale) is not int or not 0 <= scale <= 6:
        raise ValueError("invalid scale")
    if not isinstance(lines, list) or not 1 <= len(lines) <= MAX_LINES:
        raise ValueError("invalid line collection")
    debit_total = Decimal(0)
    credit_total = Decimal(0)
    findings = []
    count = 0

    def finding(code, index=None):
        nonlocal count
        count += 1
        if len(findings) < MAX_FINDINGS:
            item = {"code": code}
            if index is not None:
                item["index"] = index
            findings.append(item)

    with localcontext() as context:
        context.prec = 40
        for index, line in enumerate(lines):
            if not isinstance(line, dict) or set(line) != {"account", "debit", "credit"}:
                raise ValueError("invalid line")
            account = line["account"]
            if not isinstance(account, str) or not 1 <= len(account) <= 80 or not account.strip():
                raise ValueError("invalid account label")
            debit, credit = amount(line["debit"], scale), amount(line["credit"], scale)
            debit_total += debit
            credit_total += credit
            if debit > 0 and credit > 0:
                finding("both_sides_positive", index)
            elif debit == 0 and credit == 0:
                finding("zero_line", index)
        difference = debit_total - credit_total
        if difference != 0:
            finding("unequal_totals")
        return {
            "scope": "declared_arithmetic_only",
            "lineCount": len(lines),
            "debitTotal": format(debit_total, "." + str(scale) + "f"),
            "creditTotal": format(credit_total, "." + str(scale) + "f"),
            "difference": format(difference, "." + str(scale) + "f"),
            "declaredTotalsBalance": difference == 0,
            "findingCount": count,
            "findings": findings,
            "truncated": count > len(findings),
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entry", type=Path)
    args = parser.parse_args()
    try:
        with args.entry.open("rb") as stream:
            raw = stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("byte limit")
        document = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_object,
                              parse_constant=reject_constant)
        result = audit(document)
    except (OSError, ValueError, RecursionError):
        print(json.dumps({"error": "invalid_unreadable_or_out_of_bounds_entry"}))
        return 2
    print(json.dumps(result, separators=(",", ":")))
    return 1 if result["findingCount"] else 0


if __name__ == "__main__":
    sys.exit(main())
