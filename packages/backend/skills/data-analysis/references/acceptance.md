# Data acceptance

| Scenario | Expected result | Failure signal |
|---|---|---|
| Missing versus zero | Values retain their distinct meanings. | Missing entries silently become zero. |
| Order-line join | Counts and amounts remain at the intended grain. | Inflated revenue after one-to-many expansion. |
| Unequal segment sizes | Total rate is calculated from compatible counts. | Unweighted average of subgroup percentages. |
| Incomplete current period | Comparison is aligned or visibly qualified. | Full-month decline inferred from partial data. |
| Zero baseline | Relative change is undefined and explained. | Arbitrary or infinite growth claim. |
| Duplicate/invalid CSV structure | Input is rejected with an actionable error. | Fields silently shift to the wrong columns. |
| Unsupported causal claim | Association and plausible explanations are separated. | Trend is called proof of cause. |

Retain representative inputs and independently checked expected figures. A helper's counts and profile can be tested deterministically; the final interpretation still requires review against the question and data context.

## Campaign briefs

Two channels claim the same purchase:expect overlap/deduplication limits rather than summed unique conversions. An export mixes currencies and row conversion rates:expect normalized basis and ratio-of-compatible-totals,not a naive average. A strong ROAS report must not claim causal lift or execute budget changes without authority.
