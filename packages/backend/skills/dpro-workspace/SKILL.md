---
name: dpro-workspace
description: Read the Girru staff, approvals and window footer, using the owner's words, without taking the owner's decisions.
---

# Girru workspace

Use these MCP tools through the owner's authenticated local session.

## Agents (tool `agents`, read only)

- Roles use the owner's words: **Lead** (runs the team, talks to the owner first), **Manager** (splits work, checks the others), **Specialist** (does one kind of work very well) and **Reviewer** (checks results before the owner sees them). The main agent is the one that answers first.
- `list`, `read` and `permissions` are read-only. Keys, credentials and system prompts are never returned.
- Only the owner hires, removes, renames, duplicates an agent, changes its role or makes it the main agent, in the app. Suggest it; never claim it was done.

## Approvals (tool `workspace_approvals`, read only)

- `waiting`, `history`, `permissions` (What agents may do), `rules` (approval rules) and `coverage` (tools without a rule) are read-only.
- A request an agent sends shows in Approvals › Waiting for me. You never approve, allow, reject or vote on it yourself, and you never change or turn off a rule or what agents may do; the owner does that in the app, sometimes with a code.

## Footer (tool `workspace_footer`)

- The footer shows the sections the owner chose. Hidden sections stay in the command box (⌘K), and each section keeps its ⌘ number. Settings always stays.
- Change it only when the owner asks.
