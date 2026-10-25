"""Audit an explicit local split manifest without reading features or training a model."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

MAX_BYTES = 4 * 1024 * 1024
MAX_RECORDS = 50000
NAMES = ('train', 'validation', 'test')


def pairs(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError('duplicate_json_key')
        result[key] = value
    return result


def identifier(value):
    return isinstance(value, str) and 0 < len(value) <= 200 and bool(value.strip()) and all(ord(c) >= 32 for c in value)


def timestamp(value):
    if not isinstance(value, str) or len(value) > 100:
        raise ValueError('invalid_timestamp')
    try:
        parsed = datetime.fromisoformat(value[:-1] + '+00:00' if value.endswith('Z') else value)
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            raise ValueError('missing_timezone')
        return parsed.astimezone(timezone.utc)
    except (ValueError, OverflowError):
        raise ValueError('invalid_timestamp') from None


def audit(raw):
    if not isinstance(raw, dict) or set(raw) != {'group_disjoint', 'chronological', 'splits'}:
        raise ValueError('invalid_top_level')
    if type(raw['group_disjoint']) is not bool or type(raw['chronological']) is not bool:
        raise ValueError('invalid_mode')
    splits = raw['splits']
    if not isinstance(splits, dict) or set(splits) != set(NAMES):
        raise ValueError('invalid_splits')
    if any(not isinstance(splits[name], list) for name in NAMES):
        raise ValueError('invalid_split_records')
    if not splits['train'] or not splits['test']:
        raise ValueError('empty_required_split')
    if sum(len(splits[name]) for name in NAMES) > MAX_RECORDS:
        raise ValueError('too_many_records')
    ids, groups, times, findings = {}, {}, {}, []
    for name in NAMES:
        ids[name], groups[name], times[name] = set(), set(), []
        duplicate_count = 0
        for record in splits[name]:
            if not isinstance(record, dict) or not set(record) <= {'id', 'group', 'time'} or not identifier(record.get('id')):
                raise ValueError('invalid_record')
            if record['id'] in ids[name]:
                duplicate_count += 1
            ids[name].add(record['id'])
            if raw['group_disjoint'] and 'group' not in record:
                raise ValueError('missing_group')
            if 'group' in record:
                if not identifier(record['group']):
                    raise ValueError('invalid_group')
                groups[name].add(record['group'])
            if raw['chronological'] and 'time' not in record:
                raise ValueError('missing_timestamp')
            if 'time' in record:
                times[name].append(timestamp(record['time']))
        if duplicate_count:
            findings.append({'kind': 'duplicate_sample', 'splits': [name], 'count': duplicate_count})
    for i, earlier in enumerate(NAMES):
        for later in NAMES[i + 1:]:
            overlap = ids[earlier] & ids[later]
            if overlap:
                findings.append({'kind': 'sample_overlap', 'splits': [earlier, later], 'count': len(overlap)})
            if raw['group_disjoint']:
                overlap = groups[earlier] & groups[later]
                if overlap:
                    findings.append({'kind': 'group_overlap', 'splits': [earlier, later], 'count': len(overlap)})
            if raw['chronological'] and times[earlier] and times[later] and max(times[earlier]) >= min(times[later]):
                findings.append({'kind': 'chronology_violation', 'splits': [earlier, later], 'count': 1})
    return {'status': 'findings' if findings else 'passed', 'counts': {name: len(splits[name]) for name in NAMES}, 'findings': findings, 'scope': 'Structural manifest checks only; semantic leakage and study suitability are unverified.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path, help='Local JSON manifest; see references/split-manifest.md')
    args = parser.parse_args()
    try:
        with args.manifest.open('rb') as handle:
            data = handle.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError('input_too_large')
        def invalid_constant(_):
            raise ValueError('nonfinite_json')
        raw = json.loads(data.decode('utf-8'), object_pairs_hook=pairs, parse_constant=invalid_constant)
        result = audit(raw)
    except (OSError, UnicodeError, ValueError, RecursionError, OverflowError):
        print(json.dumps({'status': 'invalid_input', 'scope': 'No split validity claim.'}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 1 if result['findings'] else 0


if __name__ == '__main__':
    sys.exit(main())
