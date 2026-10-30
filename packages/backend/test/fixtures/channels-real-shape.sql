-- The chat-channel part of a real Girru database (schema only, no data), as it was before
-- CHANNELS-01: the tables the startup carry-over reads, moves or drops. Used by
-- test/channel-carry-over-real-shape.test.mjs.
CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
CREATE TABLE extension_configs (
  extension_id  TEXT    PRIMARY KEY,
  config_json   TEXT    NOT NULL DEFAULT '{}',
  enabled       INTEGER NOT NULL DEFAULT 0,           -- boolean (0/1)
  installed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE extension_migrations (
  extension_id  TEXT NOT NULL,
  filename      TEXT NOT NULL,
  ran_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (extension_id, filename)
);
CREATE INDEX idx_extension_configs_enabled ON extension_configs(enabled) WHERE enabled = 1;
CREATE TABLE discord_messages (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  guild_id     TEXT,
  content      TEXT NOT NULL,
  author       TEXT NOT NULL,
  author_id    TEXT NOT NULL,
  timestamp    TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_discord_messages_channel
  ON discord_messages(channel_id, timestamp DESC);
CREATE INDEX idx_discord_messages_created
  ON discord_messages(created_at DESC);
CREATE TABLE discord_config (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token      TEXT,
  client_id      TEXT,
  guild_id       TEXT,
  allowed_channels TEXT,
  webhook_url    TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE channel_events (
    channel TEXT NOT NULL, conversation_id TEXT NOT NULL, id TEXT NOT NULL,
    sender_id TEXT NOT NULL, sender_name TEXT, content TEXT NOT NULL,
    timestamp TEXT NOT NULL, direction TEXT NOT NULL, state TEXT NOT NULL,
    PRIMARY KEY (channel, conversation_id, id, direction)
  );
CREATE INDEX channel_events_recent ON channel_events (channel, timestamp DESC);
CREATE TABLE telegram_messages (
  id           TEXT PRIMARY KEY,
  chat_id      TEXT NOT NULL,
  chat_type    TEXT,
  content      TEXT NOT NULL,
  user_id      TEXT,
  username     TEXT,
  first_name   TEXT,
  last_name    TEXT,
  timestamp    TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_telegram_messages_chat
  ON telegram_messages(chat_id, timestamp DESC);
CREATE INDEX idx_telegram_messages_user
  ON telegram_messages(user_id);
CREATE INDEX idx_telegram_messages_created
  ON telegram_messages(created_at DESC);
CREATE TABLE telegram_config (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token      TEXT,
  webhook_url    TEXT,
  allowed_users  TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
