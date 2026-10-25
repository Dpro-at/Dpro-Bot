# Agent Connect — Dpro Bot Integration

## Dpro Bot integration

The Fastify extension host is in `channel-host.js`. Telegram and Discord extension entry points pass their SDK API to it. The existing extension configuration JSON is the single source of configuration. Old provider-specific configuration tables remain untouched but are no longer read. Existing message tables remain preserved; new messages are stored in `channel_events`. The existing legacy `/api/channels` registry is separate and is not the administration endpoint for these two extensions.

The backend imports the published `agent-connect-dpro@0.2.0` npm package. From the backend directory, run `pnpm install --frozen-lockfile` (or `npm run setup:channels`) before starting it. Include production dependencies and `backend/extensions` in a deployed backend; copying only `backend/dist` is insufficient. The local `packages/channels` source remains available for package development, but is not the runtime import. Additional adapters require an isolated Python environment and provider-specific setup documented in the package channel guide. Run one backend instance per bot token. Polling and Gateway connections require a persistent Node.js process, not a short-lived Next.js serverless function.

1. Sign in to Dpro Bot with an active owner or admin account.
2. Open `/dashboard/channels/telegram` or `/dashboard/channels/discord`.
3. If the extension is disabled, enable it, restart the backend, then reload the page. Re-enabling after disable also requires a restart under the existing extension lifecycle.
4. Save a bot token and allowed sender IDs. For Discord, also save allowed channel IDs. An empty sender list blocks all incoming messages; an empty Discord channel list also blocks incoming messages.
5. Automatic agent replies are off by default. Enable them explicitly to route authorized messages through Dpro Bot's configured primary agent and real `/api/chat` provider/tool path. The account saving settings becomes the channel owner; only trusted external IDs should act under that account. Multi-user account bindings and selecting different agents per channel are future extensions.
6. Use the test message form and check the connection and recent messages. Confirm actual receipt in the provider before considering live setup complete.

Telegram uses grammY long polling. It checks for an existing webhook and refuses to start instead of deleting it. Remove the webhook in your bot's existing deployment before migrating. Start a conversation with the bot to obtain a usable private chat ID. In groups, Telegram's privacy settings determine which messages reach the bot. See the [grammY guide](https://grammy.dev/guide/getting-started).

Discord uses discord.js Gateway events for guild text messages. Enable Message Content Intent in the Developer Portal and invite the bot with View Channel and Send Messages permissions. Direct messages, attachments, reactions, custom slash commands, and rich embeds are outside this first release. See the [discord.js Client documentation](https://discord.js.org/docs/packages/discord.js/main/Client:Class).

The reusable React panel is `../../../../src/components/channels/ChannelPanel.tsx`; its props supply the backend URL, channel ID and token accessor. Thin Next.js page wrappers provide Dpro Bot's authentication token. This panel has no Next.js dependency and can be extracted into a separate React package later.

## Host API

All endpoints below use `/api/ext/{telegram|discord}` and require a Bearer JWT belonging to an active owner/admin. Browser calls also follow Dpro Bot's existing CORS and CSRF origin policy.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/status` | Credential presence, actual connector state and message counts; no token |
| GET | `/config` | Redacted settings and `hasToken` |
| PUT | `/config` | Save `{ "config": { ... } }`; blank token preserves the saved token |
| POST | `/connect` | Retry the configured connection |
| POST | `/send` | Telegram `{chatId,text}` or Discord `{channelId,content}`; provider-acknowledged ID |
| GET | `/messages?limit=30` | Up to 100 persisted events and processing states |
| POST | `/webhook` | Returns 410; inbound messages arrive through provider connections |

Config fields: `bot_token`, `allowed_users` (comma-separated IDs or string array), `allowed_channels` (Discord), `guild_id` (Discord, optional), and `auto_reply` (boolean). The host sets `owner_user_id` from the authenticated administrator. Tokens are stored under the application's existing SQLite configuration storage policy; this module does not introduce encryption at rest. Protect the database and backups. Config and inspect APIs redact bot tokens; do not export the database into a public repository.

## Delivery and processing semantics

- Provider acknowledgement is required before an outgoing event is stored as delivered. Failed requests do not return a success result. A provider may accept a request before the connection fails, so retries cannot guarantee exactly-once outbound delivery.
- Incoming identity is `(channel, conversationId, providerMessageId, direction)`. SQLite claims each event once before agent execution. Duplicates and bot-authored messages are ignored. Conversation history is isolated by provider, conversation and sender.
- Incoming processing is serialized per conversation/sender. Access, enablement and configuration are checked before execution and before replying. Disabling stops the provider transport and blocks queued execution and replies; work already executing in the existing chat runtime cannot be cancelled by this module.
- `pending`, `processed`, `failed` and `delivered` events distinguish processing from delivery. Pending or failed events are not retried automatically after restart, to avoid repeating agent side effects. A durable retry/outbox worker is a future extension.
- Text sends are limited to 4096 characters on Telegram and 2000 on Discord. Agent responses are split into smaller plain-text chunks. Discord outbound mentions are disabled.
- Connection failures are visible as an error/disconnected state. Explicit reconnect or saving changed settings retries setup. The module does not remove Telegram webhooks, alter Discord portal settings, or activate missing credentials.

## Validation boundaries

Run `npm test` from `packages/channels` for standalone library tests. After building the library, run `npm run test:channels` from `packages/backend` for the application adapter and agent response tests.

Automated tests use fake provider clients and an isolated in-memory SQLite/Fastify host. They cover transport normalization, startup/shutdown, credential redaction, authentication, incoming access lists, deduplication, delivery failure, disablement and JSON/SSE agent response parsing. They do not send external messages or call a paid model. Live verification requires configured bot accounts and a configured Dpro Bot model/provider.
