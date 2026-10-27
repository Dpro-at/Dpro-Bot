# Agent System - Smart & Efficient

## Overview

This is the **intelligent agent system** for Girru.

### Key Features

| Feature | Girru |
|---------|--------------|
| **Prompt Size** | **500-800 tokens (efficient)** |
| **Skill Loading** | **2-5 relevant only (smart selection)** |
| **Architecture** | **Layered architecture** |
| **Learning** | **Learns from interactions** |
| **Personalization** | **Per-user adaptation** |

---

## Architecture

```
User Message
     ↓
┌────────────────────────────────────┐
│   RequestAnalyzer                  │
│   - Detects intent, language       │
│   - Extracts keywords              │
│   - Assesses complexity            │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│   SkillsSelector                   │
│   - Scores all skills              │
│   - Selects top 2-5 relevant       │
│   - Uses confidence + learning     │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│   SmartPromptBuilder               │
│   - Layer 1: Core (identity)       │
│   - Layer 2: Context (skills/tools)│
│   - Layer 3: User (preferences)    │
│   - Layer 4: Session (history)     │
└────────────┬───────────────────────┘
             ↓
┌────────────────────────────────────┐
│   AgentRuntime                     │
│   - Orchestrates components        │
│   - Calls LLM (Ollama/Claude/GPT)  │
│   - Executes tools                 │
│   - Records learning               │
└────────────┬───────────────────────┘
             ↓
      Agent Response
```

---

## Components

### 1. RequestAnalyzer

**Purpose**: Understand the user's request deeply

**Features**:
- Intent detection (question, command, chat, etc.)
- Keyword extraction (with stop word filtering)
- Language detection (en, ar, mixed)
- Complexity assessment (simple, medium, complex)
- Sentiment analysis (positive, neutral, negative)
- Context analysis (follow-up, references history, needs external data)

**Example**:
```typescript
const analyzer = new RequestAnalyzer();
const analysis = await analyzer.analyze({
  message: "What's the weather in London?",
  sessionId: "session-123",
  history: [],
});

// Result:
{
  intent: "question",
  keywords: ["weather", "london"],
  language: "en",
  complexity: "simple",
  requiresSkills: ["weather"],
  requiresTools: ["web_search"]
}
```

---

### 2. SkillsSelector

**Purpose**: Select most relevant skills using confidence scoring

**Features**:
- Confidence scoring (0.0 to 1.0)
- Trigger word matching
- Keyword overlap calculation
- Category relevance
- Learning from past successes
- Top N selection (default 5)

**Example**:
```typescript
const selector = new SkillsSelector();
const result = await selector.select(analysis, availableSkills);

// Result:
{
  selected: [
    { id: "weather", name: "Weather", confidence: 0.95 },
    { id: "location", name: "Location", confidence: 0.7 }
  ],
  confidence: 0.825,
  reasoning: "Selected 2 skill(s) based on your request: ..."
}
```

---

### 3. SmartPromptBuilder

**Purpose**: Build token-efficient prompts using layered architecture

**Layers**:

1. **Core Layer** (200 tokens, always included)
   - Identity: "You are Girru"
   - Core capabilities
   - Behavior guidelines

2. **Context Layer** (300 tokens, conditional)
   - Relevant skills (2-5 only)
   - Contextual tools
   - Relevant memories

3. **User Layer** (100 tokens, if available)
   - Language preference
   - Response style
   - Code examples preference

4. **Session Layer** (200 tokens, if available)
   - Recent topics
   - Active skills
   - Conversation style

**Example**:
```typescript
const builder = new SmartPromptBuilder();
const prompt = await builder.build({
  message: "What's the weather?",
  sessionId: "session-123",
  history: [],
  context: {
    userPreferences: {
      language: "en",
      tone: "friendly",
      responseLength: "short",
      codeExamples: false
    }
  }
});

// Result:
{
  core: "# Girru - AI Assistant ...",
  full: "... (complete prompt) ...",
  metadata: {
    tokenCount: 650,
    layersIncluded: ["core", "context", "user"],
    skillsCount: 2,
    toolsCount: 3,
    buildTime: 45
  }
}
```

---

### 4. AgentRuntime

**Purpose**: Orchestrate all components and execute agent logic

**Features**:
- Process user messages
- Call LLM (Ollama/Anthropic/OpenAI)
- Execute tools
- Record feedback for learning
- Performance metrics
- Health checks

