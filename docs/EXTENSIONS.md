# Extension Development Guide

Complete guide to building extensions with UI, JSON render, and skills.

---

## Extension Structure

```
packages/backend/extensions/my-extension/
├── agentplayer.plugin.json    # Manifest
├── index.js                   # Entry point (MUST be .js not .ts)
├── migrations/
│   └── 001_init.sql          # Database migrations
├── src/
│   ├── routes.js             # API routes
│   ├── tool.js               # AI tools
│   └── engine.js             # Business logic
└── README.md

src/app/(dashboard)/dashboard/my-extension/
└── page.tsx                   # Frontend page (ONLY shows if extension enabled)
```

---

## Step 1: Create Manifest

`agentplayer.plugin.json`:
```json
{
  "id": "my-extension",
  "name": "My Extension",
  "description": "My custom extension",
  "version": "1.0.0",
  "type": "tool",
  "author": "Your Name",
  "main": "index.js",
  "permissions": ["network", "database", "tools"]
}
```

**Important:**
- `id` must match folder name
- `main` must be JavaScript (`.js` not `.ts`)

---

## Step 2: Create Entry Point

`index.js` (PURE JAVASCRIPT ONLY):

```javascript
/**
 * My Extension - Pure JavaScript
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'my-extension',
  name: 'My Extension',
  version: '1.0.0',

  async register(api) {
    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_init.sql'),
    ]);

    // 2. Register routes
    api.registerRoutes(async (fastify) => {
      fastify.get('/hello', async (req, reply) => {
        return { message: 'Hello from my extension' };
      });

      fastify.post('/data', async (req, reply) => {
        const { input } = req.body;
        const db = api.getDatabase();

        // Save to database
        db.prepare(
          'INSERT INTO my_extension_data (value) VALUES (?)'
        ).run(input);

        return { success: true };
      });
    });

    // 3. Register AI tool
    api.registerTool({
      name: 'my_tool',
      description: 'My custom AI tool',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string' }
        },
        required: ['action']
      },
      handler: async (input) => {
        return { result: `Executed: ${input.action}` };
      }
    });

    api.log('info', 'My Extension ready');
  },

  async onDisable(api) {
    api.unregisterTool('my_tool');
    api.log('info', 'My Extension disabled');
  }
};
```

---

## Step 3: Create Database Migration

`migrations/001_init.sql`:
```sql
-- Migration: Create my_extension_data table
CREATE TABLE IF NOT EXISTS my_extension_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_my_extension_user
ON my_extension_data(user_id);
```

---

## Step 4: Create Frontend Page (Optional)

