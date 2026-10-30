# Migration Guide: Old SDK → New SDK

This guide helps you migrate extensions from the old SDK (TypeScript-based) to the new SDK (JavaScript-based).

## Overview

**Old SDK (Deprecated):**
- TypeScript syntax in `.ts` files
- `agent-player.plugin.json` manifest
- `type` property + `channels` array
- `AgentPlayerPluginApi` interface
- Complex registration patterns

**New SDK (Current):**
- Pure JavaScript in `.js` files
- `agentplayer.plugin.json` manifest (backward compatible with old name)
- `type` property + `permissions` array
- Simple registration via `api` object
- Cleaner, more flexible architecture

## Migration Checklist

- [ ] Rename `.ts` files to `.js`
- [ ] Remove all TypeScript syntax
- [ ] Update manifest filename (optional but recommended)
- [ ] Convert `channels` to `type` + `permissions`
- [ ] Update entry point structure
- [ ] Convert API calls to new SDK methods
- [ ] Test extension loads without errors

## Step-by-Step Migration

### Step 1: Rename Files

```bash
# Rename TypeScript files to JavaScript
mv index.ts index.js
mv src/channel.ts src/channel.js
mv src/runtime.ts src/runtime.js
```

### Step 2: Remove TypeScript Syntax

**Old (TypeScript):**
```typescript
import type { FastifyInstance } from 'fastify';
import type { AgentPlayerPluginApi } from '../../src/plugins/types.js';

interface ChannelConfig {
  apiKey: string;
  webhookUrl: string;
}

async function sendMessage(chatId: string, content: string): Promise<void> {
  // ...
}
```

**New (JavaScript):**
```javascript
// No type imports
// No interfaces
// No type annotations

async function sendMessage(chatId, content) {
  // ...
}
```

**Common TypeScript patterns to remove:**

| TypeScript | JavaScript |
|------------|------------|
| `import type { X } from 'y'` | Delete line |
| `function foo(x: string)` | `function foo(x)` |
| `const x: Type = value` | `const x = value` |
| `interface Config { }` | Delete or convert to JSDoc comment |
| `as Type` | Remove cast |
| `Promise<void>` | `Promise` (or remove) |

### Step 3: Update Manifest

**Old manifest (`agent-player.plugin.json`):**
```json
{
  "id": "discord",
  "name": "Discord Channel",
  "description": "Discord messaging integration",
  "version": "1.0.0",
  "author": "Dpro",
  "channels": ["discord"],
  "configSchema": {
    "type": "object",
    "required": ["botToken"],
    "properties": {
      "botToken": {
        "type": "string",
        "description": "Discord bot token"
      }
    }
  }
}
```

**New manifest (`agentplayer.plugin.json`):**
```json
{
  "id": "discord",
  "name": "Discord Channel",
  "description": "Discord messaging integration",
  "version": "1.0.0",
  "type": "channel",
  "author": "Dpro",
  "main": "index.js",
  "permissions": ["network", "database"]
}
```

**Key changes:**
- Rename file to `agentplayer.plugin.json` (optional - old name still works)
- Add `"type": "channel"` (was implicit from `channels` array)
- Add `"main": "index.js"` (entry point)
- Add `"permissions": ["network", "database"]` (replaces `channels`)
- Remove `configSchema` (configuration handled differently in new SDK)

### Step 4: Update Entry Point

**Old entry point (`index.ts`):**
```typescript
import type { AgentPlayerPluginApi } from '../../src/plugins/types.js';
import { DiscordChannel } from './src/channel.js';

const plugin = {
  id: 'discord',
  name: 'Discord Channel',
  version: '1.0.0',

  register(api: AgentPlayerPluginApi) {
    api.registerChannel({
      plugin: new DiscordChannel(),
    });
  },

  async onEnable() {
    console.log('Discord enabled');
  },

  async onDisable() {
    console.log('Discord disabled');
  },
};

export default plugin;
```

**New entry point (`index.js`):**
```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerDiscordRoutes } from './src/routes.js';
import { discordMessageTool } from './src/tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'discord',
  name: 'Discord Channel',
  version: '1.0.0',

  async register(api) {
    // 1. Run migrations (if needed)
    await api.runMigrations([
      join(__dirname, 'migrations', '001_discord_messages.sql'),
    ]);

    // 2. Register API routes
    api.registerRoutes(registerDiscordRoutes);

    // 3. Register AI tool (optional)
    api.registerTool(discordMessageTool);

    // 4. Setup webhook listener (if needed)
    // TODO: Register webhook route for incoming messages

    api.log('info', 'Discord channel ready');
  },

  async onDisable(api) {
    api.unregisterTool('discord_send_message');
    api.log('info', 'Discord channel disabled');
  },
};
```

**Key changes:**
- Remove type imports
- Use `api` parameter (no type annotation)
- Call `api.registerRoutes()` instead of `api.registerChannel()`
- Add migrations, tools, cron jobs as needed
- Use `api.log()` for logging

### Step 5: Convert Channel to Routes

**Old channel pattern (`src/channel.ts`):**
```typescript
export class DiscordChannel {
  private client: any;

  async initialize(config: any) {
    this.client = new DiscordClient(config.botToken);
    await this.client.connect();
  }

  async sendMessage(chatId: string, content: string) {
    await this.client.send(chatId, content);
  }

  async receiveMessage(message: any) {
    // Handle incoming message
    return {
      chatId: message.channelId,
      content: message.content,
      sender: message.author.username,
    };
  }
}
```

