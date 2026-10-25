# Data and calculation controls

Identify the population before analyzing it. Record entity/legal scope, ledger/book, period or as-of time, posted/draft status, currency, unit scale and source extraction version. A report with the right total but wrong entity or cutoff is not a reliable workpaper.

## Source boundary

Preserve source identifiers and a reproducible mapping to the output. Check required columns, types, missing values, duplicates, filters and exclusions. Distinguish a true zero from absent, unreadable, not applicable or withheld data. An empty extract can mean a failed permission/query rather than no activity.

Reconcile opening balances, movements and closing balances when that model applies. Check detailed records against intended control totals and investigate differences. Row counts alone cannot establish completeness. Keep source and adjustment populations distinct so a journal is not counted twice in both imported and manual movements.

## Precision and meaning

Use an appropriate exact decimal or integer minor-unit representation for money. Define currency and precision per source/output;not every currency or analysis uses two decimal places. Keep raw values separate from display rounding and state the rounding policy. Do not sum different currencies without a documented conversion basis.

Specify debit/credit or signed-value conventions explicitly. A negative expense in one export may represent a credit, not a reversal of every business meaning. Confirm account classification and desired presentation. Financial ratios need a defined denominator and period;an average balance, closing balance and transaction flow are different quantities.

For foreign exchange, record rate source, date, type, direction and the policy being applied. A translation rate for reporting is not automatically the rate for transaction recognition. Verify framework/entity policy rather than inventing an exchange-rate convention. Keep estimates, sensitivities and observed values labeled.

## Calculation review

Check formulas, range boundaries, units, signs, duplicated subtotals and hard-coded assumptions. For spreadsheets, inspect actual formulas/recalculation and exported readback when tools permit. A screenshot does not prove a formula or hidden row is correct. For scripted calculations, record inputs/runtime and independently meaningful expected results.

Keep unresolved items visible with identity, amount, reason, evidence and next action under the permitted privacy scope. Do not silently exclude difficult records to obtain agreement. Protect source files and use authorized disposable copies for transformations. No live ledger/budget write follows from calculating a draft.
