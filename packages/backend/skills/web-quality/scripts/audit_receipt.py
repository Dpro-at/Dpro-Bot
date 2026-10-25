#!/usr/bin/env python3
"""Check execution receipt fields and local evidence paths; never certify execution."""
import argparse
import json
from pathlib import Path, PurePosixPath, PureWindowsPath
import sys


def audit(data, root):
    if not isinstance(data, dict) or not isinstance(data.get('build'), str) or not data['build'].strip():
        raise ValueError('Build identity is required')
    cases = data.get('cases')
    if not isinstance(cases, list) or len(cases) > 1000:
        raise ValueError('Cases must be a bounded array')
    findings, seen = [], set()
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError('Evidence root must be a directory')
    for index, case in enumerate(cases):
        if not isinstance(case, dict):
            raise ValueError('Each case must be an object')
        identity, status = case.get('id'), case.get('status')
        if not isinstance(identity, str) or not identity.strip() or identity in seen:
            findings.append(f'Case {index + 1}: missing or duplicate ID')
        else:
            seen.add(identity)
        if status not in ['pass', 'fail', 'blocked', 'not-run']:
            findings.append(f'Case {index + 1}: invalid status')
        for field in ['action', 'expected', 'observed']:
            if not isinstance(case.get(field), str) or not case[field].strip():
                findings.append(f'Case {index + 1}: missing {field}')
        evidence = case.get('evidence')
        if not isinstance(evidence, list) or len(evidence) > 100 or not all(isinstance(value, str) and value for value in evidence):
            findings.append(f'Case {index + 1}: invalid evidence list')
            continue
        if status == 'pass' and not evidence:
            findings.append(f'Case {index + 1}: pass needs evidence')
        for value in evidence:
            try:
                portable = PurePosixPath(value)
                if '\\' in value or portable.is_absolute() or PureWindowsPath(value).drive or '..' in portable.parts:
                    raise ValueError('Invalid relative evidence path')
                target = (root / value).resolve(strict=True)
                if not target.is_relative_to(root) or not target.is_file() or target.stat().st_size == 0:
                    raise ValueError('Evidence must be a non-empty file within the root')
            except (OSError, ValueError, RuntimeError):
                findings.append(f'Case {index + 1}: missing or unsafe evidence path')
    if not cases:
        findings.append('No cases recorded')
    return {'status': 'needs_review' if findings else 'mechanical_checks_passed', 'case_count': len(cases), 'findings': findings, 'execution_verified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('receipt', type=Path, help='Local UTF-8 JSON receipt, at most 2 MB')
    parser.add_argument('--root', required=True, type=Path, help='Explicit local evidence directory')
    args = parser.parse_args()
    try:
        with args.receipt.open('rb') as handle:
            raw = handle.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('Receipt exceeds 2 MB')
        result = audit(json.loads(raw.decode('utf-8-sig')), args.root)
        print(json.dumps(result, ensure_ascii=True, allow_nan=False))
        return 1 if result['findings'] else 0
    except (OSError, ValueError, TypeError, RecursionError, RuntimeError):
        print(json.dumps({'status': 'input_error', 'error': 'Cannot process receipt; check the format, size and evidence root'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
