---
name: translation-delivery
description: Translate and review meaning, terminology and protected tokens, including contextual software localisation/localization and locale QA. Text review does not certify rendered behavior or invoke external translation services.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini;actual file, calculation, ledger and external capabilities depend on the host.
metadata:
  agent-player:
    version: 1.1.0
---

# Translation delivery

Deliver the requested language version with faithful meaning and a usable target-language voice. Distinguish translation, bilingual review and target-only editing. Fluent prose can still omit a condition, reverse a quantity or strengthen a claim. A back-translation is a diagnostic aid, not proof of correctness.

Read [Runtime contract](references/runtime-contract.md) in a new host. Maintained skill resources and project records are English. Actual translated content follows the user's target-language request and host policy. Inspect the supplied source, target draft, context, glossary and delivery format before rewriting.

## Establish the brief

Use [Translation brief](assets/translation-brief.md). Identify source/target language and locale, audience, register, purpose, domain, format and requested scope. Use supplied preferences rather than asking an unnecessary intake questionnaire. If an ambiguity materially changes meaning, resolve or flag it;do not silently invent a fact.

Read [Meaning and terminology](references/meaning-terminology.md) for semantic fidelity. Read [Document and token constraints](references/document-tokens.md) for markup, code, numbers and localization. Read [Review and delivery](references/review-delivery.md) for bilingual review, target-only polish and evidence.

## Translate or revise

Read enough context to interpret the unit coherently. For long documents, maintain an explicit coverage map and consistent terminology rather than pretending unseen pages were reviewed. Re-express meaning naturally in the target language while preserving conditions, negation, modality, attribution and evidence strength.

Follow confirmed terminology and protected-token rules. Do not translate identifiers or alter code/formula semantics unless requested. Localize dates, numeric formatting or units only under the actual brief and document interpretation. A target-only editing request does not authorize an unobserved claim that it matches a missing source.

## Review

Compare source and target meaning, then inspect target-language readability and consistency. Prioritize errors by their consequence to the user's purpose. Use [Bilingual issue record](assets/bilingual-issues.md) when review findings help;deliver clean final text when that is what the user requested. Avoid filling the translation with unnecessary inline notes.

Use actual source/target coverage and token checks to support claims. A structural count or dictionary lookup cannot establish full semantic equivalence. If the task needs specialist/certified review, retain that actual requirement without inventing a certification or refusing ordinary translation work.

## Deliver

Provide the requested clean text, file or review with meaningful ambiguities and not-reviewed portions explicit. Keep private source material out of shared glossaries or portable settings unless authorized. No external translation API, paid service, publication or message sending is implied. [Acceptance briefs](references/acceptance.md) define future trials;[Design notes](references/design-notes.md) state comparison scope.

## Localisation specialist mode

For localisation specialist work, read [Localisation specialist](references/software-localisation.md) and use [the output record](assets/locale-qa.md). This extends the shared source, authority and verification workflow; it supplies no new tool or permission.
