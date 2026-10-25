---
name: web-search
description: "Search the web and retrieve information from websites"
metadata:
  agent-player:
    emoji: "🔍"
    version: "1.0.0"
    author: "Dpro Bot Team"
    category: "research"
    tags: ["search", "web", "research", "google"]
    triggers:
      - search
      - google
      - find
      - lookup
      - "search for"
      - "look up"
    settings:
      - key: search_engine
        type: select
        label: "Search Engine"
        default: duckduckgo
        options:
          - value: duckduckgo
            label: "DuckDuckGo"
          - value: google
            label: "Google"
          - value: bing
            label: "Bing"
      - key: max_results
        type: number
        label: "Max Results"
        default: 5
        validation: { min: 1, max: 20 }
      - key: safe_search
        type: boolean
        label: "Safe Search"
        default: true
    requires:
      bins: ["curl"]
      apis: ["duckduckgo"]
---

# Web Search Skill

Search the web and retrieve information from websites.

## Usage

Search naturally:

```
Search for TypeScript best practices
Google latest JavaScript features
Find information about GraphQL
Look up Python documentation
```

## Search Engines

| Engine | Privacy | API Key |
|--------|---------|---------|
| DuckDuckGo | High | Not required |
| Google | Low | Required |
| Bing | Medium | Required |

## API

### DuckDuckGo (Default)

```bash
# Instant answers
curl -s "https://api.duckduckgo.com/?q=query&format=json"

# HTML search
curl -s "https://html.duckduckgo.com/html/?q=query"
```

### Google Custom Search

```bash
curl -s "https://www.googleapis.com/customsearch/v1?key=KEY&cx=CX&q=query"
```

## Output Format

```
🔍 Search Results for "TypeScript best practices"

1. TypeScript Best Practices 2026
   https://example.com/typescript-practices
   Learn the latest TypeScript patterns and practices...

2. Official TypeScript Documentation
   https://typescriptlang.org/docs
   Comprehensive guide to TypeScript...

3. TypeScript Style Guide
   https://github.com/example/style-guide
   Community-maintained style guide for TypeScript...
```

## Examples

**User:** "Search for Docker compose examples"

**Response:**
```
🔍 Found 5 results:

1. Docker Compose Tutorial
   https://docs.docker.com/compose/
   Official Docker Compose documentation with examples...

2. Awesome Compose
   https://github.com/docker/awesome-compose
   Curated list of Docker Compose examples...

3. Docker Compose Examples
   https://example.com/docker-examples
   Real-world Docker Compose configurations...
```

**User:** "Look up React hooks documentation"

**Response:**
```
🔍 React Hooks Documentation

Built-in React Hooks - React (react.dev)
https://react.dev/reference/react/hooks

Hooks let you use different React features from your
components. You can either use the built-in Hooks or
combine them to build your own.
```

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `search_engine` | select | duckduckgo | Search engine |
| `max_results` | number | 5 | Results to return |
| `safe_search` | boolean | true | Filter explicit content |

## Privacy

DuckDuckGo is the default for privacy. No search queries are logged or stored.
