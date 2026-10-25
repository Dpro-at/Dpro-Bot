#!/usr/bin/env python3
"""Check an explicit editorial claim map; never certify prose or source accuracy."""
import argparse
import json
from pathlib import Path
import sys


def audit(data):
    if not isinstance(data, dict) or any(not isinstance(data.get(key), str) or not data[key].strip() for key in ['brand', 'channel']):
        raise ValueError('Brand and channel are required')
    claims = data.get('claims')
    if not isinstance(claims, list) or len(claims) > 1000:
        raise ValueError('Claims must be a bounded array')
    findings, seen = [], set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            raise ValueError('Each claim must be an object')
        identity = claim.get('id')
        if not isinstance(identity, str) or not identity.strip() or identity in seen:
            findings.append(f'Claim {index + 1}: missing or duplicate ID')
        else:
            seen.add(identity)
        if not isinstance(claim.get('text'), str) or not claim['text'].strip():
            findings.append(f'Claim {index + 1}: missing text')
        status, refs = claim.get('status'), claim.get('sources')
        if status not in ['supported', 'inference', 'fictional', 'unresolved']:
            findings.append(f'Claim {index + 1}: invalid status')
        if not isinstance(refs, list) or not all(isinstance(value, str) and value.strip() for value in refs):
            findings.append(f'Claim {index + 1}: invalid source references')
        elif status == 'supported' and not refs:
            findings.append(f'Claim {index + 1}: supported claim has no source reference')
        if status == 'unresolved':
            findings.append(f'Claim {index + 1}: unresolved claim needs editorial action')
    return {'status': 'needs_review' if findings else 'mechanical_checks_passed', 'claim_count': len(claims), 'findings': findings, 'editorial_approval': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('claim_map', type=Path, help='Local UTF-8 JSON map, at most 2 MB')
    args = parser.parse_args()
    try:
        with args.claim_map.open('rb') as handle:
            raw = handle.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Claim map exceeds 2 MB')
        result = audit(json.loads(raw.decode('utf-8-sig')))
        print(json.dumps(result, ensure_ascii=True, allow_nan=False))
        return 1 if result['findings'] else 0
    except (OSError, ValueError, TypeError, RecursionError):
        print(json.dumps({'status': 'input_error', 'error': 'Cannot process claim map; check the documented format and size'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
