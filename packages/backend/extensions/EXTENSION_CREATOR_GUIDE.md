# Extension Creator Guide
## Build Powerful Extensions with AI Assistance

> **Complete guide to creating extensions using JSON Render UI, dynamic routing, unified notifications, and AI-powered development**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [UI Development with JSON Render](#ui-development-with-json-render)
3. [Dynamic Routing System](#dynamic-routing-system)
4. [Unified Notification System](#unified-notification-system)
5. [Extension SDK Complete API](#extension-sdk-complete-api)
6. [Python Integration](#python-integration)
7. [AI-Assisted Development](#ai-assisted-development)
8. [Complete Examples](#complete-examples)

---

## Quick Start

### Option 1: Interactive CLI (Recommended)

```bash
node scripts/create-extension.js
```

The CLI will guide you through:
- Extension ID and name
- Type (app/tool/channel/integration)
- Permissions needed
- Frontend requirements
- Database needs

### Option 2: Manual Setup

```bash
cd packages/backend/extensions
cp -r TEMPLATES/app-template my-extension
cd my-extension
# Edit agentplayer.plugin.json
# Edit index.js
```

---

## UI Development with JSON Render

**Girru has a built-in UI system with 61 pre-built components**. You DON'T need to write React code!

### Why JSON Render?

- ✅ **No React code needed** - Define UI as JSON
- ✅ **61 components ready** - Cards, tables, charts, forms, badges, metrics
- ✅ **AI-friendly** - Claude can generate UI specs directly
- ✅ **Type-safe** - Zod schemas validate all props
- ✅ **Responsive** - Auto-adapts to mobile/desktop

### Available Components (61 Total)

#### Layout Components
- `Card` - Container with title and description
- `Stack` - Vertical/horizontal layout (gap: sm/md/lg)
- `Grid` - Multi-column grid (2, 3, 4 columns)
- `Separator` - Horizontal divider
- `Tabs` - Tabbed interface
- `Accordion` - Collapsible sections

#### Typography
- `Heading` - Section headings (h1-h4)
- `Text` - Paragraphs (muted, sizes)
- `Link` - Clickable links
- `Code` - Inline code blocks
- `CodeBlock` - Multi-line code with syntax highlighting

#### Data Display
- `Metric` - Key metric with trend (up/down/neutral)
- `Badge` - Status pills (success/warning/error)
- `Table` - Sortable data tables
- `List` - Bullet/numbered lists
- `ProgressBar` - Progress indicators (0-100%)
- `Chart` - Line/bar/pie charts
- `Timeline` - Event timelines
- `StatCard` - Stat with icon and trend

#### Interactive
- `Button` - Clickable buttons (variants: default/primary/destructive)
- `Select` - Dropdown selection
- `Checkbox` - Checkboxes
- `RadioGroup` - Radio buttons
- `TextInput` - Text fields
- `TextArea` - Multi-line text
- `DatePicker` - Date selection
- `FilePicker` - File upload
- `Slider` - Range sliders
- `Toggle` - On/off switches

#### Feedback
- `Alert` - Info/warning/error alerts
- `Toast` - Temporary notifications
- `Spinner` - Loading indicators
- `Skeleton` - Loading placeholders
- `EmptyState` - No-data states

#### Media
- `Image` - Images with alt text
- `Avatar` - User avatars
- `Icon` - Lucide icons
- `Video` - Video embeds

#### Advanced
- `Callout` - Highlighted information boxes
- `Dialog` - Modal dialogs
- `Popover` - Popup menus
- `Tooltip` - Hover tooltips
- `JsonViewer` - Pretty JSON display
- `MarkdownViewer` - Render markdown

### Using JSON Render in Extensions

**Step 1: Define UI in your backend routes**

```javascript
// src/routes.js
export function myRoutes(fastify, api) {
  // Return JSON UI spec from your API
  fastify.get('/dashboard', async (request, reply) => {
    return {
      spec: {
        type: 'Stack',
        props: { gap: 'md' },
        children: [
          {
            type: 'Card',
            props: {
              title: 'Server Status',
              description: 'Current system metrics'
            },
            children: [
              {
                type: 'Grid',
                props: { columns: 3, gap: 'md' },
                children: [
                  {
                    type: 'Metric',
                    props: {
                      label: 'CPU Usage',
                      value: '45%',
                      trend: 'down'
                    }
                  },
                  {
                    type: 'Metric',
                    props: {
                      label: 'Memory',
                      value: '8.2 GB',
                      trend: 'up'
                    }
                  },
                  {
                    type: 'Metric',
                    props: {
                      label: 'Uptime',
                      value: '99.9%',
                      trend: 'neutral'
                    }
                  }
                ]
              }
            ]
          },
          {
            type: 'Table',
            props: {
              columns: [
                { key: 'name', label: 'Server' },
                { key: 'status', label: 'Status' },
                { key: 'load', label: 'Load' }
              ],
              data: [
                { name: 'Server 1', status: 'Online', load: '45%' },
                { name: 'Server 2', status: 'Online', load: '62%' }
              ]
            }
          }
        ]
      }
    };
  });
}
```

**Step 2: Render in your frontend**

```tsx
// frontend/components/Dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { SpecRenderer } from '@/lib/json-render/renderer';
import { config } from '@/lib/config';

export default function Dashboard() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${config.backendUrl}/api/ext/my-extension/dashboard`)
      .then(r => r.json())
      .then(data => {
        setSpec(data.spec);
        setLoading(false);
      });
  }, []);

  return <SpecRenderer spec={spec} loading={loading} />;
}
```

### Example: Complete Dashboard UI

```javascript
{
  type: 'Stack',
  props: { gap: 'lg' },
  children: [
    // Header
    {
      type: 'Heading',
      props: { text: 'Analytics Dashboard', level: 'h1' }
    },

    // Stats Grid
    {
      type: 'Grid',
      props: { columns: 4, gap: 'md' },
      children: [
        {
          type: 'StatCard',
          props: {
            label: 'Total Users',
            value: '12,543',
            change: '+12.5%',
            trend: 'up',
            icon: 'Users'
          }
        },
        // ... 3 more StatCards
      ]
    },

    // Chart
    {
      type: 'Card',
      props: { title: 'Traffic Over Time' },
      children: [{
        type: 'Chart',
        props: {
          type: 'line',
          data: [
            { date: '2024-01', visits: 1200 },
            { date: '2024-02', visits: 1450 },
            { date: '2024-03', visits: 1890 }
          ],
          xKey: 'date',
          yKey: 'visits'
        }
      }]
    },

    // Data Table
    {
      type: 'Card',
      props: { title: 'Recent Activity' },
      children: [{
        type: 'Table',
        props: {
          data: [
            { user: 'Alice', action: 'Login', time: '2 min ago' },
            { user: 'Bob', action: 'Purchase', time: '5 min ago' }
          ],
          columns: [
            { key: 'user', label: 'User' },
            { key: 'action', label: 'Action' },
            { key: 'time', label: 'Time' }
          ]
        }
      }]
    }
  ]
}
```

### Component Reference

Full component catalog with examples: `src/lib/json-render/catalog.ts`

Each component has:
- **Zod schema** - Type-safe prop validation
- **Description** - What it does
- **Example** - Sample usage

---

## Dynamic Routing System

**Extensions can declare frontend routes in their manifest** - routes auto-appear in sidebar when enabled!

### How It Works

1. Declare routes in `agentplayer.plugin.json`
2. Create frontend pages in `frontend/` folder
3. Enable extension → Routes appear in sidebar
4. Disable extension → Routes disappear

### Manifest Configuration

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "frontendRoutes": [
    {
      "path": "/dashboard/ext/my-extension",
      "name": "My Extension",
      "icon": "Puzzle",
      "position": "main"
    },
    {
      "path": "/dashboard/ext/my-extension/settings",
      "name": "Settings",
      "icon": "Settings",
      "position": "settings"
    }
  ]
}
```

**Available positions:**
- `main` - Main sidebar section (top)
- `settings` - Settings section
- `developer` - Developer tools section

**Available icons:** Any [Lucide React](https://lucide.dev/) icon name
- Examples: `Calendar`, `Users`, `BarChart`, `Mail`, `Server`, `Shield`

### Frontend Structure

```
my-extension/
├── frontend/
│   ├── page.tsx                 # Main page (/dashboard/ext/my-extension)
│   ├── settings/
│   │   └── page.tsx             # Settings page
│   └── components/
│       ├── Dashboard.tsx
│       └── SettingsForm.tsx
```

### Example: Complete Frontend Page

```tsx
// frontend/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';

export default function MyExtensionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch(
        `${config.backendUrl}/api/ext/my-extension/data`,
        { headers: authHeaders() }
      );
      const result = await res.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Extension</h2>
        <p className="text-muted-foreground">Dashboard and controls</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </CardContent>
      </Card>

      <Button onClick={loadData}>Refresh</Button>
    </div>
  );
}

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

---

## Unified Notification System

**All extensions can send notifications through the Core system** - appears in header bell for all users!

### Features

- ✅ **Centralized** - All notifications in one place
- ✅ **Source tracking** - Auto-tagged with extension ID
- ✅ **Multiple channels** - In-app, email, push, WhatsApp
- ✅ **Rich content** - Title, body, action URLs, metadata
- ✅ **Statistics** - Track sent/read/unread per extension

### Sending Notifications

```javascript
// In your extension's register() function
export default {
  async register(api) {
    // Send a notification
    await api.notifications.create({
      userId: '1',  // Target user
      title: 'Server Alert',
      body: 'Server CPU usage is at 95%',
      type: 'warning',  // info, success, warning, error, reminder
      actionUrl: '/dashboard/ext/server-monitor',
      meta: { serverId: 'server-1', cpu: 95 }
    });

    // Get notification stats
    const stats = await api.notifications.getStats();
    console.log(`Sent ${stats.total} notifications (${stats.unread} unread)`);
  }
};
```

### Notification Types

- `info` - General information (blue)
- `success` - Successful operations (green)
- `warning` - Warnings (yellow/orange)
- `error` - Errors and critical issues (red)
- `reminder` - Scheduled reminders (purple)
- `agent` - AI agent notifications
- `system` - System events

### Channels

- `in_app` - Header bell (always shown)
- `email` - Email notifications
- `push` - Browser push notifications
- `whatsapp` - WhatsApp messages (via Twilio)
- `sound` - Sound alerts

### Example: Monitoring with Notifications

```javascript
export default {
  async register(api) {
    // Cron job: Check servers every 10 minutes
    api.registerCronJob('*/10 * * * *', async () => {
      const servers = api.db.prepare('SELECT * FROM servers').all();

      for (const server of servers) {
        const status = await checkServerHealth(server);

        // Server offline → Error notification
        if (!status.online) {
          await api.notifications.create({
            userId: server.owner_id,
            title: `Server Offline: ${server.name}`,
            body: `${server.name} is not responding. Check immediately.`,
            type: 'error',
            actionUrl: `/dashboard/ext/server-monitor/servers/${server.id}`
          });
        }

        // High disk usage → Warning
        if (status.diskUsage > 90) {
          await api.notifications.create({
            userId: server.owner_id,
            title: `Disk Space Critical`,
            body: `${server.name} disk at ${status.diskUsage}%`,
            type: 'warning',
            actionUrl: `/dashboard/ext/server-monitor/servers/${server.id}`
          });
        }

        // SSL expiring → Reminder
        if (status.sslDaysLeft < 7) {
          await api.notifications.create({
            userId: server.owner_id,
            title: `SSL Certificate Expiring`,
            body: `SSL expires in ${status.sslDaysLeft} days for ${server.domain}`,
            type: 'reminder'
          });
        }
      }
    }, 'server-health-check');
  }
};
```

### Best Practices

1. **Don't spam** - Only send important notifications
2. **Be specific** - Include actionable information
3. **Add actionUrl** - Link to relevant page
4. **Use appropriate type** - Match severity (info/warning/error)
5. **Respect DND** - System auto-respects Do Not Disturb settings

---

## Extension SDK Complete API

### 1. Route Registration

```javascript
api.registerRoutes(async (fastify) => {
  // GET endpoint
  fastify.get('/status', async (request, reply) => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // POST endpoint with authentication
  fastify.post('/action', async (request, reply) => {
    const userId = getUserId(request);  // From JWT token
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { data } = request.body;
    // Process data...
    return { success: true };
  });
});
```

**Routes mounted at:** `/api/ext/{extensionId}/...`

### 2. Tool Registration

```javascript
api.registerTool({
  name: 'my_tool',
  description: 'What this tool does',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  execute: async (input) => {
    // Tool logic here
    return { result: `Found: ${input.query}` };
  }
});
```

### 3. Database Operations

```javascript
// Direct SQL access
const users = api.db.prepare('SELECT * FROM users WHERE active = ?').all(1);

// Insert
api.db.prepare('INSERT INTO logs (message) VALUES (?)').run('Event happened');

// Transaction
const transaction = api.db.transaction(() => {
  api.db.prepare('UPDATE accounts SET balance = balance - ?').run(100);
  api.db.prepare('INSERT INTO transactions (amount) VALUES (?)').run(100);
});
transaction();
```

### 4. Migrations

```javascript
// In register()
await api.runMigrations([
  join(__dirname, 'migrations', '001_init.sql'),
  join(__dirname, 'migrations', '002_add_index.sql'),
]);
```

**Migrations are idempotent** - Safe to run multiple times.

### 5. Storage API

```javascript
// Upload file
const fileId = await api.storage.upload({
  filename: 'report.pdf',
  buffer: Buffer.from(data),
  category: 'reports'
});

// Get file URL
const url = await api.storage.getUrl(fileId);

// Download file
const buffer = await api.storage.download(fileId);

// Delete file
await api.storage.delete(fileId);
```

**Storage locations:**
- `cache` - Temporary files (auto-cleanup after 24h)
- `cdn` - Persistent files (avatars, images, data)

### 6. Cron Jobs

```javascript
// Every hour
api.registerCronJob('0 * * * *', async () => {
  api.log('info', 'Hourly task running');
}, 'hourly-task');

// Every day at 3 AM
api.registerCronJob('0 3 * * *', async () => {
  // Daily cleanup
}, 'daily-cleanup');

// Every 5 minutes
api.registerCronJob('*/5 * * * *', async () => {
  // Frequent check
}, 'frequent-check');
```

**Cron syntax:** `minute hour day month weekday`

### 7. Logging

```javascript
api.log('info', 'Extension started');
api.log('warn', 'Unusual activity detected');
api.log('error', 'Failed to connect', { details: error.message });
```

**Log levels:** `debug`, `info`, `warn`, `error`

### 8. Notifications

```javascript
// Create notification
await api.notifications.create({
  userId: '1',
  title: 'Alert',
  body: 'Something happened',
  type: 'info',
  actionUrl: '/dashboard/ext/my-extension',
  meta: { customData: 'value' }
});

// Get stats
const stats = await api.notifications.getStats();
// Returns: { total: 45, unread: 12, byType: { info: 20, warning: 15, error: 10 } }
```

### 9. Extension Metadata

```javascript
const myExtensionId = api.extensionId;  // 'my-extension'
const myVersion = api.version;          // '1.0.0'
```

---

## Python Integration

**Extensions can use Python scripts for heavy computations, ML models, data processing, etc.**

### Why Python?

- ✅ Machine Learning (TensorFlow, PyTorch, scikit-learn)
- ✅ Data Processing (Pandas, NumPy)
- ✅ Computer Vision (OpenCV, PIL)
- ✅ Natural Language Processing (spaCy, NLTK)
- ✅ Scientific Computing (SciPy, Matplotlib)

### Setup

**1. Install Python dependencies**

```bash
cd packages/backend/extensions/my-extension
pip install -r requirements.txt
```

**2. Create Python script**

```python
# python/analyzer.py
import sys
import json
import pandas as pd

def analyze_data(data):
    df = pd.DataFrame(data)
    result = {
        'mean': float(df['value'].mean()),
        'std': float(df['value'].std()),
        'count': len(df)
    }
    return result

if __name__ == '__main__':
    input_data = json.loads(sys.argv[1])
    result = analyze_data(input_data)
    print(json.dumps(result))
```

**3. Call from JavaScript**

```javascript
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    const pythonPath = 'C:\\Users\\Girru GmbH\\AppData\\Local\\Programs\\Python\\Python312\\python.exe';
    const scriptPath = join(__dirname, 'python', scriptName);

    const process = spawn(pythonPath, [scriptPath, JSON.stringify(args)]);

    let output = '';
    process.stdout.on('data', (data) => { output += data.toString(); });
    process.stderr.on('data', (data) => { console.error(data.toString()); });
    process.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(new Error(`Invalid JSON output: ${output}`));
        }
      } else {
        reject(new Error(`Python script exited with code ${code}`));
      }
    });
  });
}

