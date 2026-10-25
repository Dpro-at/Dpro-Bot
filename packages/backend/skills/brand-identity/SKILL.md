---
name: brand-identity
description: Develop and maintain a usable visual/verbal brand identity from approved strategy, assets and real applications. Use for identity creation, refreshes, brand guidelines and rollout-ready asset systems.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; authoring and inspection capabilities depend on the host.
metadata:
  agent-player:
    version: 1.1.0
---

# Brand identity

Create a coherent identity that can be applied by its intended users, with clear provenance, usage rules and tested examples. A palette, moodboard or list of adjectives is not a finished brand system. Preserve the correct brand's existing decisions and sharing boundaries.

Read [Runtime contract](references/runtime-contract.md) in a new host. Use [Discovery and direction](references/discovery-direction.md), [Identity system](references/identity-system.md), [Applications and rollout](references/applications-rollout.md), [Brand brief](assets/brand-brief.md), [Guideline template](assets/guideline-template.md) and [Acceptance](references/acceptance.md). Use the optional contrast helper only for its documented opaque-color calculation.

## Establish the assignment

Identify the brand, audience, offer, supported positioning, actual business context, channels, constraints and decision owner. Determine whether the work is a new identity, an approved refresh, an inconsistency audit or a narrow extension. Do not replace an existing identity because a new concept is easier to generate.

Read the correct brand's approved voice, assets, colors, type licenses and usage restrictions. Separate approved facts from proposals and hypotheses. Keep brands/projects distinct. Existing audience research can support direction; invented research, testimonials or performance claims cannot.

Inspect the required deliverables and available authoring capabilities. If the request is strategy/guidelines, produce that requested result without claiming original artwork exists. If actual assets are requested, create/export and inspect them through supported tools; a description of a logo is not a logo file. Tool access does not authorize buying fonts, publishing a rebrand or uploading private assets.

## Choose a direction with reasons

Use [Discovery and direction](references/discovery-direction.md). Translate the supported strategy into concrete design criteria: recognition, tone, legibility, differentiation, practical channel use and continuity where required. Propose materially different directions when a decision needs comparison, not cosmetic color swaps presented as new concepts.

Explain tradeoffs against the brief rather than arbitrary taste scores. Test the direction on representative real applications early enough to reveal problems. Approval of a direction does not automatically approve unseen final assets or a public rollout. Preserve the exact reviewed version and any required decision path.

## Build a usable identity system

Read [Identity system](references/identity-system.md). Develop the mark/wordmark structure, approved variants, color roles, typography hierarchy, imagery/icon language, layout principles and voice/tone guidance appropriate to the assignment. Each rule should change a practical application decision; avoid generic adjectives that cannot be acted on.

For marks, inspect recognizability, silhouette, spacing, small-size behavior and one-color/reversed use at the intended sizes. Do not invent a universal minimum size or clear-space formula unrelated to the actual asset. Document measured recommendations and limits. Search or legal review may be needed for ownership questions; do not claim trademark clearance from visual novelty.

For color, define permitted pairings and roles rather than assuming every brand color can be text on every background. For typography, verify licensing and intended platform support, including multilingual glyph coverage when relevant. A font name in a guideline does not establish that the recipient has it or may redistribute it.

## Verify accessibility and application behavior

Use [Contrast checks](references/contrast-checks.md). The optional `scripts/contrast_pairs.py` computes ratios for explicitly supplied opaque sRGB pairs and checks a caller-declared threshold. It does not infer text size, exception eligibility, gradients, alpha compositing, color management or full accessibility. Read its format and run --help before first use.

Inspect actual applications: a small icon, dense text, dark/light context, relevant image treatment and required print/export contexts. Contrast and visual inspection answer different questions. A calculated pair cannot prove that the real interface uses those colors consistently or that all states are accessible.

Preserve truthful voice and approved claims in application examples. Follow the brand's actual restrictions on comparisons, public naming and customer material. Do not copy a reference brand's distinctive assets or import unlicensed fonts/imagery to complete a moodboard.

## Package assets and guidance

Use [Applications and rollout](references/applications-rollout.md). Deliver editable sources and appropriate exports when assets are in scope, a searchable guideline, usage examples, dependency/license notes and version identity. Verify file formats, paths, export bounds/background and recipient needs. A transparent logo preview should not be silently replaced with a flattened background.

Document the approved primary asset and allowed variants. Distinguish draft concepts, approved assets and deprecated files so downstream users do not choose from an ambiguous pile. A guideline can be lightweight when the assignment is narrow, but it must include the instructions needed for the actual application.

## Roll out under the actual authority

A rebrand can affect public sites, products, print, social channels and partner material. Identify owners, asset mappings, dependencies and continuity needs. Implementation/publication is separate from authoring an approved package and follows the user's actual authorization. Do not rename products, rewrite unrelated content or alter live accounts as a side effect of creating guidelines.

Deliver what changed, why it fits the brief, actual visual/mechanical checks, asset locations, approved/proposed state and remaining decisions. Do not claim measured audience lift or complete accessibility from a designed concept. Keep the maintained general skill package free of private brand assets and project-specific identities.

[Design notes](references/design-notes.md) record reviewed references and independent comparison limits.

## Brand strategy mode

For audience/category/positioning,portfolio choices or a messaging strategy,read [brand strategy](references/brand-strategy.md) and use the [strategy decision record](assets/strategy-decision.md). Reuse the existing identity/discovery/application workflow;strategy approval,visual identity and public rollout are distinct deliverables.
