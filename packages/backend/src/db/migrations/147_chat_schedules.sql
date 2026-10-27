-- Migration 147: chats that run on a schedule, and tokens per model (CHAT-BUILD-01 stage 4, CH8)
--
-- One schedule per chat: the owner's message is sent to the chat again at the
-- chosen time (every hour, every day at a time, or one weekday at a time),
-- exactly as if the owner had typed it, with the same owner gates.
--   every     hourly | daily | weekly
--   at_time   HH:MM in the computer's local time (daily, weekly; hourly uses the minute)
--   weekday   0-6 (Sunday = 0) for weekly
--   next_run  ISO time of the next run; paused = 1 keeps it but skips runs
-- Date: 2026-10-27

CREATE TABLE IF NOT EXISTS chat_schedules (
  session_id TEXT PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  every TEXT NOT NULL,
  at_time TEXT NOT NULL,
  weekday INTEGER,
  message TEXT NOT NULL,
  paused INTEGER NOT NULL DEFAULT 0,
  next_run TEXT NOT NULL,
  last_run TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_schedules_next ON chat_schedules(paused, next_run);

-- Tokens per model in a chat (CH8 status line, "by model"): each stored reply
-- keeps the model that wrote it and estimated tokens in and out.
ALTER TABLE chat_messages ADD COLUMN model TEXT;
ALTER TABLE chat_messages ADD COLUMN tokens_in INTEGER;
ALTER TABLE chat_messages ADD COLUMN tokens_out INTEGER;
