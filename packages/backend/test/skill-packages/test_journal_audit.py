"""Actual CLI tests for declared journal arithmetic and input bounds."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "skills/financial-operations/scripts/audit_journal.py"


def entry(debit="0.30", credit="0.30", scale=2):
    return {"currency": "USD", "scale": scale, "lines": [
        {"account": "synthetic-debit", "debit": debit, "credit": "0"},
        {"account": "synthetic-credit", "debit": "0", "credit": credit}]}


class JournalAuditTests(unittest.TestCase):
    def run_cli(self, document=None, raw=None):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "entry.json"
            path.write_bytes(raw if raw is not None else json.dumps(document).encode())
            p = subprocess.run([sys.executable, str(SCRIPT), str(path)],
                               capture_output=True, text=True, timeout=4)
            self.assertEqual(p.stderr, "")
            return p.returncode, json.loads(p.stdout)

    def test_exact_decimal_sum_and_no_account_echo(self):
        data = entry()
        data["lines"][0]["debit"] = "0.10"
        data["lines"].append({"account": "synthetic-extra", "debit": "0.20", "credit": "0"})
        code, result = self.run_cli(data)
        self.assertEqual(code, 0)
        self.assertEqual(result["debitTotal"], "0.30")
        self.assertTrue(result["declaredTotalsBalance"])
        self.assertNotIn("synthetic", json.dumps(result))

    def test_unequal_totals(self):
        code, result = self.run_cli(entry("0.31", "0.30"))
        self.assertEqual(code, 1)
        self.assertEqual(result["difference"], "0.01")
        self.assertEqual(result["findings"], [{"code": "unequal_totals"}])

    def test_balanced_totals_do_not_hide_invalid_lines(self):
        data = entry()
        data["lines"] = [{"account": "a", "debit": "1", "credit": "1"},
                         {"account": "b", "debit": "0", "credit": "0"}]
        code, result = self.run_cli(data)
        self.assertEqual(code, 1)
        self.assertTrue(result["declaredTotalsBalance"])
        self.assertEqual({x["code"] for x in result["findings"]},
                         {"both_sides_positive", "zero_line"})

    def test_scale_zero_six_and_large_exact_totals(self):
        for value, scale in [("7", 0), ("0.000001", 6), ("999999999999999.999999", 6)]:
            code, result = self.run_cli(entry(value, value, scale))
            self.assertEqual(code, 0)
            self.assertEqual(result["debitTotal"], value)

    def test_invalid_amount_and_precision(self):
        for value in [1, True, "-1", "+1", "1e2", "01", "1,000", "1.", ".5",
                      "NaN", "1000000000000000", "0.1234567", "0.001"]:
            self.assertEqual(self.run_cli(entry(value, "1"))[0], 2)

    def test_shape_scale_currency_and_account_bounds(self):
        cases = [[], {}, {**entry(), "extra": 1}, {**entry(), "lines": []}]
        for scale in [True, -1, 7, "2"]:
            cases.append({**entry(), "scale": scale})
        for currency in [True, "usd", "US", "USDD", "123"]:
            cases.append({**entry(), "currency": currency})
        for account in [False, "", "  ", "a" * 81]:
            data = entry()
            data["lines"][0]["account"] = account
            cases.append(data)
        for data in cases:
            self.assertEqual(self.run_cli(data)[0], 2)

    def test_duplicate_malformed_nonfinite_encoding_and_byte_bounds(self):
        for raw in [b'{"currency":"USD","currency":"EUR"}', b'{"a":NaN}',
                    b'\xff', b'{', b' ' * (1024 * 1024 + 1), b'[' * 1200 + b']' * 1200]:
            self.assertEqual(self.run_cli(raw=raw)[0], 2)

    def test_record_bound_and_bounded_findings(self):
        data = entry()
        data["lines"] = [{"account": "a", "debit": "0", "credit": "0"}] * 10001
        self.assertEqual(self.run_cli(data)[0], 2)
        data["lines"] = data["lines"][:10000]
        code, result = self.run_cli(data)
        self.assertEqual(code, 1)
        self.assertEqual(result["findingCount"], 10000)
        self.assertEqual(len(result["findings"]), 100)
        self.assertTrue(result["truncated"])


if __name__ == "__main__":
    unittest.main()
