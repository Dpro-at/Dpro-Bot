---
name: skill-library
description: Read skills and add a found skill package, unassigned, without changing what agents follow.
---

# Skill library

Use the skill_library MCP tool through the owner's authenticated local session.
A skill is written guidance (Markdown). It never grants tools, connections, memory or permissions.

- Use the owner's words from the Skills window: **Give** (a skill to an agent), **Add** (a skill to Dpro), **Update** (an installed copy to a newer version) and **Take back** (a skill from an agent).
- list/read/agent/catalogue are read-only. `list` names the agents that use each skill; `agent` gives the skills given directly to one agent (its specialties bring more; read those with specialty_library `assigned`); `catalogue` is Dpro's official catalogue, read only.
- look and look_status find skill packages from coding apps on this computer; nothing there changes. Use preview to read a found package before adding it.
- Add only on the owner's explicit instruction, after preview, with the package hash. An added skill stays unassigned and changes no agent.
- Giving a skill to an agent, taking it back and updating an installed copy change what agents follow, so the owner does them in the app after its review; this tool refuses them.
- Adding from Dpro's catalogue needs the owner's authenticator code, so the owner does it in the app only. Removing a skill from Dpro is not available.
- Never invent skills, agents that use them or installed versions.
