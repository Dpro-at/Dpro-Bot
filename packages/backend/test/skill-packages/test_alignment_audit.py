"""Real CLI checks for the optional declared course-map audit."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "skills/course-design/scripts/audit_alignment.py"


def good():
    return {"objectives": [{"id": "goal-1"}],
            "activities": [{"id": "practice-1", "objectives": ["goal-1"]}],
            "assessments": [{"id": "check-1", "objectives": ["goal-1"]}]}


class AlignmentAuditTests(unittest.TestCase):
    def run_cli(self, document=None, raw=None):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "manifest.json"
            path.write_bytes(raw if raw is not None else json.dumps(document).encode())
            p = subprocess.run([sys.executable, str(SCRIPT), str(path)],
                               capture_output=True, text=True, timeout=4)
            self.assertEqual(p.stderr, "")
            return p.returncode, json.loads(p.stdout)

    def test_complete_declared_coverage(self):
        code, result = self.run_cli(good())
        self.assertEqual(code, 0)
        self.assertEqual(result["findingCount"], 0)
        self.assertEqual(result["scope"], "declared_references_and_coverage_only")

    def test_missing_assessment_and_unmapped_item(self):
        data = good()
        data["assessments"][0]["objectives"] = []
        code, result = self.run_cli(data)
        self.assertEqual(code, 1)
        self.assertEqual({x["code"] for x in result["findings"]},
                         {"unmapped_item", "missing_assessments"})

    def test_unknown_reference_does_not_cover_declared_objective(self):
        data = good()
        data["activities"][0]["objectives"] = ["undeclared"]
        code, result = self.run_cli(data)
        self.assertEqual(code, 1)
        self.assertEqual({x["code"] for x in result["findings"]},
                         {"unknown_objective", "missing_activities"})
        self.assertNotIn("undeclared", json.dumps(result))

    def test_multiple_links_and_collection_scoped_identifiers(self):
        data = good()
        data["objectives"].append({"id": "goal-2"})
        for kind in ["activities", "assessments"]:
            data[kind][0] = {"id": "shared-local-name", "objectives": ["goal-1", "goal-2"]}
        self.assertEqual(self.run_cli(data)[0], 0)

    def test_duplicate_identifiers_and_references_rejected(self):
        for kind in ["objectives", "activities", "assessments"]:
            data = good()
            data[kind].append(dict(data[kind][0]))
            self.assertEqual(self.run_cli(data)[0], 2)
        data = good()
        data["activities"][0]["objectives"] *= 2
        self.assertEqual(self.run_cli(data)[0], 2)

    def test_invalid_shape_types_and_identifiers(self):
        cases = [[], {}, {**good(), "extra": True}, {**good(), "objectives": []}]
        for invalid in [True, 1, "", "has space", "a" * 81, "1-start"]:
            data = good()
            data["objectives"][0]["id"] = invalid
            cases.append(data)
        for data in cases:
            self.assertEqual(self.run_cli(data)[0], 2)

    def test_json_encoding_and_byte_bounds(self):
        for raw in [b'{"objectives":[],"objectives":[]}', b'{"value":NaN}',
                    b'\xff', b'{', b' ' * (1024 * 1024 + 1), b'[' * 1200 + b']' * 1200]:
            self.assertEqual(self.run_cli(raw=raw)[0], 2)

    def test_count_bounds_and_bounded_findings(self):
        data = good()
        data["objectives"] = [{"id": "g" + str(i)} for i in range(1001)]
        self.assertEqual(self.run_cli(data)[0], 2)
        data = good()
        data["activities"] = [{"id": "a" + str(i), "objectives": []} for i in range(3001)]
        self.assertEqual(self.run_cli(data)[0], 2)
        data = {"objectives": [{"id": "g" + str(i)} for i in range(1000)],
                "activities": [], "assessments": []}
        code, result = self.run_cli(data)
        self.assertEqual(code, 1)
        self.assertEqual(result["findingCount"], 2000)
        self.assertEqual(len(result["findings"]), 100)
        self.assertTrue(result["truncated"])


if __name__ == "__main__":
    unittest.main()
