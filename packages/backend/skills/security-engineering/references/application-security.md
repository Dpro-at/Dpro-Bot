# Application security workflow

## Understand the application

Identify the actual languages, frameworks, entrypoints, persistence, background workers and deployment model. Map trust boundaries around authentication, authorization, tenant ownership, parsers, uploads, external calls and administrative actions. Inspect both client assumptions and server enforcement. A hidden UI control does not establish backend authorization; a session identity does not imply permission for every object.

Choose review depth from asset risk and the requested scope. For a changed path, trace callers, data transformations and downstream effects, including asynchronous jobs and error handling. For a broader assessment, maintain coverage of entrypoints and explicit omissions. Use current framework documentation for specific safe APIs rather than transplanting another framework's middleware.

## Investigate relevant failure modes

Inspect whether input remains attacker-controlled at sensitive boundaries: queries, commands, templates, redirects, filesystem operations, deserialization and rendering. Check context-appropriate encoding and parameterization; a generic sanitizer does not address every sink. Validate uploads against actual consumption paths and isolation, not just filename extensions.

Review identity lifecycle, session/token handling, object- and action-level authorization, CSRF where applicable, cross-origin policy and rate/resource bounds. For multi-tenant systems follow ownership checks through read/write/list/export and background paths. Examine password recovery, invitations and privilege changes with their real replay/expiry/transaction semantics. Random IDs reduce guessing but cannot replace access checks.

Inspect dependency and supply-chain exposure in context: deployed version, reachable feature, lockfile/build path and advisory conditions. A package-name match alone is not exploitability evidence. Review CI credentials and untrusted contributions separately from runtime permissions. Avoid executing untrusted install scripts while gathering evidence.

## Validate and recommend

For each candidate show the source/configuration path and minimal safe reproduction strategy. Prefer an isolated synthetic fixture, with positive and negative cases across principals or tenants where relevant. Do not collect another user's real records to prove access. If reproduction is not authorized or available, label the finding accordingly.

Recommend controls at the effective boundary with failure behavior and migration impact. A fix for one route may require a shared guard; confirm callers before widening changes. Check meaningful regressions such as intended owner access, rejected cross-tenant access and failed/stale requests. Deliver a report or authorized patch with coverage, residual risk and deployment verification still needed. This workflow does not promise a vulnerability-free application.
