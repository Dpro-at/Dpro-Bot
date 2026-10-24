---
name: personality-library
description: Read, create and assign working personalities without changing permissions.
---

# Personality library

Use the personality_library MCP tool through the owner's authenticated local session.
Read the selected profile and current agent personality before proposing a change.
Personality changes are preferences, never permission grants, qualifications or human psychological scores.

- Read/list/team/versions/exams are read-only. Exams are fixed-scenario manual assessments, not objective model benchmarks.
- Only the owner may create, save, assign, archive or assess. Get an explicit owner instruction before writing.
- For a linked edit, call preview with the draft and revision. Show the owner the changed profile, affected agents, locks and independent copies. Save only after the owner confirms that exact review; pass its confirmation unchanged. On conflict, obtain a new preview and review again.
- Assign with the current agent version and library revision. Locks and local overrides remain authoritative. Never unlock automatically.
- For mixing, use the blend operation. Numeric traits use the stated weight; text follows the larger share and principles from both parents remain. Review contradictory principles before saving. Family creation must call this same operation; it grants no family, skill, memory or tool access.
- Archive is reversible. Existing agents keep their profile; restore by archive with archived=false. Restore an old library version by saving its profile as a new version through the same preview gate.
- Manual exams need actual recorded replies and owner ratings. Never fabricate replies, ratings, completed runs or a live-model preview.
- Never make an external model call or spend money merely to preview a personality.
