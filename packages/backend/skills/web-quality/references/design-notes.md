# Design notes and comparison scope

Reviewed source: [anthropics/skills](https://github.com/anthropics/skills/tree/b9e19e6f44773509fbdd7001d77ff41a49a486c1/skills/webapp-testing).

Pinned source commit: `b9e19e6f44773509fbdd7001d77ff41a49a486c1`. Reviewed on2026-10-25.

The reviewed skill includes practical Python Playwright examples and a server lifecycle helper. This package uses independent instructions and a different optional helper for evidence receipts. It supports the assigned browser surface, existing runners and explicit readiness conditions. It does not include or replace an automatic server launcher, and a receipt audit cannot prove that a scenario was executed.

The package instructions, templates and helper code are original project work. No upstream prompt or executable helper is bundled. The project license applies to our files; the referenced repository retains its own terms.

This is a design/coverage comparison, not a claim that every model performs better with this package. Discovery, helper execution and observed task quality are separate validation levels.
