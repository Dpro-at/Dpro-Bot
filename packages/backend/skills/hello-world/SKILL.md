---
name: hello-world
description: "A simple greeting skill for testing and demonstrations"
metadata:
  agent-player:
    emoji: "👋"
    version: "1.0.0"
    author: "Dpro"
    category: "demo"
    tags: ["greeting", "hello", "demo", "test"]
    triggers:
      - hello
      - hi
      - greet
      - hey
    settings: []
    requires: {}
---

# Hello World Skill

A simple greeting skill that demonstrates the skill system.

## Usage

Trigger with any greeting:

```
Hello!
Hi there
Hey
/hello
```

## Response

The agent responds with a friendly greeting:

- Personalized hello message
- Time-aware (morning/afternoon/evening)
- Ready to help prompt

## Examples

**User:** "Hello!"

**Response:**
```
👋 Hello! Great to see you!

How can I help you today?
```

**User:** "Hi there"

**Response:**
```
👋 Hi there! Welcome to Girru.

I'm ready to assist you with anything you need.
What would you like to do?
```

## Time-Aware Greetings

| Time | Greeting |
|------|----------|
| 6am - 12pm | "Good morning!" |
| 12pm - 6pm | "Good afternoon!" |
| 6pm - 10pm | "Good evening!" |
| 10pm - 6am | "Hello! Working late?" |

## Purpose

This skill demonstrates:
- Basic skill structure
- Trigger word matching
- Simple response generation
- No configuration required
- Time-based logic
