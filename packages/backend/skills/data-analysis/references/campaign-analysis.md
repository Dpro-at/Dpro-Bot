# Campaign measurement and decision analysis

## Define the measurement boundary

Identify campaign/account,objective,audience,channels,reporting window/timezone,comparison period,currency and available source snapshots. Map campaign IDs and naming to actual records;similar labels across platforms are not stable joins. Establish the event grain,user/session/order identity and relevant conversion/value definition before aggregating.

Check source latency,attribution model/window,view-through versus click-through credit,consent/tracking gaps,refunds,cancellations and currency/tax treatment. Current platform schemas distinguish scopes such as session acquisition and event/key-event attribution;confirm the actual API fields rather than copying a generic conversion definition. Missing records are not zero performance.

## Reconcile

Tie spend,traffic,outcomes and value to the intended source and scope. Detect duplicated exports,join multiplication,late-arriving conversions and overlapping channel credit. Cross-platform attributed conversions/revenue can double count the same business event. If no common identity exists,show separate platform-reported totals and their limits rather than adding them as unique customers.

Calculate rates from compatible numerator/denominator totals,not an unweighted mean of row rates. Keep CTR,CPC,CPA,ROAS,profit-based return and full acquisition cost distinct;state which costs/values are included. A zero denominator yields an undefined/not-applicable result,not automatic zero or infinity. Reconcile decisive figures using the existing data-analysis method and optional profiler only within its documented scope.

## Interpret and recommend

Compare like windows and relevant segments while accounting for budget,audience,offer,seasonality,tracking changes and sample size. Attribution assigns credit under a model;it does not prove incremental causal impact. A data-driven model is not automatically the best ground truth. Distinguish observed association,causal hypothesis,forecast and proposed experiment.

Tie recommendations to evidence,objective,constraints and a specific uncertainty-reducing next check. Do not scale or pause ads,change bids,activate tracking or spend money from a report request. A proposed test needs metric,population,allocation,analysis/stopping rules and adequate observation for the actual design;avoid universal sample-count or one-week requirements.

## Delivery

Lead with the scoped result and material limitations,then supporting definitions/source identities,reconciled calculations and priorities. Show unknowns and incompatible sources explicitly. Retain a reproducible query/transformation receipt. A valid CSV/profile or polished chart does not establish attribution accuracy,causal lift or paid-channel acceptance.