// Usage in routes
export function myRoutes(fastify, api) {
  fastify.post('/analyze', async (request, reply) => {
    const { data } = request.body;

    try {
      const result = await runPythonScript('analyzer.py', data);
      return { success: true, result };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });
}
```

### Example: Image Processing Extension

```python
# python/image_processor.py
import sys
import json
from PIL import Image
import base64
from io import BytesIO

def process_image(base64_image, operation):
    # Decode base64 image
    image_data = base64.b64decode(base64_image)
    img = Image.open(BytesIO(image_data))

    # Apply operation
    if operation == 'grayscale':
        img = img.convert('L')
    elif operation == 'resize':
        img = img.resize((800, 600))
    elif operation == 'rotate':
        img = img.rotate(90)

    # Encode back to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    result_base64 = base64.b64encode(buffer.getvalue()).decode()

    return result_base64

if __name__ == '__main__':
    input_data = json.loads(sys.argv[1])
    result = process_image(input_data['image'], input_data['operation'])
    print(json.dumps({'image': result}))
```

---

## AI-Assisted Development

**Use Claude to generate extensions automatically!**

### Step 1: Define Requirements

Tell Claude what you want:

```
Create a "GitHub Integration" extension that:
1. Connects to GitHub API with OAuth
2. Shows user's repositories in a dashboard
3. Displays recent commits for each repo
4. Sends notifications for new PRs
5. Allows creating issues from the UI
```

### Step 2: Claude Generates Structure

Claude will create:
- ✅ `agentplayer.plugin.json` with proper metadata
- ✅ `index.js` with register/onDisable hooks
- ✅ Database migrations for GitHub tokens
- ✅ API routes for OAuth and data fetching
- ✅ Frontend pages with JSON Render UI
- ✅ Cron job for checking new PRs
- ✅ Notification integration

### Step 3: Refine and Test

Review Claude's code, test it, and iterate:

```
- Add a search feature to filter repositories
- Show PR details when clicking a notification
- Add GitHub webhooks support
```

### Example: Full AI-Generated Extension

**Prompt:**
```
Create a "Weather Alerts" extension that:
- Fetches weather data from OpenWeatherMap API
- Stores user's favorite cities in database
- Shows current weather for each city in a dashboard
- Sends notifications for severe weather warnings
- Displays 7-day forecast charts
- Updates every 30 minutes via cron job
```

**Claude generates:**

```javascript
// agentplayer.plugin.json
{
  "id": "weather-alerts",
  "name": "Weather Alerts",
  "description": "Get weather forecasts and severe weather notifications",
  "version": "1.0.0",
  "type": "app",
  "author": "AI Generated",
  "main": "index.js",
  "permissions": ["network", "database", "tools", "scheduler"],
  "frontendRoutes": [{
    "path": "/dashboard/ext/weather-alerts",
    "name": "Weather",
    "icon": "Cloud",
    "position": "main"
  }]
}
```

```javascript
// index.js
import { weatherRoutes } from './src/routes.js';

export default {
  id: 'weather-alerts',
  name: 'Weather Alerts',
  version: '1.0.0',

  async register(api) {
    // Run migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_weather_tables.sql'),
    ]);

    // Register routes
    api.registerRoutes(weatherRoutes);

    // Cron: Update weather every 30 min
    api.registerCronJob('*/30 * * * *', async () => {
      const cities = api.db.prepare('SELECT * FROM user_cities').all();

      for (const city of cities) {
        const weather = await fetchWeather(city.name);

        // Severe weather alert
        if (weather.alerts && weather.alerts.length > 0) {
          await api.notifications.create({
            userId: city.user_id,
            title: `⚠️ Weather Alert: ${city.name}`,
            body: weather.alerts[0].description,
            type: 'warning',
            actionUrl: '/dashboard/ext/weather-alerts'
          });
        }
      }
    }, 'weather-update');

    api.log('info', 'Weather Alerts extension loaded');
  },

  async onDisable(api) {
    api.unregisterCronJob('weather-update');
  }
};
```

```javascript
// src/routes.js - Returns JSON UI
export function weatherRoutes(fastify, api) {
  fastify.get('/dashboard', async (request, reply) => {
    const userId = getUserId(request);
    const cities = api.db.prepare(
      'SELECT * FROM user_cities WHERE user_id = ?'
    ).all(userId);

    // Build UI spec
    return {
      spec: {
        type: 'Stack',
        props: { gap: 'lg' },
        children: [
          {
            type: 'Heading',
            props: { text: 'Weather Dashboard', level: 'h1' }
          },
          {
            type: 'Grid',
            props: { columns: 3, gap: 'md' },
            children: cities.map(city => ({
              type: 'Card',
              props: {
                title: city.name,
                description: `${city.temp}°C`
              },
              children: [
                {
                  type: 'Metric',
                  props: {
                    label: 'Feels Like',
                    value: `${city.feels_like}°C`
                  }
                },
                {
                  type: 'Badge',
                  props: {
                    text: city.condition,
                    variant: getWeatherBadge(city.condition)
                  }
                }
              ]
            }))
          }
        ]
      }
    };
  });
}
```

---

## Complete Examples

### Example 1: Server Monitor (Full-Featured)

**Location:** the Girru Store repository, `apps/server-monitor/package/` (moved out of the program in APPS-06; its old pages are not kept). Today it is a preview that returns sample data; the list below is the plan, not what it does.

**Features:**
- ✅ 16 subtabs (Overview, Resources, Services, Logs, SSL, etc.)
- ✅ WHM/cPanel API integration
- ✅ Real-time server metrics
- ✅ Database migrations (4 tables)
- ✅ Cron job for health checks (every 10 min)
- ✅ Automatic notifications for issues
- ✅ JSON Render UI throughout

**Key files:**
- `agentplayer.plugin.json` - Declares 1 frontend route
- `index.js` - Registers routes, migrations, cron
- `migrations/` - 3 SQL files for servers, checks, ssl_certs
- `frontend/page.tsx` - Main server list page
- `frontend/components/servers/` - 16 subtab components
- `src/routes.js` - 20+ API endpoints

### Example 2: WAF Security (Tool Extension)

**Location:** the Girru Store repository, `apps/waf-security/package/` (moved out of the program in APPS-06)

**Features:**
- ✅ WAF detection engine (20+ vendors)
- ✅ Payload generation (SQL/XSS/LFI)
- ✅ Self-audit capabilities
- ✅ AI tool registration
- ✅ Scan history storage

**Key files:**
- `agentplayer.plugin.json` - Declares tool type
- `index.js` - Registers `waf_scan` tool
- `migrations/001_waf_scans.sql` - Scan results table
- `src/tool.js` - WAF scanning logic
- `frontend/page.tsx` - Scan interface

### Example 3: Email Client (App Extension)

**Location:** `packages/backend/extensions/email-client/`

**Features:**
- ✅ Multi-account (Gmail, Outlook, IMAP)
- ✅ Full-text search (FTS5)
- ✅ Auto-sync every 5 minutes
- ✅ 6 database tables
- ✅ OAuth integration

**Key files:**
- `agentplayer.plugin.json` - Email app manifest
- `migrations/001_email_tables.sql` - 6 tables
- `src/routes.js` - 15+ email endpoints
- `frontend/page.tsx` - Inbox UI
- `frontend/components/` - Email viewer, composer

---

## Checklist for New Extensions

Before publishing:

**1. Manifest (`agentplayer.plugin.json`)**
- [ ] Unique ID (kebab-case)
- [ ] Clear name and description
- [ ] Correct type (app/tool/channel/integration)
- [ ] All required permissions declared
- [ ] Frontend routes defined (if app)

**2. Code Quality**
- [ ] Pure JavaScript (NO TypeScript syntax)
- [ ] All files use ES modules (`import`/`export`)
- [ ] Error handling in all async functions
- [ ] Database queries use prepared statements
- [ ] No hardcoded user IDs (use `getUserId(request)`)

**3. Database**
- [ ] Migrations are idempotent
- [ ] All tables prefixed with extension ID
- [ ] Indexes on foreign keys
- [ ] No sensitive data in plain text

**4. Frontend (if applicable)**
- [ ] Uses JSON Render where possible
- [ ] Responsive design (mobile + desktop)
- [ ] Loading states for all async operations
- [ ] Error messages for failures
- [ ] JWT auth for all API calls

**5. Notifications (if applicable)**
- [ ] Only important events trigger notifications
- [ ] Clear, actionable messages
- [ ] Appropriate type (info/warning/error)
- [ ] Links to relevant pages (`actionUrl`)

**6. Testing**
- [ ] Test enable/disable flow
- [ ] Test with multiple users
- [ ] Test cron jobs (if any)
- [ ] Test error scenarios
- [ ] Test on fresh database

**7. Documentation**
- [ ] README.md with installation steps
- [ ] API endpoint documentation
- [ ] Configuration guide
- [ ] Screenshots (if app)

---

## Getting Help

- **Extension SDK Docs:** `packages/backend/extensions/EXTENSION_DEVELOPMENT.md`
- **Migration Guide:** `packages/backend/extensions/MIGRATION_GUIDE.md`
- **Component Catalog:** `src/lib/json-render/catalog.ts`
- **Example Extensions:** `packages/backend/extensions/*/`
- **Create Script:** `node scripts/create-extension.js`

**Ask Claude for help:**
```
I want to create an extension that [describes what you want].
Can you generate the complete code using JSON Render for the UI?
```

---

**Happy building! 🚀**
