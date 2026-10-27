# WhatsApp Extension

Connect Girru to WhatsApp Business API.

## Setup

1. Create a Meta Business Account
2. Set up WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Configure webhook

## Configuration

| Setting | Required | Description |
|---------|----------|-------------|
| `phone_number_id` | Yes | WhatsApp Phone Number ID |
| `access_token` | Yes | Meta Access Token |
| `webhook_verify_token` | Yes | Webhook verification |
| `business_account_id` | No | Business Account ID |

## Features

- Send and receive messages
- Media messages (images, documents)
- Template messages
- Interactive buttons
- Quick replies

## Message Types

| Type | Description |
|------|-------------|
| Text | Plain text messages |
| Image | Photo messages |
| Document | File attachments |
| Template | Pre-approved templates |
| Interactive | Buttons and lists |

## Webhook

Set webhook URL to:
```
https://your-domain.com/api/webhooks/whatsapp
```

Verify token should match `webhook_verify_token` setting.
