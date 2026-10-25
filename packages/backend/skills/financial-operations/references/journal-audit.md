# Journal arithmetic audit

Optional standard-library helper:`python3 scripts/audit_journal.py <entry.json>`. It reads one explicitly declared single-currency entry and reports decimal debit/credit totals, difference and bounded line findings. It does not post anything or inspect ledger/account/period/policy/approval validity.

## Exact contract

UTF-8 JSON, at most 1 MiB, root exactly currency, scale, lines. Currency is a three-uppercase-ASCII-letter label, not validation against an ISO or entity currency catalog. Scale is an integer 0–6, not a boolean. Lines is a nonempty array of at most 10000 objects, each exactly account, debit, credit. Account is a 1–80 character nonblank string used only as a declared label;it is not echoed or checked against a ledger.

Debit and credit are nonnegative decimal strings:no sign, exponent, commas, leading zeros except zero itself, or more than 15 integer digits/6 fractional digits. Fractional precision cannot exceed the declared scale;no implicit rounding is performed. Duplicate JSON keys, nonfinite constants, invalid/extra fields, encoding/type/size/record violations are rejected.

Each declared posting line should have exactly one positive side. Both-positive or both-zero lines are findings;their stated amounts still contribute to the arithmetic totals. An entry with unequal totals is a finding. Output includes exact fixed-scale totals, aggregate counts, up to 100 numeric line-index findings and the full count. Equal totals do not override invalid-line findings.

Exit 0:no structural/arithmetic findings. Exit 1:findings. Exit 2:invalid/unreadable/out-of-bounds input. A successful audit cannot verify that an entry is complete, correctly recognized, approved or fit to post. Use the meaningful workpaper and real domain review. The central Markdown-only app edition omits scripts;full native archives retain the helper.
