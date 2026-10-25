---
name: social-planning
description: Plan and maintain evidence-backed social content calendars, channel adaptations and publishing handoffs. Use for campaigns, recurring editorial operations and performance learning across social channels.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; tools and access depend on the host.
metadata:
  agent-player:
    version: 1.3.0
---

# Social planning

Maintain a usable editorial operation: a coherent audience promise, a current calendar, production-ready briefs, approved material and an honest record of what actually shipped. A list of captions is not a calendar. Planning does not itself authorize publishing, paid generation, scheduling or account changes.

Read [Runtime contract](references/runtime-contract.md) in a new host. Use [Editorial operations](references/editorial-operations.md) for planning and production, [Publishing and measurement](references/publishing-measurement.md) for external actions and results, and [Acceptance](references/acceptance.md) to evaluate work. Start from the existing calendar when one exists; use [Calendar template](assets/calendar.md) only when it improves the current record.

## Establish the editorial contract

Identify the brand, target audience, business objective, channels, campaign window, timezone, production capacity and success measure. Read the correct brand's voice, approved facts and assets. Keep projects and brands separated. If inputs are incomplete, propose a clearly labeled plan based on available facts and ask only for the choices that materially change it.

Check whether this request is a one-off post, a campaign or a recurring operation. For a one-off, produce the requested asset without manufacturing a content system. For an ongoing calendar, find its durable source and inspect existing rows, approvals and publication IDs before creating another. Record the actual read/write capabilities of available tools; a connector's existence does not establish account access or publishing permission.

## Design coverage around audience needs

Translate the objective into a small set of editorial themes with a distinct audience need, evidence base and desired response. Choose a sustainable cadence from capacity and previous results rather than promising daily production by default. Identify missing proof, approvals or assets early enough to change the plan.

Assign each item a specific reason to exist. Separate education, product demonstration, community conversation, proof, timely updates and explicit offers according to the actual campaign. Do not force a numerical mix when evidence does not support it. Avoid filling slots with interchangeable promotional language.

Adapt the idea to each channel's format and user behavior. A thread, short clip and carousel may share a source, but each needs a suitable opening, information sequence and next action. Confirm current platform requirements using official guidance when dimensions, duration, links or policy details matter. Do not embed volatile platform limits in a timeless instruction.

## Keep one trustworthy calendar

Track stable item ID, brand, channel/account, objective, audience, concept, source material, format, owner, due date, target publication time with timezone, status, revision, assets, approval and publication receipt. Use explicit unscheduled state when a time is undecided. Distinguish production deadlines from publication times.

Update existing items by identity and revision. Check for duplicated concepts, crowded launches, unassigned work and unrealistic asset demands. A retry must not append the same plan again. When the source changes concurrently, read it again and reconcile the changed rows instead of overwriting a stale copy.

Use statuses that match reality. Draft means editable material; in review means a particular revision awaits a reviewer; approved means that revision was accepted; scheduled requires a scheduler receipt; published requires a platform result or verified readback. Failed and uncertain outcomes remain distinct from unscheduled work. Editing approved copy or replacing an asset invalidates the affected approval until reviewed again.

## Produce briefs that can be executed

For each selected item, prepare the actual message, supported claims, asset specification, platform adaptation, accessibility text and CTA. Use [Production brief](assets/production-brief.md) for complex assets. Check current product names, prices, dates and offer conditions against approved sources. Never invent testimonials, customer outcomes, urgency, endorsements or usage rights.

Inventory the assets before generation. Reuse suitable approved assets, respecting their license and scope. Specify which image or clip belongs in each slot and verify it meets the intended aspect and message. Do not assume every image search result is reusable. Distinguish a storyboard from a finished clip and a preview from an exported deliverable.

Use the existing writing or design workflow if available, without assuming it is installed or creating a duplicate skill. If generation would cost money or exceed an authorization boundary, complete the brief and wait for the required decision before that action. Preserve progress and the exact remaining step.

## Review and hand off

Review the complete channel view: copy, media, crop, text alternatives, links, tracking, tags, account and intended time. For time-sensitive claims, verify that the approved facts still hold at handoff. Include the full revision and assets in the review; approval of an idea is not approval of unseen final media.

If publishing was requested and authorized, follow [Publishing and measurement](references/publishing-measurement.md). Otherwise hand off a ready-to-publish packet and state what still needs authorization or access. Do not call a local draft “scheduled” or a scheduler acceptance “published.” A connection error after submission requires status reconciliation before another attempt.

## Learn from actual outcomes

Record the metric definition, date range, channel and data source. Distinguish impressions, reach, engagement, clicks and conversions. Compare like windows and account for paid amplification, seasonality, audience changes and sample size. Show missing data as missing, not zero. Avoid attributing a business outcome to a post merely because they happened together.

Use results to propose a bounded change: repeat an angle, adjust a format, stop a weak series, or test a specific hypothesis. Keep the previous result so the next cycle can distinguish learning from a rewritten narrative. Deliver the updated calendar, selected briefs, actual receipts and the next production bottleneck.

[Design notes](references/design-notes.md) identify the reviewed source and the limits of the comparison.

## Community operations mode

For member conversations,response queues,moderation and community learning,read [community operations](references/community-operations.md) and use the [community case record](assets/community-cases.md). Reuse brand/source/revision/publishing boundaries. A proposed reply or moderation decision is not a sent message,removed post or changed membership.

## Virtual influencer mode

For a recurring synthetic presenter or fictional creator,read [synthetic creator production](references/synthetic-creator.md) and use the [creator continuity record](assets/creator-continuity.md). Reuse approved brand,asset,calendar,review and publishing boundaries. A consistent prompt or seed does not guarantee consistent generated identity.

## Virtual acting and presenting

Read [virtual acting](references/virtual-acting.md) for role/scene performance and [virtual presenting](references/virtual-presenting.md) for truthful on-camera explanation/demonstration. Use the [performance continuity record](assets/performance-continuity.md). Reuse synthetic creator,script,audio and visual resources rather than a second identity system.
