# Design notes and comparison scope

Reviewed source: [anthropics/skills](https://github.com/anthropics/skills/tree/41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f/skills/frontend-design).

Pinned source commit: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`. Reviewed on2026-10-25.

The reviewed skill emphasizes intentional visual decisions and visual self-review. This package preserves deliberate composition while centering working product flows, existing architecture, asynchronous identity/version state, draft recovery, accessibility and measured behavior. It does not require a new aesthetic direction for routine changes to an established product.

The package instructions, templates and helper code are original project work. No upstream prompt or executable helper is bundled. The project license applies to our files; the referenced repository retains its own terms.

This is a design/coverage comparison, not a claim that every model performs better with this package. Discovery, helper execution and observed task quality are separate validation levels.

Additional interface-design reference: [anthropics/knowledge-work-plugins — design/skills/design-system](https://github.com/anthropics/knowledge-work-plugins/tree/33d3dea41a341b341d4f5da2e8801ae0c89be2b8/design/skills/design-system), commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`. Specialized guidance is independently authored; no upstream template or connector action is redistributed.
