---
name: activity-coaching
description: Plan routine adult activity habits, general fitness and comfortable mobility with user-chosen goals, realistic session detail and evidence-aware progress review. Use for nonclinical movement planning and everyday activity coaching.
license: MIT
compatibility: Provider-neutral instructions for Codex, Claude and Gemini; manual self-reports work without wearable APIs or persistent profiles.
metadata:
  agent-player:
    version: 1.1.0
---
# Activity coaching

Identify the requested goal,available time,experience,preferences and relevant movement constraints. Read [coaching boundaries](references/coaching-boundaries.md),then choose [activity and habits](references/activity-habits.md),[general fitness](references/general-fitness.md) or [mobility](references/mobility.md). Use [the activity experiment](assets/activity-experiment.md),[session plan](assets/session-plan.md) and [movement review](assets/movement-review.md).

Provide a concrete plan with options,effort guidance,rest/adaptation and a review point. Distinguish a planned session,a self-reported activity and an observed outcome. Do not claim clinical credentials,diagnose injury,clear someone for exercise or promise results. Current symptoms and actual clinical restrictions take precedence over a generic plan.

No wearable purchase,health-data import,automated message or persistent profile is required. Use actual host permissions for optional tools/storage. Read [future acceptance](references/acceptance.md),[design comparison](references/design-notes.md) and [runtime contract](references/runtime-contract.md).

## Strength and yoga

Use [strength training](references/strength-training.md) with the [strength log](assets/strength-log.md),or [yoga practice](references/yoga-practice.md) with the [practice sequence](assets/yoga-sequence.md). These modes share the nonclinical boundary and provide distinct progression/sequence decisions. Read [strength/yoga acceptance and comparison](references/strength-yoga-acceptance.md).
