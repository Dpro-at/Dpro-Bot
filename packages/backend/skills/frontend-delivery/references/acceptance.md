# Frontend acceptance

| Scenario | Required observation | Failure signal |
|---|---|---|
| Existing editor refined | Same data/controller and save semantics, clearer selected-object flow. | Duplicate editor or disconnected local-only form. |
| Slow object switch | New object never displays or saves the old object's result. | Stale request overwrites selection. |
| Dirty navigation | User can save/discard/recover before a draft would be lost. | Silent loss of work. |
| Missing permission | Explanation and safe disabled path; backend remains authoritative. | UI-only access restriction or assumed grant. |
| Narrow window | Main task remains usable without unintended whole-page overflow. | Footer/pane overlap or unreachable navigation. |
| Keyboard use | Named controls, visible focus and sensible navigation. | Mouse-only action or focus lost after close. |

Keep evidence tied to the actual build and state. A visual plan, typecheck, screenshot and executed mutation answer different questions; list them separately. Do not claim full accessibility or platform support from one viewport test.
