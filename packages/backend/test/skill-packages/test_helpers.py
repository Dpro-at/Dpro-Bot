"""Exercise portable helpers against real local inputs without model or network calls."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2] / 'skills'


class Helpers(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='dpro-skill-tests-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def run_helper(self, package, script, data, extra=(), raw=False):
        path = self.root / ('input.csv' if raw else 'input.json')
        path.write_bytes(data if raw else json.dumps(data).encode())
        result = subprocess.run([sys.executable, str(ROOT / package / 'scripts' / script), str(path), *map(str, extra)], capture_output=True, text=True, timeout=10)
        return result.returncode, json.loads(result.stdout)

    def ledger(self):
        return {'question': 'Which record controls?', 'sources': [{'id': 's1', 'origin': 'policy', 'location': 'document.md#section', 'checked': '2026-10-25'}], 'claims': [{'id': 'c1', 'text': 'The record applies.', 'kind': 'fact', 'sources': ['s1'], 'independent_origins': 1, 'gap': ''}]}

    def test_evidence_valid_and_repeated_origin(self):
        data = self.ledger()
        self.assertEqual(self.run_helper('evidence-research', 'audit_evidence.py', data)[0], 0)
        data['sources'].append({'id': 's2', 'origin': 'policy', 'location': 'reprint.md', 'checked': '2026-10-25'})
        data['claims'][0].update(sources=['s1', 's2'], independent_origins=2)
        code, result = self.run_helper('evidence-research', 'audit_evidence.py', data)
        self.assertEqual(code, 1)
        self.assertTrue(any('origin count' in x for x in result['findings']))
        self.assertFalse(result['truth_verified'])

    def test_evidence_broken_reference_and_unknown_gap(self):
        data = self.ledger()
        data['claims'][0].update(sources=['missing'], kind='unknown')
        code, result = self.run_helper('evidence-research', 'audit_evidence.py', data)
        self.assertEqual(code, 1)
        self.assertTrue(any('unknown source' in x for x in result['findings']))
        self.assertTrue(any('explicit gap' in x for x in result['findings']))

    def test_evidence_invalid_date_and_input(self):
        data = self.ledger()
        data['sources'][0]['checked'] = '2026-02-30'
        self.assertEqual(self.run_helper('evidence-research', 'audit_evidence.py', data)[0], 1)
        self.assertEqual(self.run_helper('evidence-research', 'audit_evidence.py', [])[0], 2)

    def test_content_supported_and_unresolved(self):
        data = {'brand': 'Example', 'channel': 'article', 'claims': [{'id': 'c1', 'text': 'A documented feature.', 'status': 'supported', 'sources': ['Guide section3']}]}
        self.assertEqual(self.run_helper('content-studio', 'audit_claims.py', data)[0], 0)
        data['claims'][0].update(status='unresolved', sources=[])
        code, result = self.run_helper('content-studio', 'audit_claims.py', data)
        self.assertEqual(code, 1)
        self.assertFalse(result['editorial_approval'])

    def test_content_duplicate_and_missing_source(self):
        claim = {'id': 'c1', 'text': 'Claim', 'status': 'supported', 'sources': []}
        code, result = self.run_helper('content-studio', 'audit_claims.py', {'brand': 'Example', 'channel': 'email', 'claims': [claim, claim]})
        self.assertEqual(code, 1)
        self.assertTrue(any('duplicate' in x for x in result['findings']))
        self.assertTrue(any('no source' in x for x in result['findings']))

    def receipt(self):
        return {'build': 'fixture-v1', 'cases': [{'id': 'save', 'status': 'pass', 'action': 'Save and read back', 'expected': 'Saved value', 'observed': 'Readback matches', 'evidence': ['result.txt']}]}

    def test_qa_real_evidence_and_missing_evidence(self):
        (self.root / 'result.txt').write_text('Observed fixture readback')
        code, result = self.run_helper('web-quality', 'audit_receipt.py', self.receipt(), ['--root', self.root])
        self.assertEqual(code, 0)
        self.assertFalse(result['execution_verified'])
        (self.root / 'result.txt').unlink()
        self.assertEqual(self.run_helper('web-quality', 'audit_receipt.py', self.receipt(), ['--root', self.root])[0], 1)

    def test_qa_path_escape_and_symlink_escape(self):
        for value in ['../outside.txt', '/tmp/outside.txt', 'C:\\outside.txt']:
            data = self.receipt()
            data['cases'][0]['evidence'] = [value]
            self.assertEqual(self.run_helper('web-quality', 'audit_receipt.py', data, ['--root', self.root])[0], 1)
        with tempfile.TemporaryDirectory() as outside:
            target = Path(outside) / 'outside.txt'
            target.write_text('Outside evidence')
            try:
                (self.root / 'result.txt').symlink_to(target)
            except OSError:
                self.skipTest('Symlink creation unavailable on this host')
            self.assertEqual(self.run_helper('web-quality', 'audit_receipt.py', self.receipt(), ['--root', self.root])[0], 1)

    def test_qa_blocked_is_not_a_pass(self):
        data = self.receipt()
        data['cases'][0].update(status='blocked', observed='No authorized test account', evidence=[])
        self.assertEqual(self.run_helper('web-quality', 'audit_receipt.py', data, ['--root', self.root])[0], 0)
        data['cases'][0]['observed'] = ''
        self.assertEqual(self.run_helper('web-quality', 'audit_receipt.py', data, ['--root', self.root])[0], 1)

    def test_csv_numeric_null_duplicate_and_key(self):
        raw = b'id,amount,region\na,10,NA\nb,20,EU\nb,20,EU\nc,,NA\n'
        code, result = self.run_helper('data-analysis', 'profile_csv.py', raw, ['--key', 'id'], raw=True)
        self.assertEqual(code, 0)
        self.assertEqual((result['rows'], result['duplicate_rows']), (4, 1))
        self.assertEqual(result['key_check']['duplicates'], 1)
        amount = result['column_profiles'][1]
        self.assertEqual((amount['null_count'], amount['numeric_count']), (1, 3))
        self.assertEqual(amount['numeric_summary']['sum'], '50')
        self.assertEqual(result['column_profiles'][2]['null_count'], 0)
        self.assertFalse(result['semantic_quality_verified'])

    def test_csv_invalid_headers_width_encoding_and_key(self):
        for raw in [b'a,a\n1,2\n', b'a,b\n1\n', b'a,b\n\xff,2\n', b'']:
            self.assertEqual(self.run_helper('data-analysis', 'profile_csv.py', raw, raw=True)[0], 2)
        self.assertEqual(self.run_helper('data-analysis', 'profile_csv.py', b'a\n1\n', ['--key', 'missing'], raw=True)[0], 2)

    def test_csv_bom_quotes_null_marker_and_no_formula_execution(self):
        raw = '\ufeffid;amount;note\n01;0;"x;y"\n02;NULL;=1+1\n03;1_000;NA\n04;NaN;text\n'.encode()
        code, result = self.run_helper('data-analysis', 'profile_csv.py', raw, ['--delimiter', ';', '--null-token', 'NULL'], raw=True)
        self.assertEqual(code, 0)
        amount = result['column_profiles'][1]
        self.assertEqual((amount['null_count'], amount['numeric_count'], amount['non_numeric_count']), (1, 1, 2))
        self.assertEqual(amount['numeric_summary']['sum'], '0')
        self.assertEqual(result['column_profiles'][2]['null_count'], 0)

    def test_csv_distinct_limit_is_explicit(self):
        raw = ('id\n' + '\n'.join(str(x) for x in range(1002)) + '\n').encode()
        code, result = self.run_helper('data-analysis', 'profile_csv.py', raw, raw=True)
        self.assertEqual(code, 0)
        self.assertTrue(result['column_profiles'][0]['distinct_limited'])
        self.assertEqual(result['column_profiles'][0]['distinct_count'], 1000)

    def test_all_helpers_help_is_local(self):
        for package, script in [('evidence-research', 'audit_evidence.py'), ('content-studio', 'audit_claims.py'), ('web-quality', 'audit_receipt.py'), ('data-analysis', 'profile_csv.py')]:
            result = subprocess.run([sys.executable, str(ROOT / package / 'scripts' / script), '--help'], capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0)
            self.assertIn('usage:', result.stdout)


if __name__ == '__main__':
    unittest.main()
