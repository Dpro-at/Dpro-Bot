"""Check explicit opaque sRGB pairs against caller-declared contrast thresholds."""
import argparse
import json
import math
from pathlib import Path
import re
import sys

MAX_BYTES = 256 * 1024
MAX_PAIRS = 1000


def unique_pairs(items):
    value = {}
    for key, item in items:
        if key in value:
            raise ValueError('duplicate_json_key')
        value[key] = item
    return value


def luminance(color):
    if not isinstance(color, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        raise ValueError('invalid_opaque_color')
    channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return sum(weight * value for weight, value in zip((0.2126, 0.7152, 0.0722), linear))


def audit(raw):
    if not isinstance(raw, list) or not 1 <= len(raw) <= MAX_PAIRS:
        raise ValueError('invalid_pairs')
    results = []
    for index, pair in enumerate(raw):
        if not isinstance(pair, dict) or set(pair) != {'foreground', 'background', 'threshold'}:
            raise ValueError('invalid_pair')
        threshold = pair['threshold']
        if type(threshold) not in (int, float) or not math.isfinite(threshold) or not 1 <= threshold <= 21:
            raise ValueError('invalid_threshold')
        one, two = luminance(pair['foreground']), luminance(pair['background'])
        ratio = (max(one, two) + 0.05) / (min(one, two) + 0.05)
        results.append({'index': index, 'ratio': ratio, 'threshold': threshold, 'meets_threshold': ratio >= threshold})
    return {'status': 'passed' if all(pair['meets_threshold'] for pair in results) else 'findings', 'pairs': results, 'scope': 'Opaque sRGB pair arithmetic only; rendered use and accessibility conformance unverified.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='Local JSON array; see references/contrast-checks.md')
    args = parser.parse_args()
    try:
        with args.input.open('rb') as handle:
            content = handle.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError('input_too_large')
        def invalid_constant(_):
            raise ValueError('nonfinite_json')
        result = audit(json.loads(content.decode('utf-8'), object_pairs_hook=unique_pairs, parse_constant=invalid_constant))
    except (OSError, UnicodeError, ValueError, RecursionError, OverflowError):
        print(json.dumps({'status': 'invalid_input', 'scope': 'No contrast claim.'}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    sys.exit(main())
