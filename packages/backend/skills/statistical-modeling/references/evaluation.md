# Evaluation, decision costs and reporting

## Comparable evidence

Compare baseline and candidates on the same input population, target, split, horizon, preprocessing constraints and metric implementation. Report meaningful denominators and missing/excluded cases. A candidate evaluated on easier cases is not directly comparable with a baseline evaluated on the full population.

For imbalanced classification, accuracy can conceal poor minority-event detection. Examine precision/recall and the operational threshold/cost tradeoff when relevant. A threshold selected on the test set is selection leakage. For regression, inspect error distribution and important scales; a mean can hide rare catastrophic errors. For forecasts, report horizon, temporal backtest windows and the baseline appropriate to the series.

## Calibration and uncertainty

Discrimination and calibration are distinct. A model can rank cases well while producing unreliable probabilities. Evaluate calibration on appropriate held-out observations before using probabilities as frequencies. A probabilistic forecast needs observed coverage/score evidence for its intended horizon and population; a set of generated paths is not automatically calibrated.

Distinguish measurement uncertainty, sampling variation and model instability. Report the method and assumptions. Do not imply a narrow interval accounts for dataset shift or an unobserved confounder unless the analysis actually does so.

## Failure analysis

Inspect errors by meaningful cohort, time, missingness and operating condition, respecting data access and group privacy. Use failures to identify concrete limitations or further tests. A small subgroup with few outcomes may not support a precise metric. Avoid declaring fairness, robustness or causality from a single aggregate score.

## Reproducibility and state

Record dataset/ref, split generation, feature cutoff, preprocessing fit scope, model/config, selection history, environment and actual results. A fixed seed helps repeat one stochastic path but does not freeze data or guarantee cross-platform identity. Keep local experiment, validated artifact, deployed model and monitoring state separate.

Deliver decision implications and limits in plain language. A statistically detectable difference can be practically small; a useful operational difference can remain uncertain with limited data. Report both evidence and consequence without inventing business lift.
