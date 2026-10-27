---
name: summarize
description: "Summarize text, articles, documents, and web pages using AI"
metadata:
  agent-player:
    emoji: "📝"
    version: "1.0.0"
    author: "Dpro"
    category: "productivity"
    tags: ["summarize", "text", "ai", "productivity"]
    triggers:
      - summarize
      - summary
      - tldr
      - "sum up"
      - "give me the gist"
    settings:
      - key: summary_length
        type: select
        label: "Summary Length"
        default: medium
        options:
          - value: short
            label: "Short (1-2 sentences)"
          - value: medium
            label: "Medium (1 paragraph)"
          - value: long
            label: "Long (multiple paragraphs)"
      - key: bullet_points
        type: boolean
        label: "Use Bullet Points"
        default: false
      - key: include_key_points
        type: boolean
        label: "Include Key Points"
        default: true
    requires:
      llm: true
---

# Summarize Skill

Summarize text, articles, documents, and web pages using AI.

## Usage

Request summaries naturally:

```
Summarize this: [paste text]
Give me a summary of [topic]
TLDR: [long text]
Sum up this article
Summarize https://example.com/article
```

## Input Types

| Type | Example |
|------|---------|
| Plain text | "Summarize: [long text]" |
| URL | "Summarize https://example.com" |
| Document | "Summarize this PDF" |
| Conversation | "Summarize our chat" |

## Output Formats

### Paragraph Format (default)

```
📝 Summary

The article discusses the latest developments in AI technology,
focusing on three main areas: natural language processing,
computer vision, and robotics. The author argues that these
technologies will transform industries within the next decade.
```

### Bullet Point Format

```
📝 Summary

• AI technology advancing in three key areas
• NLP, computer vision, robotics are the focus
• Industries expected to transform within 10 years
• Healthcare and finance seeing biggest impact
```

### With Key Points

```
📝 Summary

[Summary text here]

🔑 Key Takeaways:
1. AI adoption is accelerating
2. Healthcare sees biggest impact
3. Ethical considerations remain important
```

## Examples

**User:** "Summarize this: [500 word article about climate change]"

**Response:**
```
📝 Summary

The article outlines current climate change trends, highlighting
rising global temperatures and increasing extreme weather events.
It proposes three main solutions: widespread renewable energy
adoption, carbon capture technology, and international policy reform.

🔑 Key Points:
• Global temperatures up 1.1°C since pre-industrial era
• Extreme weather events increased 40% in past decade
• Net-zero targets needed by 2050 to limit warming
```

**User:** "TLDR https://news.example.com/tech-announcement"

**Response:**
```
📝 TLDR

Tech company announces new AI assistant capable of handling
complex tasks autonomously. Features include multi-step
reasoning, tool use, and memory. Available Q2 2026.
```

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `summary_length` | select | medium | Short/Medium/Long |
| `bullet_points` | boolean | false | Format as bullets |
| `include_key_points` | boolean | true | Add key takeaways |

## Requirements

This skill requires an LLM (Language Model) connection for summarization.
