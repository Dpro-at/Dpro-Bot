# CSV profiler

The optional script uses Python3.10+ standard-library `csv`, `decimal` and hashing. It reads one explicit local CSV file and writes a JSON profile to standard output. It does not modify the source, execute formulas, access a network, install packages or send data to a model.

```text
python3 path/to/data-analysis/scripts/profile_csv.py dataset.csv --key record_id
```

Use `--delimiter` for a known one-character delimiter. Repeat `--null-token` only when a documented literal represents missing data; empty or whitespace-only values are always missing. Missing markers are case-sensitive. UTF-8 with an optional BOM is supported. Other encodings should be converted through an explicit, recorded preparation step.

The input limit is10MB,100000data rows and500columns. Duplicate/empty headers and malformed row widths are rejected. The script does not silently truncate; an exceeded limit is an input error. A CSV must have a header; a header-only file produces a zero-row profile.

Outputs include source SHA256, row and column counts, exact duplicate-row count, null counts, bounded distinct counts and conservative finite-decimal numeric summaries. An optional key reports missing keys and repeated nonmissing key values. No raw category values or record samples are printed.

Distinct counts are exact until1000different values per column; after that `distinct_limited` is true and the count is a lower bound. Duplicate rows are exact comparisons of parsed cells before semantic normalization. Numeric summaries cover parseable finite-decimal cells only; `numeric_count` and `non_numeric_count` make mixed columns visible. Finite decimal values are summarized with50-digit calculation precision and an exponent magnitude limit of1000; values outside that limit count as nonnumeric. Currency, thousands separators and dates are not inferred or converted.

Exit0 means profiling completed. Exit2 means the input or invocation could not be processed. A completed profile is not a business-data quality pass; interpret findings using the metric definition and source semantics.