`src/app/(dashboard)/dashboard/my-extension/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

export default function MyExtensionPage() {
  const [data, setData] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ext/my-extension/data`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ext/my-extension/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });

      if (res.ok) {
        setInput('');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to submit:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Extension</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter value..."
            />
            <Button onClick={handleSubmit}>Submit</Button>
          </div>

          <div className="space-y-2">
            {data.map((item, i) => (
              <div key={i} className="p-2 border rounded">
                {item.value}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Important:**
- Page ONLY shows when extension is enabled
- Page auto-appears in sidebar when extension enabled
- Use `/api/ext/my-extension/*` for API calls

---

## Step 5: JSON Render UI (Optional)

Extensions can return JSON UI specs that render automatically.

### Backend Route with JSON UI:

```javascript
// In your routes.js
fastify.get('/ui-settings', async (req, reply) => {
  return {
    ui: {
      type: 'Card',
      props: {
        title: 'Extension Settings'
      },
      children: [
        {
          type: 'Form',
          children: [
            {
              type: 'Input',
              props: {
                label: 'API Key',
                name: 'apiKey',
                type: 'password',
                placeholder: 'Enter API key...'
              }
            },
            {
              type: 'Toggle',
              props: {
                label: 'Enable Feature',
                name: 'enabled',
                defaultValue: true
              }
            },
            {
              type: 'Button',
              props: {
                label: 'Save Settings',
                variant: 'primary'
              }
            }
          ]
        }
      ]
    }
  };
});
```

### Frontend Rendering:

```typescript
import { SpecRenderer } from '@/lib/json-render/renderer';

const [uiSpec, setUiSpec] = useState(null);

useEffect(() => {
  fetch(`${BACKEND_URL}/api/ext/my-extension/ui-settings`)
    .then(r => r.json())
    .then(data => setUiSpec(data.ui));
}, []);

return <SpecRenderer spec={uiSpec} />;
```

### Available JSON Components:

- `Card`, `Button`, `Input`, `Select`, `Toggle`, `Checkbox`
- `Table`, `List`, `Grid`, `Tabs`, `Accordion`
- `Alert`, `Badge`, `Progress`, `Spinner`
- `Form`, `FormField`, `Label`, `ErrorMessage`
- `Chart`, `Stats`, `Metric`, `Timeline`
- 54 total components available

---

## Skills System

Skills are AI prompts that can be installed from Claude Code marketplace.

### What are Skills?

Skills are `.md` files with structured prompts that teach the AI new capabilities.

**Skill sources:**
- `bundled` - Built into Dpro Bot
- `managed` - Downloaded from Claude Code marketplace
- `workspace` - User-created in `.data/skills/`

### Skill File Format (SKILL.md):

```markdown
---
name: Email Writer
version: 1.0.0
description: Write professional emails
triggers: [email, write email, compose message]
settings:
  tone:
    type: select
    options: [formal, casual, friendly]
    default: formal
---

# Email Writer Skill

You are an expert email writer. When asked to write an email:

1. Ask for:
   - Recipient
   - Purpose
   - Key points

2. Use {{ settings.tone }} tone

3. Structure:
   - Clear subject line
   - Greeting
   - Body (3-5 paragraphs)
   - Professional closing

4. Review for:
   - Grammar
   - Clarity
   - Appropriate tone
```

### Installing Skills from Claude Code:

**Method 1: Via API**
```bash
POST /api/skills/install
{
  "content": "...(skill.md content)...",
  "name": "email-writer",
  "source": "managed"
}
```

**Method 2: Via File System**
```bash
# Copy SKILL.md file to:
.data/skills/managed/email-writer.md

# Backend auto-detects and loads
```

**Method 3: From Skill Hub**

1. Browse skills at: https://www.skillhub.club/
2. Copy skill content
3. POST to `/api/skills/install`
4. Skill appears in `/dashboard/skills`

**Note:** Skill Hub has thousands of community skills ready to use!

### Skill Hub - Community Skills

**Website:** https://www.skillhub.club/

**Features:**
- Thousands of community-created skills
- Search by category (coding, writing, analysis, etc.)
- Copy-paste ready format
- Regular updates from community
- Free to use

**Categories available:**
- Coding & Development
- Writing & Content
- Data Analysis
- Business & Marketing
- Design & Creative
- Research & Learning
- And many more...

### Using Skills in Extensions:

```javascript
// Register skill-based tool
api.registerTool({
  name: 'use_skill',
  description: 'Execute a skill',
  inputSchema: {
    type: 'object',
    properties: {
      skillId: { type: 'string' },
      context: { type: 'object' }
    }
  },
  handler: async (input) => {
    const skill = api.getSkill(input.skillId);
    const result = await skill.execute(input.context);
    return result;
  }
});
```

---

## Real Example: WAF Security Extension

Complete working example from `packages/backend/extensions/waf-security/`:

### Structure:
```
waf-security/
├── agentplayer.plugin.json
├── index.js
├── migrations/
│   └── 001_waf_scans.sql
├── src/
│   ├── routes.js      # 8 API endpoints
│   ├── tool.js        # waf_scan AI tool
│   └── engine.js      # WAF detection logic
└── README.md
```

### Frontend Page:
```
src/app/(dashboard)/dashboard/waf-security/page.tsx
```

**Features:**
- Database table for scan results
- 8 API routes under `/api/ext/waf/`
- AI tool `waf_scan` for security testing
- Full UI page with scan history
- Only visible when extension enabled

---

## Testing

### 1. Test API Routes
```bash
curl http://localhost:41522/api/ext/my-extension/route
```

### 2. Test AI Tools
Go to `/dashboard/chat` and ask AI:
```
Use my_tool to process "test data"
```

### 3. Test Frontend Page
1. Enable extension in `/dashboard/extensions`
2. Navigate to `/dashboard/my-extension`
3. Should see your page

### 4. Test Database
```bash
cd packages/backend/.data
sqlite3 database.db

sqlite> SELECT * FROM my_extension_data;
sqlite> .quit
```

---

## Extension Activation Flow

1. **User enables extension** in `/dashboard/extensions`
2. **Backend restarts** automatically
3. **Extension loads:**
   - Runs migrations
   - Registers routes at `/api/ext/<extension-id>/`
   - Registers AI tools
   - Starts cron jobs (if any)
4. **Frontend detects extension:**
   - Sidebar shows extension page link
   - Extension page becomes accessible
5. **Extension disabled:**
   - `onDisable()` called
   - Routes unregistered
   - Tools removed
   - Page hidden from sidebar

---

**See:** `packages/backend/extensions/waf-security/` for complete working example!
