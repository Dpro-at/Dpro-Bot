# Slack Extension

Connect Dpro Bot to Slack workspaces.

## Setup

1. Create Slack App at api.slack.com
2. Add Bot Token Scopes
3. Install to workspace
4. Get Bot Token and Signing Secret
5. Configure in Dpro Bot settings

## Configuration

| Setting | Required | Description |
|---------|----------|-------------|
| `bot_token` | Yes | Bot User OAuth Token |
| `signing_secret` | Yes | Signing Secret |
| `app_token` | No | App Token for Socket Mode |
| `allowed_channels` | No | Whitelist channel IDs |

## Bot Token Scopes

Required:
- `chat:write` - Send messages
- `channels:history` - Read channel messages
- `channels:read` - View channel info
- `users:read` - View user info

Optional:
- `files:read` - Access files
- `reactions:write` - Add reactions

## Features

- Send and receive messages
- Thread replies
- Blocks and attachments
- Slash commands
- Event subscriptions
- Socket Mode support

## Slash Commands

| Command | Description |
|---------|-------------|
| `/agent` | Talk to agent |
| `/agent-help` | Show help |
| `/agent-status` | Check status |

## Events

Subscribe to:
- `message.channels`
- `message.im`
- `app_mention`
