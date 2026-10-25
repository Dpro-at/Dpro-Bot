# Method selection and sensitivity

Select a method from the estimand, outcome support, dependence and data-generation process, not only from a normality test. Verify the installed library's version-specific API before implementing an example. No dependency installation is implied.

| Situation | Candidate approach | Decision that must be checked |
|---|---|---|
| Continuous outcome | Linear/robust/quantile model as appropriate | Functional form, dependence, tails and the quantity being estimated |
| Binary event | Probability model with suitable link or another justified classifier | Prevalence, calibration, threshold/error costs and outcome timing |
| Count | Count model or other justified estimator | Exposure, overdispersion, excess zeros and dependence |
| Time-to-event | Survival approach | Censoring mechanism, time origin and model assumptions |
| Ordered categories | Ordinal model or justified alternative | Ordering and any proportional-effect assumption |
| Time-dependent prediction | Temporal baseline and rolling/expanding evaluation | Horizon, feature cutoff, seasonality, corrections and leakage |
| Group comparison | Estimator/test matched to paired/independent/clustered design | Effect size, uncertainty, selection and practical consequence |

A hypothesis test on a distribution does not certify every model assumption. Diagnose residual structure, dependence and relevant model misspecification for the actual goal. Choosing a nonparametric method does not remove all assumptions. Robust standard errors can address particular variance assumptions; they do not fix confounding, leakage or an incorrectly defined outcome.

## Missingness

Describe what is missing and how observation depends on known or unobserved factors. Missingness mechanisms are assumptions, not labels a dataset automatically reveals. Complete-case analysis can change the target population. Imputation can be useful but requires a model and a fit scope that respects the split. Multiple-imputation inference needs valid generation and pooling, not merely several identical filled tables. Do not forward-fill across a prediction boundary using information unavailable at the prediction moment.

## Sensitivity

Choose the uncertain assumptions most likely to change the decision: inclusion rules, outlier handling, functional form, missingness model, clustering, horizon or confounding. Recompute a meaningful alternative and explain whether the conclusion survives. Do not present a long list of nearly identical models as independent confirmation.

Bootstrap or resampling should follow the dependence unit and sampling design; resampling individual rows can understate uncertainty when observations cluster. A small number of independent units limits confidence even when many rows exist. State unresolved sensitivity rather than supplying unsupported precision.

## Reproducible implementation

Retain code/ref, data version, method/config, training-only preprocessing and actual diagnostic/evaluation outputs. Use a small interpretable baseline to catch unit, label and leakage mistakes before extensive tuning. A successful library call proves execution of that call, not suitability of the estimator or reliability of its interval.
