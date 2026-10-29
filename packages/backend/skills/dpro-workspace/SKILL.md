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

## Rules (tool `workspace_rules`, Agents › Rules)

- The owner's rules for how agents work come first in your instructions under "Owner rules". Follow them in every task; when two disagree, the later one wins (everywhere, then the project, then rules for chosen agents). A rule that starts with "When …:" applies only in that case: decide whether it fits your task, and if unsure, follow it.
- Girru basics come first for every agent; the two safety ones (secrets; asking before deleting, installing, paying or contacting outside services) are always on.
- `list`, `effective` (agentId, projectId: the exact list an agent gets there), `versions` and `files` (projectId) only read.
- A project's coding app files (.girru/rules.md, the @ line in CLAUDE.md and GEMINI.md, the rules part of AGENTS.md) are written by Girru from these rules. Never edit Girru's part of those files by hand; suggest a rule change instead.
- When you learn something every agent (or a department, or this project) should always do, suggest it: `suggest` here, or the `rule_suggest` tool in a chat. One clear sentence and a short reason; add `when` when it applies only in one case. It waits for the owner; never say it is a rule before the owner accepts it.
- You never add, change, pause or delete a rule, and never use or dismiss a suggestion (not even your own); the owner does that in Agents › Rules.

## Chats (tool `chats`)

- `list` shows the chat sidebar: each chat's name, project, pinned, archived, which chat it was opened from, whether an agent works in it now and how many approvals wait for the owner. `projects` lists the projects with their folders.
- `rename`, `pin`, `archive` (archived: false brings a chat back) and `move` (to a project, or out of it) only when the owner asks. An archived chat stays searchable.
- `set_mode` (Auto, Ask me, Plan first) and `set_thinking` (Quick, Normal, Deep) only when the owner asks. Accept edits lets coding apps change files, so only the owner turns it on in the app. A mode is never looser than an agent's own permissions; sending to people, money, deleting for good and installing always ask.
- `status` (id) reads one chat's side panel: tokens by model (estimates; local models are free), the agents it handed parts of the work to, and its schedule. A chat that runs on a schedule sends its saved message at that time with the chat's Mode; only the owner changes or pauses a schedule, in the app.
- `pull_request` (projectId) reads the pull request of the project's branch on GitHub: number, title, state (open, merged, closed, draft) and checks (passing, pending, failing). It only reads, at most a minute old; "PR state unavailable" means GitHub could not be asked now (offline or rate limited). Opening, merging or closing a pull request is the owner's call.
- `variables` lists a project's variable names. Values are encrypted, go only to that project's terminal, and are never shown to you or any model.
- Reading messages, deleting a chat and the owner's sidebar layout (which sections show, their order) are not available to agents.

## Footer (tool `workspace_footer`)

- The footer shows the sections the owner chose. Hidden sections stay in the command box (⌘K), and each section keeps its ⌘ number. Settings always stays.
- Change it only when the owner asks.
