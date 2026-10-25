---
name: search-visibility
description: Audit organic search visibility using traceable crawl, rendering, indexing and query evidence; produce prioritized fixes and measurement plans. Use for technical SEO, content discovery, local or international search diagnosis.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; tools and access depend on the host.
metadata:
  agent-player:
    version: 1.0.0
---

# Search visibility

Find the highest-value supported explanation for a site's organic search problem and provide a verifiable repair plan. Separate observed defects from hypotheses about ranking. A static page audit cannot establish search-engine index state, and a recommendation cannot guarantee traffic or position.

Read [Runtime contract](references/runtime-contract.md) in a new host. Read [Technical diagnosis](references/technical-diagnosis.md) for crawling/rendering/indexing, [Content and intent](references/content-intent.md) for query/page decisions, and [Local and international](references/local-international.md) only for those site types. Use [Finding record](assets/finding-record.md), [Measurement plan](assets/measurement-plan.md) and [Acceptance](references/acceptance.md) for a reviewable result.

## Establish scope and evidence access

Identify the site, business goal, target markets/languages, important page types, symptoms, date range and recent changes. Inspect available Search Console or webmaster exports, analytics, crawl data, source and rendered pages. Reuse existing connected sources and approved exports. Access to a public URL does not imply access to its analytics or permission to crawl without bounds.

For a large site, choose a representative sample by page type, business value, index status and known failures. Record the sampling rule and excluded areas. A handful of pages cannot justify a site-wide pass. Distinguish a migration, traffic drop, new launch, local visibility issue and routine content review; each calls for different evidence.

Treat third-party scores and model-generated audits as leads. Verify decisive findings against original observations or current official search-engine guidance. Record URL, checked date, relevant source/render layer and evidence. Do not install tools or create accounts as a prerequisite when the requested work can proceed with available material.

## Diagnose the search pipeline

Follow the actual path: discovery, crawl access, response, rendering, canonicalization, indexing and eligibility for the intended query/result feature. At each stage, distinguish observed behavior from search-engine decisions. A sitemap entry requests discovery; it does not prove indexing. A canonical element expresses a preference; it does not prove the engine selected it.

Inspect redirects, status codes, robots directives, canonical targets, navigation and sitemap consistency on relevant samples. Capture actual HTTP headers when available; a rendered DOM cannot reveal all header-level directives. Inspect source and rendered content where JavaScript matters. A text extraction tool may omit scripts and therefore cannot establish that structured data is missing.

For performance, distinguish local lab diagnostics from field data and the page/device/time window each represents. Use available official tools when authorized and current. Do not diagnose a whole origin from a single laptop run or convert a performance metric into a guaranteed ranking change.

## Connect queries to useful pages

Use real query data when supplied. Otherwise label keyword/intent ideas as hypotheses rather than attaching invented search volumes or difficulty scores. Map each important intent to an existing page and assess whether that page meets the user's need, provides accurate material and supports the business goal.

Review titles, snippets, headings, internal links, media and the actual main content. Suggested lengths are editorial guides, not mechanical pass/fail ranking rules. Several headings or a title outside a preferred character range do not by themselves prove a search defect. Avoid keyword stuffing and location or language pages that only swap nouns without meaningful content.

Check whether allegedly competing pages actually serve the same intent and whether there is evidence of harmful overlap. Merging or redirecting pages can lose distinct intent or valuable inbound links. Recommend consolidation only with an evidence-based mapping and a preservation plan. Do not delete pages or change redirects solely on a thin-content score.

## Inspect specialized contexts when relevant

For local search, distinguish business-profile visibility, local-result competition and the website's organic performance. Verify real business details and eligibility before recommending profile changes. Do not invent branches, addresses, reviews or service claims.

For international sites, inspect URL strategy, translated main content, canonical/hreflang consistency and reciprocal, reachable alternates. Do not assume every country needs a page. Specify which language/region pairs are actually intended and verify the applicable official contract before proposing implementation.

For structured data, distinguish presence, parse validity, vocabulary correctness, feature eligibility and actual display. A valid JSON-LD object is not a promise of a rich result. Never generate false ratings, review counts or product availability to qualify for a result type.

## Prioritize repairs with observable checks

Create one finding per distinct defect or hypothesis. Include affected URLs/page type, evidence layer, consequence, confidence, proposed change, owner/dependency and verification. Separate crawl/index blockers, user-facing accuracy defects and optional experiments. Rank by likely business impact, reach, confidence and effort without fabricating precise forecasts.

A useful fix names the concrete configuration, template or content change and how to verify it. A broad instruction to “improve SEO” is not an actionable finding. For an uncertain explanation, identify the next diagnostic that could overturn it before recommending an expensive migration or content rewrite.

Implement only the authorized changes. Preserve redirects, tracking and existing user flows. Check the actual changed behavior after a repair; a source diff alone does not prove deployment, recrawl or reindexing. Keep implementation verification separate from the later search outcome.

## Measure and deliver honestly

Set a baseline with definitions, date ranges, timezone, filters and data limitations. Compare relevant query/page/device/country cohorts and account for seasonality, tracking changes and external events. Analytics sessions, Search Console clicks and impressions measure different events and need not match exactly.

Deliver the scope, supported findings, priority plan, evidence gaps and a realistic follow-up measurement plan. Report what was not inspected. Do not present a composite audit score as universal health, guarantee first-page rankings, or call a request for recrawl proof of indexing.

[Design notes](references/design-notes.md) identify the reviewed upstream and comparison limits.
