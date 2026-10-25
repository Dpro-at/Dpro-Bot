---
name: statistical-modeling
description: Design and evaluate statistical or predictive analyses with explicit estimands, leakage-aware splits, appropriate baselines, uncertainty and reproducible evaluation. Use for data science, model comparisons and inferential studies.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; tools and data access depend on the host.
metadata:
  agent-player:
    version: 1.1.0
---

# Statistical modeling

Answer the actual analytical or predictive question using an evaluation that matches how the result will be used. Separate exploratory discovery, confirmatory inference, prediction and causal claims. A strong test score can reflect leakage, an unsuitable population or repeated selection rather than useful performance.

Read [Runtime contract](references/runtime-contract.md) in a new host. Read [Study design](references/study-design.md), [Splits and leakage](references/splits-leakage.md), and [Evaluation](references/evaluation.md) for the relevant mode. Use [Study contract](assets/study-contract.md), [Model card](assets/model-card.md) and [Acceptance](references/acceptance.md). The optional local split helper checks a narrow structural property; it does not establish that the features are available at prediction time.

## Define what is being estimated

Identify the decision, target population, observational unit, outcome, time horizon and cost of error. For inference, state the estimand and assumptions. For prediction, state when the prediction is made and which inputs exist then. For causal questions, distinguish the desired effect from associations the available design can support.

Inspect the source, grain, sampling, missingness, label generation and known selection processes. Clarify ambiguous target meaning before training. Distinguish genuine zeros, unobserved outcomes and missing values. A convenient label is not necessarily a valid measure of the business outcome.

Record the dataset/version, environment, approved tools, resource budget and privacy boundary. Reuse existing project code and baseline definitions. Do not install a framework, send data to an external model or start a training service solely because this workflow names modeling.

## Design evaluation before selection

Choose a split that reflects deployment. Time-dependent prediction commonly needs a chronological boundary; repeated entities can require grouped separation; some tasks legitimately predict future outcomes for previously observed entities. Explain the intended generalization rather than imposing one universal split.

Reserve an appropriate final evaluation set and keep model/threshold selection inside training/validation. Fit preprocessing, imputation, scaling and feature selection using only the allowed training fold, then apply the learned transformation to held-out data. Check label timing, post-outcome features, duplicate entities and cross-fold histories. Repeatedly inspecting the final test set turns it into selection data.

Use [Splits and leakage](references/splits-leakage.md). The optional `scripts/audit_splits.py` checks duplicate sample IDs, configured entity overlap and strict chronological ordering for an explicit local manifest. Read [Split manifest](references/split-manifest.md) and `--help` first. Passing this mechanical check cannot prove the absence of semantic or target leakage.

## Choose a defensible baseline and method

Read [Method selection and sensitivity](references/method-selection.md) when choosing an estimator or handling missingness.

Start with a baseline appropriate to the task, such as a simple heuristic, previous operational method or a small interpretable model. Compare all candidates under the same population, target, split and metric definitions. Do not compare a tuned candidate with an artificially weak baseline or report only the favorable slice.

For inference, inspect assumptions, dependence, selection and confounding. Choose uncertainty estimation compatible with the unit of dependence and sampling design. For predictive modeling, select complexity and tuning from the available data, task and budget. A larger model is not automatically more useful. Avoid making a causal claim from ordinary feature importance or predictive accuracy.

Keep exploratory choices and confirmatory claims separate. If many hypotheses, subgroups or candidate models are examined, account for selection when interpreting evidence. Do not invent precise confidence from an unsupported distribution or treat a p-value as the probability a hypothesis is true.

## Evaluate the decision, not only the score

Use [Evaluation](references/evaluation.md). Report the baseline, candidate metrics, evaluation population, uncertainty and important failure slices. Select metrics from error costs and prevalence. For classification, threshold-dependent rates, calibration and precision/recall can matter beyond accuracy; for forecasts, horizon and temporal backtesting affect interpretation.

A probability needs calibration evidence before being presented as a reliable frequency. A point prediction needs the relevant error distribution or uncertainty limits when used for decisions. Distinguish estimated intervals, model sampling variability and observed out-of-sample coverage. Do not label arbitrary model spread as a calibrated probability interval.

Inspect important subgroups and missing-data patterns where permitted and relevant. Preserve privacy when groups are small. An observed disparity can require investigation; it is not by itself a complete explanation of cause. State where the sample does not support a reliable subgroup conclusion.

## Reproduce and communicate

Record code/ref, data version, split policy, preprocessing, seed where applicable, environment, hyperparameter/threshold selection and actual evaluation results. Reproducibility includes data and feature availability, not merely a random seed. Keep private rows and identifiers out of a shared model card.

Deliver the actual analysis or requested model artifacts, findings, limitations and the decision implications. Separate a local experiment, a validated model, a deployed service and a monitored production system. Deployment, account changes, paid compute and automated decisions require the applicable authorization.

State which next observation could overturn the conclusion. If the data cannot support the desired causal or predictive claim, provide the supported bounded answer and useful next study rather than a confident unsupported model.

[Design notes](references/design-notes.md) record reviewed sources and comparison limits.

## Engineering delivery mode

For reproducible training pipelines, model artifacts, serving parity and release handoff, read [Machine learning engineering](references/ml-engineering.md). Keep the target, leakage, evaluation and authorization boundaries above; an engineered pipeline is not proof of statistical validity or production deployment.
