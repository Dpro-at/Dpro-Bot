---
name: note-taking
description: "Create, manage, and search personal notes"
metadata:
  agent-player:
    emoji: "📒"
    version: "1.0.0"
    author: "Dpro Bot Team"
    category: "productivity"
    tags: ["notes", "productivity", "memory", "organization"]
    triggers:
      - note
      - notes
      - remember
      - save
      - "take note"
      - "write down"
      - "make a note"
    settings:
      - key: storage_path
        type: string
        label: "Notes Directory"
        default: "./notes"
      - key: default_format
        type: select
        label: "Default Format"
        default: markdown
        options:
          - value: markdown
            label: "Markdown (.md)"
          - value: text
            label: "Plain Text (.txt)"
      - key: auto_timestamp
        type: boolean
        label: "Auto Timestamp"
        default: true
      - key: auto_tags
        type: boolean
        label: "Auto Tags"
        default: true
    requires:
      storage: true
---

# Note Taking Skill

Create, manage, and search personal notes.

## Usage

Create and manage notes naturally:

```
Note: Meeting tomorrow at 3pm
Remember to buy groceries
Save this: [content]
Show my notes
Find notes about meetings
```

## Commands

| Command | Example |
|---------|---------|
| Create | "Note: [content]" |
| List | "Show my notes" |
| Search | "Find notes about [topic]" |
| Delete | "Delete note [title]" |
| Update | "Update note [title]: [new content]" |

## Note Format

Notes stored as Markdown:

```markdown
---
title: Meeting Notes
created: 2026-02-16T14:30:00Z
updated: 2026-02-16T15:00:00Z
tags: [meeting, design, team]
---

# Meeting Notes

Discussion points:
- New feature requirements
- Timeline review
- Resource allocation
```

## Examples

**User:** "Note: Meeting tomorrow at 3pm with design team"

**Response:**
```
📒 Note Saved!

Title: Meeting tomorrow at 3pm with design team
Created: 2026-02-16 14:30
Tags: #meeting #schedule

Would you like to set a reminder?
```

**User:** "Show my notes about meetings"

**Response:**
```
📒 Found 3 notes about "meetings":

1. Meeting Notes - Feb 16
   Tags: #meeting #design
   "Discussion with design team..."

2. Weekly Standup Notes
   Tags: #meeting #weekly
   "Sprint progress update..."

3. Client Meeting Agenda
   Tags: #meeting #client
   "Q1 review presentation..."
```

**User:** "Find notes from last week"

**Response:**
```
📒 Notes from Last Week (5):

• Feb 10 - Project Ideas
• Feb 11 - Bug Report
• Feb 12 - API Design Notes
• Feb 13 - Meeting Summary
• Feb 14 - Weekend Plans
```

## Search Syntax

| Syntax | Example | Description |
|--------|---------|-------------|
| Simple | `meeting` | Search content |
| Tag | `#project` | Search by tag |
| Date | `date:2026-02` | Search by date |
| Title | `title:ideas` | Search titles |

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `storage_path` | string | ./notes | Notes directory |
| `default_format` | select | markdown | File format |
| `auto_timestamp` | boolean | true | Add timestamps |
| `auto_tags` | boolean | true | Suggest tags |

## Storage

```
notes/
├── 2026-02-16-meeting-notes.md
├── 2026-02-15-project-ideas.md
├── 2026-02-14-groceries.md
└── index.json  # Search index
```

## Features

- Full-text search
- Automatic tagging
- Timestamp tracking
- Markdown support
- Tag organization
- Quick capture
