---
name: content-studio
description: Create and revise brand-specific marketing content for articles, social posts, email, landing pages, announcements and customer stories. Use when a brief needs audience, evidence, voice and channel decisions; not for publishing or sending content without authorization.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; optional Python3.10+ standard-library claim-map audit; research, design and publishing tools depend on the host.
metadata:
  agent-player:
    version: 1.4.0
---

# Content studio

Produce useful, original content that says something accurate to a defined reader. Professional quality comes from a clear purpose, evidence and editorial decisions, not a formula repeated across brands.

Read [Runtime contract](references/runtime-contract.md) in a new environment. Maintain all package files and content artifacts in English under this package's standing rule. Do not assume a provider's slash commands, hidden memory or publishing tools.

## 1. Read the brief in the correct brand context

Identify brand, audience, channel, objective, intended reader action and the source material available. Read the authorized brand voice and identity files from the correct project. Keep separate brands' claims, assets, writing samples and restrictions separate.

For this workspace, use the correct brand folder when one is specified. If a brand prohibits public competitor mentions, that applies to drafts as well as final copy. Do not silently substitute another brand's voice because its files are easier to find.

Record essential assumptions in [Content brief](assets/content-brief.md). If no channel or audience is supplied, infer a reasonable choice only when the task remains clear and state it. Ask about a material ambiguity rather than presenting a confident but misdirected draft.

A content request does not by itself authorize publishing, emailing, buying assets or using a paid generation service. Prepare the content and its review evidence within the requested scope.

## 2. Define the message before writing

Describe the reader's problem, the useful promise, the support available and the next step. Choose one governing idea for a short piece. For a long piece, map its sections to the reader's questions rather than filling a predetermined number of headings.

Distinguish the message from the format. The same subject can become an explanatory article, a practical social lesson or an announcement, but each should do its own job. Repurposing requires a new opening and structure rather than mechanically shortening the original text.

Use the tone the brand supports. Select concrete language and realistic examples. Do not imitate a named person's identity, invent lived experience or turn a fictional example into a customer testimonial.

## 3. Establish the claim boundary

List objective claims that need support: numerical results, feature availability, prices, dates, comparisons, guarantees and customer outcomes. Check the supplied evidence or use assigned research capabilities when necessary. If evidence is unavailable, revise or remove the claim; do not add an impressive number to make an opening stronger.

Maintain a lightweight claim map for substantial commercial content. Mark each claim supported, inference, fictional example or unresolved. Use [Claims and voice](references/claims-and-voice.md) for detailed review.

A quotation must come from an authorized source and preserve context. Do not invent quotes, customer names, approvals, certifications, press coverage or product capabilities. Do not imply scarcity or a deadline unless it exists. Separate an aspiration from a feature that customers can use today.

## 4. Choose the channel shape

Read the relevant part of [Channel playbooks](references/channel-playbooks.md). It covers articles, social posts, email, landing pages, announcements and customer stories without imposing one template on all work.

Respect the user's requested length. Treat platform lengths, preview truncation and display rules as changing facts to verify when they matter, not permanent constants. Count characters or words using the actual target text where required. Do not promise reach, conversion or search ranking from a layout choice.

A useful opening makes the topic and reader benefit concrete. It can start with an observation, practical tension, supported fact or scenario; it does not need a fabricated contrarian claim or a question every time.

For search-oriented content, answer the real query. Choose a primary intent and related questions, then use natural terminology. Do not stuff keywords, prescribe arbitrary link counts or present metadata length as a guarantee of search-engine display.

## 5. Draft the complete piece

Write the deliverable, not advice about how someone could write it. Use the user's material with a structure suited to the channel. Fill meaningful details from verified context; mark a necessary missing fact clearly for review rather than hiding it behind polished copy.

Use headings when they help navigation. Keep paragraph length proportional to reading context. Avoid empty intensifiers, duplicated introductions, unsupported superlatives and generic promises that could describe any company.

Make action text describe the actual next event: request a demonstration, open a guide, reply with a question, or register for a real event. One primary action can be supported by secondary navigation where the channel needs it. Do not force engagement bait into an informational piece.

## 6. Edit in separate passes

First inspect meaning: does the piece answer the reader's question and support the objective? Remove a section that adds no information, even if a template had space for it.

Then inspect evidence: can the exact wording of every consequential claim be supported? Check dates, feature names and links. Explain estimates and examples accurately.

Next inspect voice and usability: read the draft as the intended audience, resolve jargon, keep terms consistent and check whether headings or actions could be misunderstood. Use the brand's actual voice rather than exaggerated stylistic tics.

Finally inspect presentation: spelling, link destinations, alt-text suggestions, mobile readability and handoff requirements. If no design preview was available, report that; do not claim a rendered review from a text-only pass.

## 7. Use mechanical checks appropriately

The optional helper `scripts/audit_claims.py` reads a structured claim map and reports unresolved claims, empty source references and inconsistent identifiers. [Claim-map format](references/claim-map-format.md) defines its input. It neither verifies sources nor detects every claim in prose.

Run it only when useful and available; a clean mechanical result does not prove that the content is accurate, compliant or on-brand. In a Markdown-only host, perform equivalent checks manually and record the limitation.

## 8. Deliver content ready for review

Provide the finished draft first, with requested headline or subject alternatives when useful. Put editorial notes, source issues, assumptions and suggested visual direction in a separate short handoff so they cannot accidentally be published as part of the copy.

For a substantial assignment, use [Editorial handoff](assets/editorial-handoff.md). Include the target channel, intended audience, assets still needed, claim issues and the actual review status. If the task requests several variants, explain their distinct purposes rather than changing only adjectives.

Do not publish, send, impersonate a customer or alter a live campaign as a side effect of drafting. Use the host's existing authorization path if publication is explicitly requested.

## Acceptance

Use [Content acceptance](references/acceptance.md) to review realistic work. A draft passes when its message fits the reader, material claims are supported, brand boundaries are respected and the output can be used in its target channel. File size and formula compliance are not the score.

## Design reference

[Design notes](references/design-notes.md) identify the reviewed upstream reference and the scope of the comparison.

## Specialized mode

For conversion-focused page copy and constrained copy edits, read [Specialized guidance](references/conversion-copy.md). Keep the shared evidence and runtime boundaries above.

## Email marketing mode

For lifecycle messages,campaign email and sequences,read [email marketing](references/email-marketing.md) and use the [email sequence contract](assets/email-sequence.md). Reuse truthful claims,brand voice,source and revision checks. Drafting,platform enrollment,activation,sending and recipient outcomes are separate states.

## Scriptwriting mode

For spoken,visual,narrative or instructional scripts,read [scriptwriting](references/scriptwriting.md) and use the [production script](assets/production-script.md). Reuse source/claim/voice checks. A timing estimate is not a recorded performance or finished media artifact.

## Editorial review and revision

For developmental editing, line editing, copyediting or proofreading, use [editorial delivery](references/editorial-delivery.md) and the [editorial decision record](assets/editorial-record.md). Preserve factual meaning and voice; distinguish requested revisions from unresolved author queries. See [editorial acceptance](references/editorial-acceptance.md) for future checks and source comparison.
