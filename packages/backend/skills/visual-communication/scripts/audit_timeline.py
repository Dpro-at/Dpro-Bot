"""Audit an explicit frame manifest; no rendering or media inspection is performed."""
import argparse
from fractions import Fraction
import json
from pathlib import Path
import sys

MAX_BYTES = 2 * 1024 * 1024
MAX_CLIPS = 20000
MAX_FRAMES = 100000000


def unique_pairs(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError('duplicate_json_key')
        result[key] = value
    return result


def audit(raw):
    if not isinstance(raw, dict) or set(raw) != {'fps', 'total_frames', 'require_visual_coverage', 'clips'}:
        raise ValueError('invalid_manifest')
    fps = raw['fps']
    if not isinstance(fps, dict) or set(fps) != {'numerator', 'denominator'}:
        raise ValueError('invalid_timebase')
    numerator, denominator = fps['numerator'], fps['denominator']
    if type(numerator) is not int or type(denominator) is not int or not 1 <= numerator <= 240000 or not 1 <= denominator <= 10000:
        raise ValueError('invalid_timebase')
    rate = Fraction(numerator, denominator)
    if not 1 <= rate <= 240:
        raise ValueError('unsupported_rate')
    duration = raw['total_frames']
    if type(duration) is not int or not 1 <= duration <= MAX_FRAMES or type(raw['require_visual_coverage']) is not bool:
        raise ValueError('invalid_duration_or_mode')
    clips = raw['clips']
    if not isinstance(clips, list) or len(clips) > MAX_CLIPS:
        raise ValueError('invalid_clips')
    ids, intervals, findings = set(), [], []
    for index, clip in enumerate(clips):
        if not isinstance(clip, dict) or set(clip) != {'id', 'kind', 'start_frame', 'end_frame'}:
            raise ValueError('invalid_clip')
        identity = clip['id']
        if not isinstance(identity, str) or not 1 <= len(identity) <= 200 or not identity.strip() or any(ord(c) < 32 for c in identity):
            raise ValueError('invalid_identity')
        if clip['kind'] not in ('visual', 'audio'):
            raise ValueError('invalid_kind')
        start, end = clip['start_frame'], clip['end_frame']
        if type(start) is not int or type(end) is not int:
            raise ValueError('invalid_frame_type')
        if identity in ids:
            findings.append({'kind': 'duplicate_clip_identity', 'index': index})
        ids.add(identity)
        if not 0 <= start < end <= duration:
            findings.append({'kind': 'out_of_range_interval', 'index': index})
        elif clip['kind'] == 'visual':
            intervals.append((start, end))
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    cursor, gaps = 0, []
    for start, end in merged:
        if cursor < start:
            gaps.append([cursor, start])
        cursor = end
    if cursor < duration:
        gaps.append([cursor, duration])
    if raw['require_visual_coverage'] and gaps:
        findings.append({'kind': 'declared_visual_gap', 'gap_count': len(gaps)})
    return {'status': 'findings' if findings else 'passed', 'clip_count': len(clips), 'timebase': {'numerator': rate.numerator, 'denominator': rate.denominator}, 'duration_seconds_exact': str(Fraction(duration, 1) / rate), 'declared_visual_gap_count': len(gaps), 'uncovered_frame_count': sum(end-start for start, end in gaps), 'first_gaps': gaps[:10], 'finding_count': len(findings), 'findings': findings[:100], 'scope': 'Declared frame intervals only; actual visibility, pacing, media timebase and audio sync unverified.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='Local JSON; see references/timeline-manifest.md')
    args = parser.parse_args()
    try:
        with args.manifest.open('rb') as handle:
            content = handle.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError('input_too_large')
        def invalid_constant(_):
            raise ValueError('nonfinite_json')
        result = audit(json.loads(content.decode('utf-8'), object_pairs_hook=unique_pairs, parse_constant=invalid_constant))
    except (OSError, UnicodeError, ValueError, RecursionError, OverflowError):
        print(json.dumps({'status': 'invalid_input', 'scope': 'No timeline claim.'}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    sys.exit(main())
