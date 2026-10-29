-- Migration 158: tasks that repeat (TASKPAGE-03)
--
-- One schedule per card: every hour / day / week, at a time (and a weekday for
-- weekly), run as one agent with one app (model '' = the agent's own). Each run
-- is a Continue: a new chat that goes on with the task. Paused keeps it and
-- stops the runs. last_result: started | busy | failed (the last run's outcome).
-- Date: 2026-10-29

CREATE TABLE IF NOT EXISTS card_schedules (
  card_id TEXT PRIMARY KEY REFERENCES board_cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  every TEXT NOT NULL,
  at_time TEXT NOT NULL,
  weekday INTEGER,
  agent_id TEXT,
  model TEXT NOT NULL DEFAULT '',
  paused INTEGER NOT NULL DEFAULT 0,
  next_run TEXT NOT NULL,
  last_run TEXT,
  last_result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_card_schedules_next ON card_schedules(paused, next_run);