**Example**:
```typescript
const runtime = new AgentRuntime({
  skills: {
    maxSelected: 5,
    confidenceThreshold: 0.5,
    enableLearning: true,
  }
});

// Load skills
await runtime.loadSkills(availableSkills);

// Process message
const response = await runtime.process({
  message: "What's the weather in Paris?",
  sessionId: "session-123",
  history: [],
});

// Result:
{
  content: "The weather in Paris is...",
  skillsUsed: ["weather"],
  analysis: { ... },
  systemPrompt: { ... },
  metrics: {
    promptBuildTime: 45,
    requestAnalysisTime: 12,
    skillSelectionTime: 8,
    totalTokens: 650
  }
}
```

---

## Usage

### Basic Setup

```typescript
import { AgentRuntime } from './agent';

// Create runtime
const agent = new AgentRuntime();

// Load skills from registry
const skills = await loadSkillsFromRegistry();
await agent.loadSkills(skills);

// Process a message
const response = await agent.process({
  message: "Help me with GitHub",
  userId: "user-123",
  sessionId: "session-456",
  history: [],
});

console.log(response.content);
```

### With Streaming

```typescript
// Stream response chunks
for await (const chunk of agent.processStream({
  message: "Tell me about TypeScript",
  sessionId: "session-789",
  history: [],
})) {
  process.stdout.write(chunk);
}
```

### With Learning

```typescript
// Record feedback after interaction
await agent.recordFeedback({
  interactionId: "interaction-123",
  skillUsed: "weather",
  success: true,
  userFeedback: "positive"
});

// View learning statistics
const stats = agent.getLearningStats();
console.log(stats);
// {
//   totalContexts: 45,
//   totalSkills: 12,
//   avgConfidence: 0.78,
//   topSkills: [...]
// }
```

---

## Configuration

```typescript
const agent = new AgentRuntime({
  // Prompt configuration
  prompt: {
    maxTokens: 800,
    includeMemory: true,
    includeContext: true,
    adaptiveTone: true,
  },

  // Skill selection
  skills: {
    maxSelected: 5,
    confidenceThreshold: 0.5,
    enableLearning: true,
  },

  // Tool selection
  tools: {
    alwaysInclude: ['read_file', 'write_file'],
    contextualEnabled: true,
  },

  // Performance
  performance: {
    enableCaching: true,
    cacheTimeout: 300, // seconds
    enableMetrics: true,
  },

  // Learning
  learning: {
    enabled: true,
    feedbackWeight: 0.8,
    minInteractionsForUpdate: 3,
  }
});
```

---

## Performance

### Expected Metrics

| Metric | Target |
|--------|--------|
| **Prompt Build Time** | <50ms |
| **Request Analysis** | <20ms |
| **Skill Selection** | <10ms |
| **Token Usage** | 500-800 |
| **Response Time** | <2s |

### Optimizations

1. **Lazy Loading**: Only load needed skills/tools
2. **Caching**: Cache prompt layers that don't change
3. **Parallel Processing**: Analyze request while building prompt
4. **Smart Selection**: Filter before scoring (faster than scoring all)

---

## Learning System

The agent learns from interactions to improve skill selection:

1. **Record Feedback**: After each interaction
2. **Update Confidence**: Increase for successes, decrease for failures
3. **Apply to Future**: Use learned scores in skill selection

**Example**:
```typescript
// First time using "weather" skill for "what's the temperature"
// Confidence: 0.75 (based on keywords)

// After 5 successful uses:
// Confidence: 0.95 (learned that it works well)

// After 2 failures:
// Confidence: 0.65 (learned to be less confident)
```

---

## Testing

```bash
# Run tests
npm test

# Run specific test
npm test agent-runtime

# Run with coverage
npm test -- --coverage
```

---

## Next Steps

1. ✅ **Core components built** (this milestone)
2. ⏳ **Integrate with chat API** (next)
3. ⏳ **Add tool execution** (skills functionality)
4. ⏳ **Add memory system** (vector search)
5. ⏳ **Add caching** (performance optimization)
6. ⏳ **Add real LLM calls** (Ollama/Claude/GPT)

---

## Contributing

When adding new features:

1. **Keep it simple** - avoid over-engineering
3. **Measure performance** - track token usage and speed
4. **Add tests** - ensure reliability
5. **Document well** - help others understand

---

## License

MIT License - Girru Team
