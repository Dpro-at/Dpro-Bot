# Professional skills and specialties

This collection contains 41 authored skill packages and a portable mapping for 122 specialty templates. A skill is a reusable workflow; a specialty combines role instructions with the relevant workflows. Neither grants tools or assigns an agent automatically.

`professional-workspace-settings.json` is the Markdown-only workspace pack. Import it through Dpro's existing workspace-settings preview/import flow with an owner account. It contains skills and specialties only: no accounts, agents, personalities, memories, credentials or permission grants. Review the preview before confirming; an interrupted import can be resumed by explicitly importing the same file again.

Each package directory contains `SKILL.md`, supporting references and reviewable output templates. Nine optional Python helpers accompany the full source packages; the portable JSON intentionally omits executable files. The helpers use the Python standard library and inspect supplied fixtures or manifests; they do not perform the actual domain work or grant external access.

The roles cover the agreed 122-template set. Additional catalogue labels are outside this collection. Resource availability, deterministic integration and helper tests do not establish model quality, professional certification or successful live execution. Package-specific acceptance references describe the remaining domain and provider checks.

Run the Python helper tests with `python3 -m unittest discover -s packages/backend/test/skill-packages -p 'test_*.py'`. The backend `professional-pack.test.mjs` checks the portable pack against its source and imports it into an isolated database without changing live assignments.
