# Discord Channel

Discord guild text messaging uses the standalone channels package and Girru's shared extension host.

Open `/dashboard/channels/discord`, enable the extension, and restart the backend if its routes are not loaded. Enable Message Content Intent in Discord Developer Portal and invite the bot with View Channel and Send Messages permissions. Save the token, allowed sender IDs and allowed channel IDs. Empty access lists block incoming messages. Automatic replies are optional and use the configured primary agent under the administrator account that saves settings.

Direct messages, attachments, rich embeds, reactions and custom slash commands are not part of this release. Outbound automatic mentions are disabled.

See [channels setup and API documentation](../shared/README.md) for build, authentication, lifecycle, extraction and validation details. Legacy message/config tables are retained, but the new host uses `extension_configs` and `channel_events`.
