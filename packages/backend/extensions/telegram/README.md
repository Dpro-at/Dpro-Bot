# Telegram Channel

Telegram text messaging uses the standalone channels package and Dpro Bot's shared extension host.

Open `/dashboard/channels/telegram`, enable the extension, and restart the backend if its routes are not loaded. Save the bot token and allowed sender IDs. Empty access lists block incoming messages. Automatic replies are optional and use the configured primary agent under the administrator account that saves settings.

This release uses long polling. Remove an existing webhook before migrating; the module will not remove it automatically. Attachments, rich keyboards, and custom slash command handlers are not part of this release.

See [channels setup and API documentation](../shared/README.md) for build, authentication, lifecycle, extraction and validation details. Legacy message/config tables are retained, but the new host uses `extension_configs` and `channel_events`.