**New routes pattern (`src/routes.js`):**
```javascript
import { Client } from 'discord.js';

let discordClient = null;

export async function registerDiscordRoutes(fastify) {
  /**
   * POST /api/ext/discord/send - Send Discord message
   */
  fastify.post('/send', {
    schema: {
      tags: ['Discord'],
      description: 'Send message to Discord channel',
      body: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['channelId', 'content'],
      },
    },
  }, async (request, reply) => {
    const { channelId, content } = request.body;

    if (!discordClient) {
      return reply.status(503).send({
        error: 'Discord client not initialized',
      });
    }

    try {
      const channel = await discordClient.channels.fetch(channelId);
      await channel.send(content);

      return { success: true, messageId: result.id };
    } catch (error) {
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * POST /api/ext/discord/webhook - Receive Discord webhook
   */
  fastify.post('/webhook', async (request, reply) => {
    const message = request.body;

    // Process incoming message
    const db = fastify.db || request.server.db;
    db.prepare(`
      INSERT INTO discord_messages (id, channel_id, content, author, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      message.id,
      message.channel_id,
      message.content,
      message.author.username,
      new Date().toISOString()
    );

    return { received: true };
  });

  /**
   * GET /api/ext/discord/status - Get bot status
   */
  fastify.get('/status', async (request, reply) => {
    return {
      connected: discordClient !== null,
      guilds: discordClient ? discordClient.guilds.cache.size : 0,
    };
  });

  console.log('[Discord Routes] ✅ Registered');
}

/**
 * Initialize Discord client (called from extension register)
 */
export async function initializeDiscord(botToken) {
  discordClient = new Client({ intents: ['Guilds', 'GuildMessages'] });
  await discordClient.login(botToken);
  console.log('[Discord] ✅ Client connected');
}
```

### Step 6: Convert Channel to Tool

If you want AI agents to send Discord messages, create a tool:

**File:** `src/tool.js`
```javascript
export const discordMessageTool = {
  name: 'discord_send_message',
  description: 'Send a message to a Discord channel',
  input_schema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'Discord channel ID',
      },
      content: {
        type: 'string',
        description: 'Message content to send',
      },
    },
    required: ['channelId', 'content'],
  },

  async execute(params) {
    const { channelId, content } = params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:41522';

    try {
      const response = await fetch(`${backendUrl}/api/ext/discord/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: [{
          type: 'text',
          text: `✅ Message sent to Discord channel ${channelId}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error sending Discord message: ${error.message}`,
        }],
      };
    }
  },
};
```

### Step 7: Add Database Migration

If your extension stores data, create a migration:

**File:** `migrations/001_discord_messages.sql`
```sql
-- Discord messages table
CREATE TABLE IF NOT EXISTS discord_messages (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  content      TEXT NOT NULL,
  author       TEXT NOT NULL,
  timestamp    TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discord_messages_channel
  ON discord_messages(channel_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_discord_messages_created
  ON discord_messages(created_at DESC);
```

## Complete Example: Discord Migration

### Before (Old SDK)

```
discord/
├── agent-player.plugin.json   # Old manifest
├── index.ts                   # TypeScript entry
├── package.json
├── README.md
└── src/
    ├── channel.ts             # TypeScript channel class
    └── runtime.ts             # TypeScript runtime
```

### After (New SDK)

```
discord/
├── agentplayer.plugin.json    # New manifest
├── index.js                   # JavaScript entry
├── migrations/
│   └── 001_discord_messages.sql
├── src/
│   ├── routes.js              # API routes
│   └── tool.js                # AI tool
├── package.json
└── README.md
```

## Testing Migration

1. **Verify syntax:**
   ```bash
   node --check index.js
   node --check src/routes.js
   node --check src/tool.js
   ```

2. **Enable extension:**
   - Visit `http://localhost:41521/dashboard/extensions`
   - Click "Enable" on your extension
   - Check for errors in console

3. **Test routes:**
   ```bash
   curl http://localhost:41522/api/ext/discord/status
   ```

4. **Test tool:**
   - Ask AI agent: "Use discord_send_message to send 'Hello' to channel 123"

## Common Migration Issues

### Issue 1: Import Errors

**Error:** `SyntaxError: Unexpected identifier 'as'`

**Cause:** TypeScript syntax still present

**Fix:** Search and remove ALL TypeScript syntax:
```bash
grep -r "import type" .
grep -r ": string" .
grep -r "interface " .
```

### Issue 2: Extension Not Loading

**Error:** Extension doesn't appear in dashboard

**Cause:** Manifest file naming or format issue

**Fix:**
- Ensure manifest is `agentplayer.plugin.json` OR `agent-player.plugin.json`
- Verify JSON is valid: `cat agentplayer.plugin.json | jq`
- Check `main` field points to correct entry file

### Issue 3: Routes Not Working

**Error:** `404 Not Found` on extension routes

**Cause:** Backend not restarted after enabling

**Fix:**
- Restart backend: `cd packages/backend && pnpm dev`
- Extensions only load routes on startup

### Issue 4: Database Migration Fails

**Error:** `SQLITE_ERROR: table already exists`

**Cause:** Migration not idempotent

**Fix:** Always use `CREATE TABLE IF NOT EXISTS` in migrations

## Migration Priority

Recommended order for migrating old extensions:

1. **Discord** (most complete, good reference)
2. **Slack** (similar to Discord)
3. **Telegram** (simpler bot API)
4. **WhatsApp** (most complex, requires Twilio)

## Getting Help

- **Example:** See `extensions/calendar/` for a complete working extension
- **Documentation:** `EXTENSION_DEVELOPMENT.md` for new SDK API
- **Test:** Enable extension and check backend console for errors
- **Inspect:** Use Database icon in Extensions page to see loaded data

---

**Next Steps:**
1. Pick an extension to migrate (start with Discord)
2. Follow this guide step by step
3. Test thoroughly before moving to next extension
