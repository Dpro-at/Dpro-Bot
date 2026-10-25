---
name: financial-operations
description: Prepare accounting workpapers, budgets and financial reports with explicit entity/period/framework, source reconciliation, traceable calculations and review status. Use for journal preparation, reconciliations, variance analysis and reporting drafts.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini;actual file, calculation, ledger and external capabilities depend on the host.
metadata:
  agent-player:
    version: 1.1.0
---

# Financial operations

Produce a traceable financial work product for a named entity, period and decision. Start with the actual source records, accounting/reporting basis and authorized task. A balanced journal, formatted statement or persuasive narrative is not by itself evidence of correct recognition, complete data or approved reporting.

Read [Runtime contract](references/runtime-contract.md) in a new host. Maintain source, comments and workpaper templates in English. Inspect supplied policies, chart of accounts, source extracts, existing models and reporting requirements. Do not assume US GAAP, IFRS, tax basis, currency, scale or materiality from a template.

## Establish the financial contract

Use [Workpaper contract](assets/workpaper-contract.md). Name the entity/scope, period/as-of date, reporting basis, currency/unit, source version, sign convention and intended output. Distinguish management analysis from statutory reporting and draft preparation from posting/sign-off. Identify missing data or policy choices before calculating a fictional complete answer.

Read [Data and calculation controls](references/data-controls.md) for source mapping, precision and evidence. For accounting entries and reconciliations, read [Accounting workpapers](references/accounting-workpapers.md). For budgets, forecasts and drivers, read [Planning and variance](references/planning-variance.md). For statement preparation and disclosure readback, read [Financial reporting](references/financial-reporting.md).

## Prepare the requested output

Keep source data, transformations, assumptions and results separable. Preserve stable IDs and trace lines back to their evidence. Verify scope, cutoff, units, signs, account mappings and comparison basis. Label estimates and incomplete sources;do not plug a difference to zero, guess unreadable amounts or manufacture a business cause for a variance.

Use [Entry and reconciliation record](assets/entry-reconciliation.md),[Budget bridge](assets/budget-bridge.md) or [Report review](assets/report-review.md) as appropriate. The optional [Journal arithmetic audit](references/journal-audit.md) checks a declared single-currency entry's decimal totals and one-sided lines. It cannot validate account meaning, cutoff, recognition, authorization or completeness.

## Review evidence and authority

Recompute material totals and tie the output to the intended source/control balances. Inspect unresolved differences and the actual supporting documents. Keep preparation, review, approved-to-post, posted and published states distinct. Posting entries, changing budgets, closing periods, filing reports or sending financial information retain the user's applicable authorization and service controls.

Use current authoritative standards/policy for the relevant entity, period and transaction when interpretation matters. Do not combine rules from different frameworks or copy a source example's approval threshold. Record unresolved domain review rather than presenting a draft as an audited or certified result.

## Deliver

State what was prepared, which sources/calculations were verified, remaining differences and the true review/activation state. Keep private payroll, bank, customer and credential data out of shared settings/artifacts. [Acceptance briefs](references/acceptance.md) define future task trials;[Design notes](references/design-notes.md) record comparison scope. Native parsing/discovery and synthetic arithmetic checks do not establish live accounting/reporting acceptance.

For invoice preparation,corrections and receivable follow-up,read [Invoicing](references/invoicing.md) and use [Invoice review](assets/invoice-review.md). Preserve draft,issued,sent,paid and corrected states separately.
