#!/usr/bin/env python3
"""Profile a bounded local UTF-8 CSV without changing or uploading its contents."""
import argparse
import csv
from decimal import Decimal, DecimalException, localcontext
import hashlib
import io
import json
import re
from pathlib import Path
import sys

MAX_BYTES = 10_000_000
MAX_ROWS = 100_000
MAX_COLUMNS = 500
DISTINCT_LIMIT = 1000


def digest(values):
    return hashlib.sha256(json.dumps(values, ensure_ascii=True, separators=(',', ':')).encode()).digest()


def profile(raw, delimiter=',', null_tokens=(), key=None):
    if len(raw) > MAX_BYTES:
        raise ValueError('Input exceeds 10 MB')
    if len(delimiter) != 1 or delimiter in '\r\n\0':
        raise ValueError('Delimiter must be one printable character')
    reader = csv.reader(io.StringIO(raw.decode('utf-8-sig'), newline=''), delimiter=delimiter, strict=True)
    try:
        headers = next(reader)
    except StopIteration as error:
        raise ValueError('CSV header is required') from error
    if not headers or len(headers) > MAX_COLUMNS or any(not name.strip() for name in headers) or len(set(headers)) != len(headers):
        raise ValueError('Headers must be non-empty, unique and at most 500 columns')
    if key is not None and key not in headers:
        raise ValueError('Requested key column is absent')
    columns = [{'name': name, 'null_count': 0, 'numeric_count': 0, 'non_numeric_count': 0, 'distinct': set(), 'distinct_limited': False, 'sum': Decimal(0), 'min': None, 'max': None} for name in headers]
    row_hashes, key_hashes = set(), set()
    rows = duplicates = key_missing = key_duplicates = 0
    key_index = headers.index(key) if key is not None else None
    null_tokens = set(null_tokens)
    missing = lambda value: not value.strip() or value in null_tokens
    with localcontext() as context:
        context.prec = 50
        for row in reader:
            if len(row) != len(headers):
                raise ValueError('A row has a different number of fields than the header')
            rows += 1
            if rows > MAX_ROWS:
                raise ValueError('Input exceeds 100000 data rows')
            row_hash = digest(row)
            duplicates += int(row_hash in row_hashes)
            row_hashes.add(row_hash)
            if key_index is not None:
                value = row[key_index]
                if missing(value):
                    key_missing += 1
                else:
                    key_hash = digest([value])
                    key_duplicates += int(key_hash in key_hashes)
                    key_hashes.add(key_hash)
            for column, value in zip(columns, row):
                if missing(value):
                    column['null_count'] += 1
                    continue
                value_hash = digest([value])
                if value_hash not in column['distinct']:
                    if len(column['distinct']) < DISTINCT_LIMIT:
                        column['distinct'].add(value_hash)
                    else:
                        column['distinct_limited'] = True
                try:
                    if not re.fullmatch(r'[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?', value.strip()):
                        raise ValueError('Not an unformatted decimal')
                    number = Decimal(value.strip())
                    if not number.is_finite() or (number and abs(number.adjusted()) > 1000):
                        raise ValueError('Not a supported finite decimal')
                    column['numeric_count'] += 1
                    column['sum'] += number
                    column['min'] = number if column['min'] is None else min(column['min'], number)
                    column['max'] = number if column['max'] is None else max(column['max'], number)
                except (DecimalException, ValueError):
                    column['non_numeric_count'] += 1
        result_columns = []
        for column in columns:
            count = column['numeric_count']
            result_columns.append({'name': column['name'], 'null_count': column['null_count'], 'non_null_count': rows - column['null_count'], 'distinct_count': len(column['distinct']), 'distinct_limited': column['distinct_limited'], 'numeric_count': count, 'non_numeric_count': column['non_numeric_count'], 'numeric_summary': None if not count else {'min': str(column['min']), 'max': str(column['max']), 'sum': str(column['sum']), 'mean': str(column['sum'] / count)}})
    return {'status': 'profile_complete', 'source_sha256': hashlib.sha256(raw).hexdigest(), 'rows': rows, 'columns': len(headers), 'duplicate_rows': duplicates, 'key_check': None if key is None else {'column': key, 'missing': key_missing, 'duplicates': key_duplicates}, 'column_profiles': result_columns, 'semantic_quality_verified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv_file', type=Path, help='Local CSV file, at most 10 MB')
    parser.add_argument('--delimiter', default=',', help='One-character field delimiter')
    parser.add_argument('--null-token', action='append', default=[], help='Documented literal missing marker; repeatable and case-sensitive')
    parser.add_argument('--key', help='Optional column to check for missing and duplicate keys')
    args = parser.parse_args()
    try:
        with args.csv_file.open('rb') as handle:
            raw = handle.read(MAX_BYTES + 1)
        result = profile(raw, args.delimiter, args.null_token, args.key)
        print(json.dumps(result, ensure_ascii=True, allow_nan=False))
        return 0
    except (OSError, ValueError, csv.Error, DecimalException, OverflowError):
        print(json.dumps({'status': 'input_error', 'error': 'Cannot profile CSV; check encoding, headers, row widths, delimiter, key and documented limits'}))
        return 2


if __name__ == '__main__':
    sys.exit(main())
