# Design notes and comparison scope

Reviewed source: [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/tree/2d6f7e22dd25593f0f748010430ef86f19659735/marketing/skills/content-creation).

Pinned source commit: `2d6f7e22dd25593f0f748010430ef86f19659735`. Reviewed on2026-10-25.

The reviewed skill provides useful channel templates and writing guidance. This package uses independently authored channel playbooks and adds brand-context separation, an explicit claim map, source/fiction distinctions, review handoff and optional mechanical checks. Fixed platform lengths and performance promises are not treated as permanent facts.

The package instructions, templates and helper code are original project work. No upstream prompt or executable helper is bundled. The project license applies to our files; the referenced repository retains its own terms.

This is a design/coverage comparison, not a claim that every model performs better with this package. Discovery, helper execution and observed task quality are separate validation levels.

Additional specialized-mode reference: [coreyhaines31/marketingskills — skills/copywriting](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b/skills/copywriting), commit `e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b`. Reviewed as comparison material; the specialized reference was independently authored and no upstream code or prompt is redistributed.

## Email extension1.2.0

Complete selected entrypoint reviewed: [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins/blob/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/marketing/skills/email-sequence/SKILL.md),commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`. It provides useful full-sequence copy/logic structure. Our independent extension adds current eligibility/suppression,event precedence,token fallbacks,uncertain-send reconciliation and delivery-state boundaries without copying fixed schedules,benchmarks or template language. It reuses existing content/claim checks and needs no mandatory ESP connector. Less prefilled cadence is a tradeoff,no measured delivery/conversion superiority.

[Gmail sender guidance](https://support.google.com/mail/answer/81126) was checked as a scope-specific example of authentication and unsubscribe requirements. Actual provider/jurisdiction requirements remain task-specific;no universal thresholds or inbox-placement guarantee are bundled. No actual email,enrollment,activation or DNS change ran.

## Scriptwriting extension1.3.0

Complete selected entrypoint reviewed: [bmcgauley/SKILLs](https://github.com/bmcgauley/SKILLs/blob/7f8c130a59b3704dee2fbdd816bfd3c9b26cf972/scriptwriting/SKILL.md),commit `7f8c130a59b3704dee2fbdd816bfd3c9b26cf972`. It offers broad genre/performance guidance. Our independent extension reuses existing source/voice/claim controls and adds stable cues,fiction status,actual versus estimated timing and handoff without copying hook libraries,templates,universal sentence/pace rules or helpers. Word estimates cannot establish real performance. No read-aloud,recording or audience acceptance ran.
