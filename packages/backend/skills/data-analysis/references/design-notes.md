# Design notes and comparison scope

Reviewed source: [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/tree/2d6f7e22dd25593f0f748010430ef86f19659735/data/skills/analyze).

Pinned source commit: `2d6f7e22dd25593f0f748010430ef86f19659735`. Reviewed on2026-10-25.

The reviewed skill describes a question-to-analysis workflow across connected data and files. This package uses its own detailed instructions for metric grain, missing values, join multiplication, weighted rates, period alignment and interpretation. Its optional standard-library profiler handles bounded CSV data; other formats and warehouses require capabilities provided by the host.

The package instructions, templates and helper code are original project work. No upstream prompt or executable helper is bundled. The project license applies to our files; the referenced repository retains its own terms.

This is a design/coverage comparison, not a claim that every model performs better with this package. Discovery, helper execution and observed task quality are separate validation levels.

Business intelligence reference: [anthropics/knowledge-work-plugins — data/skills/build-dashboard](https://github.com/anthropics/knowledge-work-plugins/tree/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/data/skills/build-dashboard), commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`. Reviewed independently; no source template/code redistributed. Runtime network dependencies and privacy of shared exports require explicit verification.

## Campaign extension 1.2.0

Complete performance-report entrypoint reviewed: [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/marketing/skills/performance-report/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`. Earlier performance-analytics path returned404 at HEAD and was replaced by the verified report path. Our independent mode reuses analysis/reconciliation and adds campaign grain,attribution/currency/cost scope,overlap and causal limits. It does not copy benchmark tables,attribution rankings,fixed testing/cadence rules or queries. Less turnkey metric catalog coverage is explicit;no matched performance or causal-lift claim.

[Google Analytics Data API schema](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema) was checked for scope-specific dimensions/metrics. Actual platform definitions must be read for the task;we do not embed volatile API names as a universal conversion definition. No actual account query,paid experiment or campaign mutation ran.
