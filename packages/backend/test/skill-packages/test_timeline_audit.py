"""Exercise the packaged frame-manifest audit through the actual CLI."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'skills/visual-communication/scripts/audit_timeline.py'


def clip(identity, start, end, kind='visual'):
    return {'id': identity, 'kind': kind, 'start_frame': start, 'end_frame': end}


BASE = {'fps': {'numerator': 30, 'denominator': 1}, 'total_frames': 30, 'require_visual_coverage': True, 'clips': [clip('private-a', 0, 15), clip('private-b', 15, 30)]}


class TimelineTests(unittest.TestCase):
    def run_manifest(self, data, literal=False):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'timeline.json';path.write_text(data if literal else json.dumps(data))
            result = subprocess.run([sys.executable,str(SCRIPT),str(path)],capture_output=True,text=True,timeout=10)
        self.assertEqual(result.stderr, '')
        self.assertNotIn('private-', result.stdout)
        return result.returncode,json.loads(result.stdout)

    def test_adjacent_exclusive_intervals_cover(self):
        code, data = self.run_manifest(BASE)
        self.assertEqual(code, 0)
        self.assertEqual(data['uncovered_frame_count'], 0)
        self.assertEqual(data['duration_seconds_exact'], '1')

    def test_overlap_is_allowed(self):
        value = copy.deepcopy(BASE);value['clips'][0]['end_frame'] = 20
        self.assertEqual(self.run_manifest(value)[0], 0)

    def test_audio_does_not_fill_visual_gap(self):
        value = copy.deepcopy(BASE);value['clips'][1]['kind'] = 'audio'
        code, data = self.run_manifest(value)
        self.assertEqual(code, 1)
        self.assertEqual(data['first_gaps'], [[15, 30]])
        value['require_visual_coverage'] = False
        self.assertEqual(self.run_manifest(value)[0], 0)

    def test_duplicate_and_out_of_range_are_findings(self):
        value = copy.deepcopy(BASE);value['clips'][1]['id'] = value['clips'][0]['id'];value['clips'][1]['end_frame'] = 31
        code,data = self.run_manifest(value)
        self.assertEqual(code, 1)
        self.assertIn('duplicate_clip_identity',[x['kind'] for x in data['findings']])
        self.assertIn('out_of_range_interval',[x['kind'] for x in data['findings']])

    def test_fractional_timebase_uses_exact_duration(self):
        value = copy.deepcopy(BASE);value['fps'] = {'numerator': 30000,'denominator':1001};value['total_frames'] = 30000;value['clips'] = [clip('x',0,30000)]
        code,data = self.run_manifest(value)
        self.assertEqual(code, 0)
        self.assertEqual(data['duration_seconds_exact'], '1001')

    def test_frame_types_and_invalid_timebase(self):
        value = copy.deepcopy(BASE);value['clips'][0]['start_frame'] = False
        self.assertEqual(self.run_manifest(value)[0], 2)
        for denominator in [0,True,0.5]:
            value = copy.deepcopy(BASE);value['fps']['denominator'] = denominator
            self.assertEqual(self.run_manifest(value)[0], 2)

    def test_identity_bounds_and_unknown_kind(self):
        value = copy.deepcopy(BASE);value['clips'][0]['id'] = ''
        self.assertEqual(self.run_manifest(value)[0], 2)
        value = copy.deepcopy(BASE);value['clips'][0]['kind'] = 'maybe'
        self.assertEqual(self.run_manifest(value)[0], 2)

    def test_duplicate_json_nonfinite_and_input_bounds(self):
        self.assertEqual(self.run_manifest('{"fps":1,"fps":2}',True)[0], 2)
        self.assertEqual(self.run_manifest('{"x":NaN}',True)[0], 2)
        self.assertEqual(self.run_manifest(' '*(2*1024*1024+1),True)[0], 2)
        value = copy.deepcopy(BASE);value['clips'] = [clip('x',0,1)]*20001
        self.assertEqual(self.run_manifest(value)[0], 2)

    def test_large_frame_range_does_not_allocate_per_frame(self):
        value = copy.deepcopy(BASE);value['total_frames'] = 100000000;value['clips'] = []
        code,data = self.run_manifest(value)
        self.assertEqual(code, 1)
        self.assertEqual(data['uncovered_frame_count'],100000000)
        self.assertEqual(data['first_gaps'], [[0,100000000]])


if __name__ == '__main__':
    unittest.main()
