"""Exercise the packaged split audit through its actual CLI."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'skills/statistical-modeling/scripts/audit_splits.py'
BASE = {'group_disjoint': True, 'chronological': True, 'splits': {'train': [{'id': 'private-train', 'group': 'private-group-a', 'time': '2025-01-01T00:00:00Z'}], 'validation': [], 'test': [{'id': 'private-test', 'group': 'private-group-b', 'time': '2025-02-01T00:00:00+00:00'}]}}


class SplitAuditTests(unittest.TestCase):
    def run_manifest(self, data, literal=False):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'split.json'
            path.write_text(data if literal else json.dumps(data))
            result = subprocess.run([sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True, timeout=10)
        self.assertNotIn('private-', result.stdout)
        return result.returncode, json.loads(result.stdout)

    def test_valid_with_empty_validation(self):
        code, result = self.run_manifest(BASE)
        self.assertEqual(code, 0)
        self.assertEqual(result['counts'], {'train': 1, 'validation': 0, 'test': 1})

    def test_duplicate_within_split(self):
        data = copy.deepcopy(BASE);data['splits']['train'] *= 2
        code, result = self.run_manifest(data)
        self.assertEqual(code, 1)
        self.assertEqual(result['findings'][0]['kind'], 'duplicate_sample')

    def test_sample_overlap_even_without_group_mode(self):
        data = copy.deepcopy(BASE);data['group_disjoint'] = False;data['splits']['test'][0]['id'] = data['splits']['train'][0]['id']
        code, result = self.run_manifest(data)
        self.assertEqual(code, 1)
        self.assertIn('sample_overlap', [r['kind'] for r in result['findings']])

    def test_group_overlap_only_when_requested(self):
        data = copy.deepcopy(BASE);data['splits']['test'][0]['group'] = data['splits']['train'][0]['group']
        self.assertEqual(self.run_manifest(data)[0], 1)
        data['group_disjoint'] = False
        self.assertEqual(self.run_manifest(data)[0], 0)

    def test_boundary_instants_normalize_timezones(self):
        data = copy.deepcopy(BASE);data['splits']['test'][0]['time'] = '2025-01-01T01:00:00+01:00'
        code, result = self.run_manifest(data)
        self.assertEqual(code, 1)
        self.assertIn('chronology_violation', [r['kind'] for r in result['findings']])

    def test_missing_fields_and_naive_timestamp_fail(self):
        for field in ['group', 'time']:
            data = copy.deepcopy(BASE);del data['splits']['test'][0][field]
            self.assertEqual(self.run_manifest(data)[0], 2)
        data = copy.deepcopy(BASE);data['splits']['test'][0]['time'] = '2025-02-01T00:00:00'
        self.assertEqual(self.run_manifest(data)[0], 2)

    def test_validation_is_checked_against_both_sides(self):
        data = copy.deepcopy(BASE);data['splits']['validation'] = [{'id': 'v', 'group': 'v', 'time': '2025-03-01T00:00:00Z'}]
        code, result = self.run_manifest(data)
        self.assertEqual(code, 1)
        self.assertIn(['validation', 'test'], [r['splits'] for r in result['findings']])

    def test_duplicate_json_keys_and_nonfinite_values_fail(self):
        self.assertEqual(self.run_manifest('{"x":1,"x":2}', literal=True)[0], 2)
        self.assertEqual(self.run_manifest('{"x":NaN}', literal=True)[0], 2)

    def test_invalid_shapes_and_oversize_fail(self):
        data = copy.deepcopy(BASE);data['group_disjoint'] = 'true'
        self.assertEqual(self.run_manifest(data)[0], 2)
        data = copy.deepcopy(BASE);data['splits']['test'] = []
        self.assertEqual(self.run_manifest(data)[0], 2)
        self.assertEqual(self.run_manifest(' ' * (4 * 1024 * 1024 + 1), literal=True)[0], 2)
        data = {'group_disjoint': False, 'chronological': False, 'splits': {'train': [{'id': 'a'}] * 50000, 'validation': [], 'test': [{'id': 'b'}]}}
        self.assertEqual(self.run_manifest(data)[0], 2)


if __name__ == '__main__':
    unittest.main()
