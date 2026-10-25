#!/usr/bin/env python3
"""Check ledger structure and traceability; never verify claim truth or fetch sources."""
import argparse
import datetime
import json
from pathlib import Path
import sys


def audit(data):
    if not isinstance(data, dict) or not isinstance(data.get('question'), str) or not data['question'].strip():
        raise ValueError('A non-empty question is required')
    sources, claims = data.get('sources'), data.get('claims')
    if not isinstance(sources, list) or not isinstance(claims, list) or len(sources) > 1000 or len(claims) > 1000:
        raise ValueError('Sources and claims must be bounded arrays')
    findings, by_id = [], {}
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            raise ValueError('Each source must be an object')
        identity = source.get('id')
        if not isinstance(identity, str) or not identity.strip() or identity in by_id:
            findings.append(f'Source {index + 1}: missing or duplicate ID')
            continue
        by_id[identity] = source
        for key in ['origin', 'location']:
            if not isinstance(source.get(key), str) or not source[key].strip():
                findings.append(f'Source {index + 1}: missing {key}')
        try:
            datetime.date.fromisoformat(source.get('checked', ''))
        except (ValueError, TypeError):
            findings.append(f'Source {index + 1}: invalid checked date')
    seen = set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            raise ValueError('Each claim must be an object')
        identity, refs, kind = claim.get('id'), claim.get('sources'), claim.get('kind')
        if not isinstance(identity, str) or not identity.strip() or identity in seen:
            findings.append(f'Claim {index + 1}: missing or duplicate ID')
        elif identity:
            seen.add(identity)
        if not isinstance(claim.get('text'), str) or not claim['text'].strip():
            findings.append(f'Claim {index + 1}: missing proposition')
        if kind not in ['fact', 'inference', 'unknown']:
            findings.append(f'Claim {index + 1}: invalid kind')
        if not isinstance(refs, list) or not all(isinstance(value, str) for value in refs):
            findings.append(f'Claim {index + 1}: invalid source references')
            continue
        if len(set(refs)) != len(refs) or any(ref not in by_id for ref in refs):
            findings.append(f'Claim {index + 1}: duplicate or unknown source reference')
        gap = claim.get('gap', '')
        if not isinstance(gap, str):
            findings.append(f'Claim {index + 1}: invalid gap')
            gap = ''
        if kind == 'fact' and not refs:
            findings.append(f'Claim {index + 1}: fact has no cited source')
        if kind == 'unknown' and not gap.strip():
            findings.append(f'Claim {index + 1}: unknown needs an explicit gap')
        origins = {by_id[ref].get('origin') for ref in refs if ref in by_id and isinstance(by_id[ref].get('origin'), str) and by_id[ref]['origin'].strip()}
        count = claim.get('independent_origins')
        if type(count) is not int or count != len(origins):
            findings.append(f'Claim {index + 1}: origin count differs from declared source origins')
    if not claims:
        findings.append('No claims recorded')
    return {'status': 'needs_review' if findings else 'mechanical_checks_passed', 'source_count': len(sources), 'claim_count': len(claims), 'findings': findings, 'truth_verified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ledger', type=Path, help='Local UTF-8 JSON ledger, at most 2 MB')
    args = parser.parse_args()
    try:
        with args.ledger.open('rb') as handle:
            raw = handle.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Ledger exceeds 2 MB')
        result = audit(json.loads(raw.decode('utf-8-sig')))
        print(json.dumps(result, ensure_ascii=True, allow_nan=False))
        return 1 if result['findings'] else 0
    except (OSError, ValueError, TypeError, RecursionError):
        print(json.dumps({'status': 'input_error', 'error': 'Cannot process ledger; check the documented format and size'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
