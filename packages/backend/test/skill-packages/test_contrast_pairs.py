"""Verify the packaged color-pair checker through its real local CLI."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'skills/brand-identity/scripts/contrast_pairs.py'


def pair(foreground='#000000', background='#FFFFFF', threshold=4.5):
    return {'foreground': foreground, 'background': background, 'threshold': threshold}


class ContrastTests(unittest.TestCase):
    def run_pairs(self, data, literal=False):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'pairs.json';source.write_text(data if literal else json.dumps(data))
            result = subprocess.run([sys.executable, str(SCRIPT), str(source)], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.stderr, '')
        return result.returncode, json.loads(result.stdout)

    def test_black_white_and_reverse_are_twenty_one(self):
        code, data = self.run_pairs([pair(threshold=21), pair('#FFFFFF', '#000000', 21)])
        self.assertEqual(code, 0)
        self.assertEqual([p['ratio'] for p in data['pairs']], [21.0, 21.0])

    def test_identical_colors_are_one(self):
        code, data = self.run_pairs([pair('#123456', '#123456', 1)])
        self.assertEqual(code, 0)
        self.assertEqual(data['pairs'][0]['ratio'], 1)

    def test_comparison_uses_unrounded_ratio(self):
        code, data = self.run_pairs([pair('#777777', '#FFFFFF', 4.48)])
        self.assertEqual(code, 1)
        self.assertLess(data['pairs'][0]['ratio'], 4.48)
        self.assertGreater(data['pairs'][0]['ratio'], 4.47)

    def test_pair_set_reports_both_pass_and_failure(self):
        code, data = self.run_pairs([pair('#767676'), pair('#777777')])
        self.assertEqual(code, 1)
        self.assertEqual([p['meets_threshold'] for p in data['pairs']], [True, False])

    def test_invalid_colors_include_alpha_and_shorthand(self):
        for color in ['#fff', '#FFFFFF80', 'red', '#GG0000', None]:
            self.assertEqual(self.run_pairs([pair(color)])[0], 2)

    def test_threshold_boolean_range_and_nonfinite(self):
        for value in [True, 0.9, 21.1, '4.5']:
            self.assertEqual(self.run_pairs([pair(threshold=value)])[0], 2)
        self.assertEqual(self.run_pairs('[{"foreground":"#000000","background":"#FFFFFF","threshold":NaN}]', True)[0], 2)

    def test_invalid_shape_duplicate_keys_and_bounds(self):
        self.assertEqual(self.run_pairs([])[0], 2)
        self.assertEqual(self.run_pairs([{'foreground': '#000000'}])[0], 2)
        self.assertEqual(self.run_pairs('[{"threshold":1,"threshold":2}]', True)[0], 2)
        self.assertEqual(self.run_pairs([pair()] * 1001)[0], 2)
        self.assertEqual(self.run_pairs(' ' * (256 * 1024 + 1), True)[0], 2)

    def test_missing_file_is_clean_invalid_input(self):
        with tempfile.TemporaryDirectory() as folder:
            result = subprocess.run([sys.executable, str(SCRIPT), str(Path(folder)/'absent.json')], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['status'], 'invalid_input')
        self.assertEqual(result.stderr, '')


if __name__ == '__main__':
    unittest.main()
