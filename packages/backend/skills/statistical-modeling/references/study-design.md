# Study design and inferential boundaries

## Modes

An exploratory analysis discovers patterns; confirmatory analysis evaluates a specified proposition; prediction estimates future or unknown outcomes; causal inference estimates an intervention effect under a defensible design. A task can include several modes, but each conclusion needs the right evidence. Do not present an exploratory pattern as a preregistered finding.

State target population, sample, observational unit, treatment/exposure if relevant, outcome, time window and estimand. Record selection into the dataset and outcome observation. Missing labels may be systematically related to the outcome. Complete-case analysis can change the target population; imputation can add assumptions rather than restore truth automatically.

## Dependence and uncertainty

Repeated rows from one person, store, device or time period may not be independent. Choose splitting and uncertainty methods appropriate to the relevant dependence. A very large row count can still represent few independent units. Avoid precision that ignores clustering or temporal dependence.

Specify what an interval describes and how it was obtained. A confidence interval, predictive interval and distribution of model samples answer different questions. Check the assumptions and observed coverage that matter for the intended use. Report unverified assumptions rather than choosing a familiar formula and declaring it valid.

## Selection and comparisons

Define the baseline and decision metric before extensive tuning when feasible. Preserve an untouched final evaluation route. If the work is exploratory, label it and record the selection process so later confirmation can be designed appropriately. Multiple outcomes, subgroup searches and repeated peeking can change interpretation; do not report the smallest p-value as if it came from one planned test.

## Causal claims

A causal question needs a credible identification strategy, not only a regression coefficient. Consider confounding, selection, treatment timing, interference and measurement. Explain what the available design supports and what remains an assumption. When the evidence is observational and the design insufficient, report association and the study that would improve identification. This workflow does not certify an intervention is safe or beneficial.
