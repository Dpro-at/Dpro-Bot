---
name: visual-communication
description: Create and deliver graphic compositions, illustrations and motion pieces with clear message hierarchy, coherent craft and verified output contracts. Use for visual assets, editorial artwork, storyboards and motion-design handoffs.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; authoring, rendering and inspection tools depend on the host.
metadata:
  agent-player:
    version: 1.2.0
---

# Visual communication

Deliver the visual artifact the audience needs, with editable sources and evidence of the output checks actually performed. A concept description, moodboard or storyboard is not a completed graphic, illustration or rendered motion file.

Read [Runtime contract](references/runtime-contract.md) in a new host. Select the relevant mode: [Graphic composition](references/graphic-composition.md), [Illustration craft](references/illustration-craft.md), or [Motion and timing](references/motion-timing.md). Use [Output verification](references/output-verification.md), [Visual brief](assets/visual-brief.md), [Storyboard](assets/storyboard.md), [Delivery receipt](assets/delivery-receipt.md) and [Acceptance](references/acceptance.md) for reviewable work. Existing approved identity remains the source for brand decisions.

## Establish the communication contract

Identify the audience, message, desired action or understanding, channel, dimensions/aspect ratio, content, brand, asset rights and required source/export formats. For motion, establish duration, timebase, delivery context, audio/caption needs and whether the work is a fixed video, loop or interactive transition.

Inspect the actual approved copy, assets, voice and existing templates before inventing replacements. Distinguish a narrow adaptation from a new visual direction. If a material input is unavailable, produce the supported work and expose the gap; do not fill it with fabricated product facts, logos, customer quotes or ownership claims.

Record available authoring and rendering capabilities. A tool name does not establish a working session or supported export. Follow the existing user authorization for paid generation, uploads, purchases, installation, publishing and outreach. A visual-production task can support local source work without authorizing a cloud account or public campaign.

## Choose a direction that serves the message

Translate the brief into observable criteria: what must be read first, what must remain understandable at the target size, which visual relationship matters and which style constraints must hold. Develop materially different approaches only when the task needs comparison. Do not present minor color swaps as strategic alternatives.

Use references to understand craft, hierarchy and relevant constraints, not to copy distinctive artwork or another brand's assets. Preserve the correct identity and license boundaries. A good reference can suggest a construction principle while the actual geometry, content and composition remain independently authored.

Choose a useful early artifact: layout blockout, silhouette sketch, keyframe or low-cost animatic. Verify the message and structure before adding expensive detail. Keep proposed directions separate from approved assets and record the exact reviewed version.

## Build the selected mode deliberately

For graphic work, read [Graphic composition](references/graphic-composition.md). Establish a clear hierarchy, grid/alignment, typography and contrast appropriate to real content. Check crop, margins, reading order and relationships at the intended output size. A polished empty template can fail when actual copy is inserted.

For illustration, read [Illustration craft](references/illustration-craft.md). Define the visual grammar and subject action, then resolve silhouette, perspective, anatomy/structure, overlap, palette and detail. Inspect at the actual view size. A style label does not establish coherent construction or original artwork.

For motion, read [Motion and timing](references/motion-timing.md). Give movement a purpose and a legible sequence. Preserve continuity, responsive feedback and reduced-motion alternatives where relevant. Duration/easing recipes are starting points, not universal laws. A fixed video timeline and an interruptible UI animation require different behavior checks.

## Inspect before final export

Review the whole piece and the specific failure-prone details: text accuracy/overflow, hierarchy, legibility, crop, background/transparency, asset dependencies, ambiguous silhouettes, continuity and intended rhythm. Use the actual available rendering/preview route. A source file that parses is not evidence of the final appearance.

For motion manifests, the optional `scripts/audit_timeline.py` checks integer frame intervals, unique clip identities and requested visual coverage under an explicit rational frame rate. Read [Timeline manifest](references/timeline-manifest.md) and --help before use. It does not render, evaluate pacing, inspect audio sync or determine whether declared clips are visible in the result.

A mechanical contrast or timeline pass does not establish full accessibility or visual quality. Check relevant actual states, alternatives and output behavior. Avoid using color or motion as the only carrier of essential meaning when the intended use requires another cue.

## Export and verify the real deliverable

Use [Output verification](references/output-verification.md). Save editable source and export the required variants. Verify file existence, format, dimensions, dependencies and real content through reopening or appropriate inspection. Keep preview, approved source, final export and publication distinct.

If an asynchronous render is required, retain task identity, inspect terminal status and retrieve actual artifacts. Do not call a queued job a delivered video. If the output is uncertain, reconcile the original task before repeating a potentially costly submission.

## Hand off usable work

Provide source/exports, intended use, versions, dependencies/rights, actual checks, known limitations and the next action. A storyboard or editable motion project can be the correct requested deliverable; label it honestly rather than implying final rendering. Do not claim audience lift or public campaign success from an authored asset.

Keep general package templates free of private brand materials. Preserve unrelated project files and existing approval decisions. The goal is clear communication supported by usable artifacts and honest acceptance, not a catalogue of unexecuted capabilities.

[Design notes](references/design-notes.md) identify reviewed references and independent comparison boundaries.

## Animation production mode

For character/object/procedural animation,read [animation production](references/animation-production.md) and use the [animation shot record](assets/animation-shots.md). Reuse existing motion/timing/output checks and optional timeline audit within its documented scope. Storyboard,key pose,preview and rendered animation are distinct deliverables.

## Video editing mode

For footage-based edits,read [video post-production](references/video-post-production.md) and use the [video edit record](assets/video-edit-record.md). Reuse audio,timeline,source and output contracts. An edit plan,proxy,rendered file and visually reviewed final master are distinct states.
